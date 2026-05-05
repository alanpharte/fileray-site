import type { DriveFileSummary, Msg, Settings } from "./types";
import { DEFAULT_API_BASE } from "./types";

async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get("settings");
  const s = stored.settings as Partial<Settings> | undefined;
  return { apiBase: (s?.apiBase || DEFAULT_API_BASE).replace(/\/$/, "") };
}

async function setSettings(next: Settings): Promise<void> {
  await chrome.storage.local.set({ settings: next });
}

function getToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      chrome.identity.getAuthToken({ interactive }, (token: unknown) => {
        if (chrome.runtime.lastError || !token) {
          reject(new Error(chrome.runtime.lastError?.message || "No token returned"));
          return;
        }
        if (typeof token === "string") {
          resolve(token);
        } else if (token && typeof (token as { token?: string }).token === "string") {
          resolve((token as { token: string }).token);
        } else {
          reject(new Error("Unrecognized token shape from chrome.identity"));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

function removeCachedToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}

async function signOut(): Promise<void> {
  try {
    const token = await getToken(false);
    await removeCachedToken(token);
    // Best-effort: revoke the grant so the next sign-in re-prompts.
    try {
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${encodeURIComponent(token)}`);
    } catch {
      // ignore network errors during revocation
    }
  } catch {
    // not signed in; ignore
  }
  await chrome.storage.local.remove("profile");
}

async function authedFetch(input: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getToken(false);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  const resp = await fetch(input, { ...init, headers });
  if (resp.status === 401 && retry) {
    await removeCachedToken(token);
    return authedFetch(input, init, false);
  }
  return resp;
}

async function getProfile(): Promise<{ email: string; name?: string; picture?: string }> {
  const cached = await chrome.storage.local.get("profile");
  if (cached.profile) return cached.profile;
  const resp = await authedFetch("https://www.googleapis.com/oauth2/v3/userinfo");
  if (!resp.ok) throw new Error(`Profile fetch failed (${resp.status})`);
  const data = await resp.json();
  const profile = { email: data.email, name: data.name, picture: data.picture };
  await chrome.storage.local.set({ profile });
  return profile;
}

async function listRecent(afterIso: string): Promise<DriveFileSummary[]> {
  // Files owned by the user, not trashed, not folders, created after the given timestamp.
  const q = [
    `createdTime > '${afterIso}'`,
    "'me' in owners",
    "trashed = false",
    "mimeType != 'application/vnd.google-apps.folder'",
  ].join(" and ");
  const params = new URLSearchParams({
    q,
    orderBy: "createdTime desc",
    pageSize: "25",
    fields: "files(id,name,mimeType,createdTime,size,webViewLink)",
    spaces: "drive",
  });
  const resp = await authedFetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
  if (!resp.ok) throw new Error(`Drive list failed (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  return data.files || [];
}

async function listUntagged(days: number): Promise<DriveFileSummary[]> {
  const safeDays = Math.max(1, Math.min(60, Math.floor(days || 7)));
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
  // Drive's `properties has` requires both key and value, so check for the
  // taggedBy marker we set in patchTags() rather than the `tags` key alone.
  const q = [
    `createdTime > '${cutoff}'`,
    "'me' in owners",
    "trashed = false",
    "mimeType != 'application/vnd.google-apps.folder'",
    "not properties has { key='taggedBy' and value='fileray-tagger' }",
  ].join(" and ");
  const params = new URLSearchParams({
    q,
    orderBy: "createdTime desc",
    pageSize: "50",
    fields: "files(id,name,mimeType,createdTime,size,webViewLink)",
    spaces: "drive",
  });
  const resp = await authedFetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
  if (!resp.ok) throw new Error(`Drive list failed (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  return data.files || [];
}

async function downloadFileBase64(fileId: string): Promise<{ base64: string; mimeType: string }> {
  const resp = await authedFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
  );
  if (!resp.ok) throw new Error(`Drive download failed (${resp.status})`);
  const blob = await resp.blob();
  const buf = new Uint8Array(await blob.arrayBuffer());
  // Convert to base64 without spreading huge arrays into String.fromCharCode
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode.apply(null, buf.subarray(i, i + chunk) as unknown as number[]);
  }
  return { base64: btoa(binary), mimeType: blob.type || "application/octet-stream" };
}

async function autoTag(args: { fileName: string; mimeType: string; base64Data?: string }): Promise<{ tags: string[] }> {
  const { apiBase } = await getSettings();
  const resp = await fetch(`${apiBase}/api/files/auto-tag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!resp.ok) throw new Error(`Auto-tag failed (${resp.status}): ${await resp.text()}`);
  return resp.json();
}

async function patchTags(fileId: string, tags: string[]): Promise<void> {
  // First, fetch current description so we can append tag list without nuking it.
  const getResp = await authedFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=description,properties`,
  );
  if (!getResp.ok) throw new Error(`Drive get failed (${getResp.status})`);
  const current = await getResp.json();
  const existingDesc: string = current.description || "";
  const cleanDesc = existingDesc.replace(/\n?\[fileray-tags\][^\n]*/g, "").trim();
  const tagLine = tags.length ? `[fileray-tags] ${tags.join(", ")}` : "";
  const description = [cleanDesc, tagLine].filter(Boolean).join("\n\n");

  const body = {
    description,
    properties: {
      ...(current.properties || {}),
      tags: tags.join(","),
      taggedBy: "fileray-tagger",
      taggedAt: new Date().toISOString(),
    },
  };

  const patch = await authedFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!patch.ok) throw new Error(`Drive patch failed (${patch.status}): ${await patch.text()}`);
}

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case "GET_TOKEN": {
          const token = await getToken(msg.interactive ?? false);
          sendResponse({ ok: true, token });
          return;
        }
        case "SIGN_OUT": {
          await signOut();
          sendResponse({ ok: true });
          return;
        }
        case "GET_PROFILE": {
          const profile = await getProfile();
          sendResponse({ ok: true, profile });
          return;
        }
        case "LIST_RECENT": {
          const files = await listRecent(msg.afterIso);
          sendResponse({ ok: true, files });
          return;
        }
        case "LIST_UNTAGGED": {
          const files = await listUntagged(msg.days);
          sendResponse({ ok: true, files });
          return;
        }
        case "DOWNLOAD_FILE": {
          const data = await downloadFileBase64(msg.fileId);
          sendResponse({ ok: true, ...data });
          return;
        }
        case "AUTO_TAG": {
          const data = await autoTag({
            fileName: msg.fileName,
            mimeType: msg.mimeType,
            base64Data: msg.base64Data,
          });
          sendResponse({ ok: true, tags: data.tags });
          return;
        }
        case "PATCH_TAGS": {
          await patchTags(msg.fileId, msg.tags);
          sendResponse({ ok: true });
          return;
        }
        case "GET_SETTINGS": {
          sendResponse({ ok: true, settings: await getSettings() });
          return;
        }
        case "SET_SETTINGS": {
          await setSettings({ apiBase: msg.apiBase });
          sendResponse({ ok: true });
          return;
        }
        default: {
          sendResponse({ ok: false, error: "Unknown message" });
        }
      }
    } catch (err: any) {
      sendResponse({ ok: false, error: err?.message || String(err) });
    }
  })();
  return true; // keep the message channel open for async sendResponse
});

chrome.runtime.onInstalled.addListener(async () => {
  const cur = await chrome.storage.local.get("settings");
  if (!cur.settings) {
    await setSettings({ apiBase: DEFAULT_API_BASE });
  }
});
