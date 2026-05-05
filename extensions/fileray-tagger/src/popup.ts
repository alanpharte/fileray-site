import type { Msg } from "./types";

function send<T = any>(msg: Msg): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!resp || resp.ok === false) {
        reject(new Error(resp?.error || "Background error"));
        return;
      }
      resolve(resp);
    });
  });
}

const root = document.getElementById("root")!;

interface State {
  loading: boolean;
  signedIn: boolean;
  email?: string;
  name?: string;
  picture?: string;
  apiBase?: string;
  onDrive: boolean;
  isError: boolean;
  status?: string;
}

const state: State = { loading: true, signedIn: false, onDrive: false, isError: false };

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function render() {
  if (state.loading) {
    root.innerHTML = `<div class="status">Loading…</div>`;
    return;
  }

  const initial = (state.email || "?").charAt(0).toUpperCase();
  const avatar = state.picture
    ? `<div class="avatar"><img src="${escapeHtml(state.picture)}" alt="" referrerpolicy="no-referrer"/></div>`
    : `<div class="avatar">${initial}</div>`;

  root.innerHTML = `
    <h1><span class="dot"></span> Fileray Tagger</h1>
    <div class="subtitle">AI auto-tag your Drive uploads.</div>
    ${state.signedIn ? `
      <div class="card">
        <div class="row">
          ${avatar}
          <div style="flex:1;min-width:0;">
            <div class="email">${escapeHtml(state.email || "")}</div>
            <div class="name">${escapeHtml(state.name || "Signed in with Google")}</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div style="font-size:12px;font-weight:600;margin-bottom:4px;">
          ${state.onDrive ? "✓ Active on drive.google.com" : "Open drive.google.com to tag uploads"}
        </div>
        <div class="name">${state.onDrive ? "We're watching for new uploads." : "We only run on Google Drive."}</div>
      </div>
      <div class="actions">
        <button class="btn" id="tag-recent">Tag recent uploads</button>
        ${state.onDrive ? "" : `<button class="btn ghost" id="open-drive">Open Drive</button>`}
        <button class="btn ghost" id="signout">Sign out</button>
      </div>
    ` : `
      <div class="card">
        <div style="font-size:12px;color:#b8a8d6;margin-bottom:8px;">
          Sign in with Google to let Fileray tag your Drive uploads in-context.
        </div>
        <button class="btn" id="signin">Sign in with Google</button>
      </div>
    `}
    ${state.status ? `<div class="status ${state.isError ? "error" : "success"}">${escapeHtml(state.status)}</div>` : ""}
    <a class="link" id="settings">Settings (API base${state.apiBase ? `: ${escapeHtml(state.apiBase)}` : ""})</a>
  `;

  document.getElementById("signin")?.addEventListener("click", signIn);
  document.getElementById("signout")?.addEventListener("click", signOut);
  document.getElementById("open-drive")?.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://drive.google.com/" });
  });
  document.getElementById("tag-recent")?.addEventListener("click", tagRecent);
  document.getElementById("settings")?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
}

async function refresh() {
  state.loading = true;
  render();
  try {
    const settings = await send<{ settings: { apiBase: string } }>({ type: "GET_SETTINGS" });
    state.apiBase = settings.settings.apiBase;
    try {
      const profile = await send<{ profile: { email: string; name?: string; picture?: string } }>({ type: "GET_PROFILE" });
      state.signedIn = true;
      state.email = profile.profile.email;
      state.name = profile.profile.name;
      state.picture = profile.profile.picture;
    } catch {
      state.signedIn = false;
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    state.onDrive = !!tabs[0]?.url?.startsWith("https://drive.google.com/");
  } catch (err: unknown) {
    state.isError = true;
    state.status = err instanceof Error ? err.message : "Could not load extension state.";
  }
  state.loading = false;
  render();
}

async function signIn() {
  state.status = undefined;
  state.isError = false;
  try {
    await send({ type: "GET_TOKEN", interactive: true });
    state.isError = false;
    state.status = "Signed in.";
    await refresh();
  } catch (err: unknown) {
    state.isError = true;
    state.status = err instanceof Error ? err.message : "Sign-in failed.";
    render();
  }
}

async function tagRecent() {
  state.status = undefined;
  state.isError = false;
  try {
    await chrome.storage.local.set({ openBacklogAt: Date.now() });
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const cur = tabs[0];
    if (cur?.url?.startsWith("https://drive.google.com/")) {
      window.close();
    } else {
      await chrome.tabs.create({ url: "https://drive.google.com/" });
      window.close();
    }
  } catch (err: unknown) {
    state.isError = true;
    state.status = err instanceof Error ? err.message : "Could not open backlog.";
    render();
  }
}

async function signOut() {
  try {
    await send({ type: "SIGN_OUT" });
    state.isError = false;
    state.status = "Signed out.";
    await refresh();
  } catch (err: unknown) {
    state.isError = true;
    state.status = err instanceof Error ? err.message : "Sign-out failed.";
    render();
  }
}

void refresh();
