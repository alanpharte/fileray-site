import type { DriveFileSummary, Msg } from "./types";

const POLL_INTERVAL_MS = 4000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const sessionStartIso = new Date(Date.now() - 5_000).toISOString();
const seenIds = new Set<string>();
let pollTimer: number | undefined;

type Stage = "detecting" | "tagging" | "review" | "saving" | "done" | "error";
type TagMode = "ai" | "custom" | "none";

interface Entry {
  file: DriveFileSummary;
  stage: Stage;
  tagMode: TagMode;
  tags: string[];
  customInput: string;
  error?: string;
  dismissed?: boolean;
  /** Bumped on every state-changing user action so stale AI responses can be ignored. */
  requestSeq: number;
}

const entries = new Map<string, Entry>();

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

// ---------------- UI host (Shadow DOM) ----------------

const host = document.createElement("div");
host.id = "fileray-tagger-host";
host.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483647;";
const shadow = host.attachShadow({ mode: "open" });

const style = document.createElement("style");
style.textContent = `
  :host, * { box-sizing: border-box; }
  .panel {
    width: 340px;
    max-height: 70vh;
    background: #1c0f2e;
    color: #f5f0ff;
    border: 1px solid #3a2456;
    border-radius: 14px;
    box-shadow: 0 18px 48px rgba(0,0,0,0.45);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .panel.collapsed { width: auto; }
  .header {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 12px;
    background: linear-gradient(135deg, #2a1746, #1c0f2e);
    cursor: pointer;
    user-select: none;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #c9ff33; box-shadow: 0 0 8px #c9ff33aa; }
  .title { font-weight: 700; font-size: 13px; letter-spacing: 0.02em; flex: 1; }
  .badge {
    background: #c9ff33; color: #1c0f2e; font-weight: 700; font-size: 11px;
    padding: 2px 7px; border-radius: 10px;
  }
  .body { overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
  .empty { padding: 16px 12px; font-size: 12px; color: #b8a8d6; text-align: center; }
  .empty a { color: #c9ff33; text-decoration: none; }
  .card {
    background: #25143d;
    border: 1px solid #3a2456;
    border-radius: 10px;
    padding: 10px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .file {
    display: flex; align-items: center; gap: 8px;
  }
  .file-icon {
    width: 28px; height: 28px; border-radius: 6px;
    background: #1c0f2e; display: flex; align-items: center; justify-content: center;
    font-size: 11px; color: #c9ff33; font-weight: 700;
  }
  .file-name { font-size: 12.5px; font-weight: 600; word-break: break-all; }
  .file-meta { font-size: 11px; color: #b8a8d6; }
  .modes { display: flex; gap: 4px; }
  .mode-btn {
    flex: 1; font-size: 11px; padding: 6px 4px; border-radius: 6px; border: 1px solid #3a2456;
    background: transparent; color: #f5f0ff; cursor: pointer; font-weight: 600;
  }
  .mode-btn.active { background: #c9ff33; color: #1c0f2e; border-color: #c9ff33; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; min-height: 4px; }
  .tag {
    background: #1c0f2e; border: 1px solid #c9ff33; color: #c9ff33;
    font-size: 11px; padding: 2px 8px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px;
  }
  .tag button { background: none; border: none; color: inherit; cursor: pointer; padding: 0; font-size: 13px; line-height: 1; }
  .input {
    width: 100%; background: #1c0f2e; color: #f5f0ff; border: 1px solid #3a2456;
    border-radius: 6px; padding: 6px 8px; font-size: 12px; outline: none;
  }
  .input:focus { border-color: #c9ff33; }
  .row { display: flex; gap: 6px; align-items: center; }
  .btn {
    background: #c9ff33; color: #1c0f2e; border: none;
    padding: 7px 10px; border-radius: 6px; font-weight: 700; font-size: 12px;
    cursor: pointer; flex: 1;
  }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn.ghost { background: transparent; color: #f5f0ff; border: 1px solid #3a2456; flex: 0 0 auto; }
  .btn.danger { background: transparent; color: #ff8a8a; border: 1px solid #4a2a3a; flex: 0 0 auto; }
  .status { font-size: 11px; color: #b8a8d6; }
  .status.error { color: #ff8a8a; }
  .status.success { color: #c9ff33; }
  .spinner {
    width: 12px; height: 12px; border: 2px solid #c9ff33; border-top-color: transparent;
    border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .footer {
    padding: 6px 10px; font-size: 10px; color: #7d6d99; text-align: center; border-top: 1px solid #2a1746;
  }
`;
shadow.appendChild(style);

