import type { Msg } from "./types";
import { DEFAULT_API_BASE } from "./types";

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

const state: { apiBase: string; status?: string; error?: boolean } = { apiBase: DEFAULT_API_BASE };

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function render() {
  root.innerHTML = `
    <div class="wrap">
      <h1><span class="dot"></span> Fileray Tagger</h1>
      <div class="subtitle">Configure where the extension sends auto-tag requests.</div>

      <div class="card">
        <label for="apiBase">Fileray API base URL</label>
        <div class="help">The extension calls <code>{base}/api/files/auto-tag</code>. Defaults to the deployed Fileray instance.</div>
        <input id="apiBase" type="text" value="${escapeHtml(state.apiBase)}" placeholder="${DEFAULT_API_BASE}" />
        <div class="actions">
          <button class="btn" id="save">Save</button>
          <button class="btn ghost" id="reset">Reset to default</button>
        </div>
        ${state.status ? `<div class="status ${state.error ? "error" : "success"}">${escapeHtml(state.status)}</div>` : ""}
      </div>

      <div class="card">
        <label>OAuth status</label>
        <div class="help">
          The extension uses Chrome's identity API. The OAuth client ID is configured in
          <code>manifest.json</code>. Sign in/out from the extension popup.
        </div>
      </div>
    </div>
  `;

  document.getElementById("save")?.addEventListener("click", save);
  document.getElementById("reset")?.addEventListener("click", () => {
    state.apiBase = DEFAULT_API_BASE;
    render();
  });
  document.getElementById("apiBase")?.addEventListener("input", (e) => {
    state.apiBase = (e.target as HTMLInputElement).value;
  });
}

async function load() {
  try {
    const resp = await send<{ settings: { apiBase: string } }>({ type: "GET_SETTINGS" });
    state.apiBase = resp.settings.apiBase || DEFAULT_API_BASE;
  } catch (err: any) {
    state.error = true;
    state.status = err?.message || "Failed to load settings.";
  }
  render();
}

async function save() {
  const trimmed = state.apiBase.trim().replace(/\/$/, "");
  if (!/^https?:\/\//.test(trimmed)) {
    state.error = true;
    state.status = "API base must start with http:// or https://";
    render();
    return;
  }
  try {
    await send({ type: "SET_SETTINGS", apiBase: trimmed });
    state.apiBase = trimmed;
    state.error = false;
    state.status = "Saved.";
  } catch (err: any) {
    state.error = true;
    state.status = err?.message || "Save failed.";
  }
  render();
}

void load();