const panel = document.createElement("div");
panel.className = "panel";
shadow.appendChild(panel);

let collapsed = false;
function render() {
  const visible = [...entries.values()].filter((e) => !e.dismissed);
  panel.classList.toggle("collapsed", collapsed);
  panel.innerHTML = "";

  const header = document.createElement("div");
  header.className = "header";
  header.innerHTML = `
    <div class="dot"></div>
    <div class="title">Fileray Tagger</div>
    ${visible.length ? `<div class="badge">${visible.length}</div>` : ""}
    <div style="font-size:14px;color:#b8a8d6;">${collapsed ? "▴" : "▾"}</div>
  `;
  header.addEventListener("click", () => {
    collapsed = !collapsed;
    render();
  });
  panel.appendChild(header);

  if (collapsed) return;

  const body = document.createElement("div");
  body.className = "body";

  if (visible.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.innerHTML = `Watching for new uploads…<br/><br/>Drop a file into Drive and we'll tag it.`;
    body.appendChild(empty);
  } else {
    for (const entry of visible) {
      body.appendChild(renderCard(entry));
    }
  }

  panel.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "footer";
  footer.textContent = "Powered by Fileray • AI auto-tagging";
  panel.appendChild(footer);
}

function ext(name: string): string {
  const m = /\.([^.]+)$/.exec(name);
  return (m ? m[1] : "FILE").slice(0, 4).toUpperCase();
}

function renderCard(entry: Entry): HTMLElement {
  const card = document.createElement("div");
  card.className = "card";

  const file = document.createElement("div");
  file.className = "file";
  file.innerHTML = `
    <div class="file-icon">${ext(entry.file.name)}</div>
    <div style="flex:1;min-width:0;">
      <div class="file-name">${escapeHtml(entry.file.name)}</div>
      <div class="file-meta">${entry.file.mimeType || "unknown"}</div>
    </div>
  `;
  card.appendChild(file);

  const modes = document.createElement("div");
  modes.className = "modes";
  for (const m of ["ai", "custom", "none"] as TagMode[]) {
    const b = document.createElement("button");
    b.className = "mode-btn" + (entry.tagMode === m ? " active" : "");
    b.textContent = m === "ai" ? "AI auto" : m === "custom" ? "Custom" : "None";
    b.addEventListener("click", () => {
      if (entry.stage === "saving") return;
      entry.tagMode = m;
      entry.requestSeq++;
      if (m === "ai" && entry.tags.length === 0) {
        void runAutoTag(entry);
      } else if (m === "none") {
        entry.tags = [];
        entry.stage = "review";
        render();
      } else {
        entry.stage = "review";
        render();
      }
    });
    modes.appendChild(b);
  }
  card.appendChild(modes);

  if (entry.tagMode === "custom") {
    const inputRow = document.createElement("div");
    inputRow.className = "row";
    const input = document.createElement("input");
    input.className = "input";
    input.placeholder = "Type a tag, press Enter";
    input.value = entry.customInput;
    input.addEventListener("input", (e) => {
      entry.customInput = (e.target as HTMLInputElement).value;
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        commitCustomInput(entry);
      }
    });
    inputRow.appendChild(input);
    card.appendChild(inputRow);
  }

  if (entry.tags.length > 0) {
    const tagWrap = document.createElement("div");
    tagWrap.className = "tags";
    for (const t of entry.tags) {
      const span = document.createElement("span");
      span.className = "tag";
      span.innerHTML = `${escapeHtml(t)} <button title="Remove">×</button>`;
      span.querySelector("button")!.addEventListener("click", () => {
        entry.tags = entry.tags.filter((x) => x !== t);
        entry.requestSeq++;
        render();
      });
      tagWrap.appendChild(span);
    }
    card.appendChild(tagWrap);
  }

  if (entry.stage === "tagging") {
    const status = document.createElement("div");
    status.className = "status";
    status.innerHTML = `<span class="spinner"></span> Generating AI tags…`;
    card.appendChild(status);
  }

  if (entry.stage === "saving") {
    const status = document.createElement("div");
    status.className = "status";
    status.innerHTML = `<span class="spinner"></span> Saving to Drive…`;
    card.appendChild(status);
  }

  if (entry.stage === "done") {
    const status = document.createElement("div");
    status.className = "status success";
    status.textContent = entry.tags.length ? `✓ Saved ${entry.tags.length} tag${entry.tags.length === 1 ? "" : "s"}.` : "✓ Saved with no tags.";
    card.appendChild(status);
  }

  if (entry.stage === "error" && entry.error) {
    const status = document.createElement("div");
    status.className = "status error";
    status.textContent = `⚠ ${entry.error}`;
    card.appendChild(status);
  }

  // Action row
  const actions = document.createElement("div");
  actions.className = "row";

  if (entry.stage === "done") {
    const dismiss = document.createElement("button");
    dismiss.className = "btn";
    dismiss.textContent = "Dismiss";
    dismiss.addEventListener("click", () => {
      pruneEntry(entry);
      render();
    });
    actions.appendChild(dismiss);
  } else {
    const save = document.createElement("button");
    save.className = "btn";
    save.disabled = entry.stage === "saving" || entry.stage === "tagging";
    save.textContent = entry.tagMode === "none" ? "Confirm (no tags)" : "Save tags";
    save.addEventListener("click", () => {
      if (entry.tagMode === "custom") commitCustomInput(entry);
      void saveTags(entry);
    });
    actions.appendChild(save);

    if (entry.tagMode === "ai" && entry.stage !== "tagging") {
      const regen = document.createElement("button");
      regen.className = "btn ghost";
      regen.textContent = "↻";
      regen.title = "Regenerate";
      regen.addEventListener("click", () => {
        entry.tags = [];
        entry.requestSeq++;
        void runAutoTag(entry);
      });
      actions.appendChild(regen);
    }

    const skip = document.createElement("button");
    skip.className = "btn danger";
    skip.textContent = "Skip";
    skip.title = "Skip this file";
    skip.addEventListener("click", () => {
      pruneEntry(entry);
      render();
    });
    actions.appendChild(skip);
  }

  card.appendChild(actions);
  return card;
}

function commitCustomInput(entry: Entry) {
  const cleaned = entry.customInput
    .split(/[,\n]/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && t.length <= 50 && !entry.tags.includes(t));
  if (cleaned.length === 0) {
    render();
    return;
  }
  entry.tags = [...entry.tags, ...cleaned].slice(0, 20);
  entry.customInput = "";
  entry.requestSeq++;
  render();
}

/**
 * Drop an entry entirely (frees memory) but keep its id in seenIds so the
 * 4-second poll won't re-add it. seenIds is bounded by trimming the oldest
 * entries when it grows past a soft limit.
 */
function pruneEntry(entry: Entry) {
  entry.dismissed = true;
  entries.delete(entry.file.id);
  if (seenIds.size > 500) {
    const it = seenIds.values();
    for (let i = 0; i < 100; i++) {
      const next = it.next();
      if (next.done) break;
      seenIds.delete(next.value);
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ---------------- Workflow ----------------

async function runAutoTag(entry: Entry) {
  entry.stage = "tagging";
  entry.error = undefined;
  const seq = ++entry.requestSeq;
  render();
  const isStale = () => entry.dismissed || entry.requestSeq !== seq || entry.tagMode !== "ai";
  try {
    const isImage = (entry.file.mimeType || "").startsWith("image/");
    let base64Data: string | undefined;
    if (isImage) {
      const sizeBytes = entry.file.size ? parseInt(entry.file.size, 10) : 0;
      if (sizeBytes && sizeBytes > MAX_IMAGE_BYTES) {
        throw new Error("Image is over 10 MB; switch to custom tags.");
      }
      const dl = await send<{ base64: string; mimeType: string }>({
        type: "DOWNLOAD_FILE",
        fileId: entry.file.id,
      });
      if (isStale()) return;
      base64Data = dl.base64;
    }
    const resp = await send<{ tags: string[] }>({
      type: "AUTO_TAG",
      fileName: entry.file.name,
      mimeType: entry.file.mimeType || "application/octet-stream",
      base64Data,
    });
    if (isStale()) return;
    entry.tags = resp.tags.slice(0, 20);
    entry.stage = "review";
  } catch (err: any) {
    if (isStale()) return;
    entry.stage = "error";
    entry.error = err?.message || "Could not generate tags.";
  }
  render();
}

async function saveTags(entry: Entry) {
  entry.stage = "saving";
  entry.error = undefined;
  const seq = ++entry.requestSeq;
  // Snapshot the tags being saved so a later edit doesn't change what we report.
  const tagsToSave = [...entry.tags];
  render();
  try {
    await send({ type: "PATCH_TAGS", fileId: entry.file.id, tags: tagsToSave });
    if (entry.dismissed || entry.requestSeq !== seq) return;
    entry.tags = tagsToSave;
    entry.stage = "done";
    render();
    setTimeout(() => {
      if (entry.stage === "done" && entry.requestSeq === seq) {
        pruneEntry(entry);
        render();
      }
    }, 6000);
  } catch (err: any) {
    if (entry.dismissed || entry.requestSeq !== seq) return;
    entry.stage = "error";
    entry.error = err?.message || "Could not save tags to Drive.";
    render();
  }
}

async function poll() {
  try {
    const { files } = await send<{ files: DriveFileSummary[] }>({
      type: "LIST_RECENT",
      afterIso: sessionStartIso,
    });
    for (const f of files) {
      if (seenIds.has(f.id)) continue;
      seenIds.add(f.id);
      const entry: Entry = {
        file: f,
        stage: "detecting",
        tagMode: "ai",
        tags: [],
        customInput: "",
        requestSeq: 0,
      };
      entries.set(f.id, entry);
      render();
      void runAutoTag(entry);
    }
  } catch (err: any) {
    // Most likely: not signed in. Show a one-time prompt in the panel.
    if (!entries.has("__signin__")) {
      panel.innerHTML = "";
      const header = document.createElement("div");
      header.className = "header";
      header.innerHTML = `<div class="dot"></div><div class="title">Fileray Tagger</div>`;
      panel.appendChild(header);
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML = `Sign in to start tagging.<br/><br/><a href="#" id="signin">Open Fileray Tagger</a>`;
      panel.appendChild(empty);
      empty.querySelector("#signin")?.addEventListener("click", (e) => {
        e.preventDefault();
        send({ type: "GET_TOKEN", interactive: true }).catch(() => undefined);
      });
    }
  }
}

function start() {
  if (document.getElementById("fileray-tagger-host")) return;
  document.documentElement.appendChild(host);
  render();
  void poll();
  pollTimer = window.setInterval(poll, POLL_INTERVAL_MS);
}

function stop() {
  if (pollTimer) clearInterval(pollTimer);
  host.remove();
}

start();
window.addEventListener("beforeunload", stop);
