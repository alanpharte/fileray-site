# Fileray Tagger — Chrome extension

A Chrome (Manifest V3) extension that detects when you're on `drive.google.com`, watches for files you upload, and offers in-context AI auto-tagging — powered by the Fileray API server's `/api/files/auto-tag` endpoint.

## Public install link

> **Chrome Web Store:** _pending review — link will be added here after Google approves the listing._
>
> Until then, use **Load unpacked** (instructions below) or the source zip in Releases.

See [`STORE_LISTING.md`](./STORE_LISTING.md) for the submission package and
[`PRIVACY.md`](./PRIVACY.md) for the privacy policy.

## What it does

- Sign in once with Google (Chrome Identity).
- A floating Fileray panel anchors to the bottom-right of `drive.google.com`.
- When you upload a file, the panel shows it with three tag modes:
  - **AI auto** (default) — auto-runs against the Fileray API.
  - **Custom** — chip input.
  - **None** — confirm with no tags.
- On save, tags are written to the file's Drive metadata: `properties.tags` (comma-separated) and a mirrored `[fileray-tags] …` line in the description.

The extension never embeds an API key. It calls the Fileray API server (configurable URL) for tagging and uses the user's own OAuth token for everything Drive-side.

## Build

From the repo root:

```bash
pnpm install
pnpm --filter @workspace/fileray-tagger run build
```

The unpacked extension is written to `extensions/fileray-tagger/dist/`.

For iterative development:

```bash
pnpm --filter @workspace/fileray-tagger run dev
```

For a Chrome-Web-Store-ready zip:

```bash
pnpm --filter @workspace/fileray-tagger run package
```

This writes `extensions/fileray-tagger/fileray-tagger-v<version>.zip`, built
with the production `host_permissions` list (`drive.google.com`,
`googleapis.com`, `driveiq.replit.app` only).

> **Note for local development:** the production manifest no longer includes
> `localhost`, `*.replit.dev`, or `*.replit.app` (other than the production
> Fileray host). If you point the Options page at a non-default API base for
> local testing, temporarily add the relevant origin to `host_permissions` in
> `src/manifest.json` and rebuild — but do not commit that change.

## Load it into Chrome

1. Build the extension (above) so `extensions/fileray-tagger/dist/` exists.
2. Open `chrome://extensions/` in Chrome.
3. Toggle **Developer mode** (top-right).
4. Click **Load unpacked** and select `extensions/fileray-tagger/dist/`.
5. Note the **Extension ID** that Chrome shows — you'll need it for OAuth setup.

## Set up the Google OAuth client (one-time)

`chrome.identity.getAuthToken` requires a Chrome-extension-type OAuth client ID baked into the manifest.

1. Go to <https://console.cloud.google.com/> → APIs & Services → **Credentials**.
2. Click **Create credentials → OAuth client ID**.
3. **Application type:** *Chrome Extension*.
4. **Item ID:** the Extension ID from `chrome://extensions/`.
5. Copy the resulting `*.apps.googleusercontent.com` client ID.
6. Paste it into `extensions/fileray-tagger/src/manifest.json` → `oauth2.client_id`, replacing `REPLACE_WITH_YOUR_CHROME_OAUTH_CLIENT_ID.apps.googleusercontent.com`.
7. In **APIs & Services → OAuth consent screen**, add the following scopes (or rely on Google's default scope screen):
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/drive`
8. While the app is in *Testing*, add your Google account as a test user.
9. Rebuild (`pnpm --filter @workspace/fileray-tagger run build`) and reload the extension in Chrome.

## Configure the Fileray API base

Open the extension's **Options** page (right-click the extension icon → *Options*, or click *Settings* in the popup) and set the **Fileray API base URL**.

Default: `https://driveiq.replit.app` — the deployed Fileray app. Override for local dev (e.g., `http://localhost:8080`) or for self-hosted instances.

The Fileray API server already responds with permissive CORS (`app.use(cors())`), so cross-origin calls from the extension origin (`chrome-extension://<extension-id>`) work without further changes.

## How upload detection works

Detection is push-style, with two triggers:

1. **DOM hook (primary, <500ms).** A `MutationObserver` on `document.body` watches for Drive's upload-status panel flipping to "Upload complete" / "Uploaded to My Drive" (matched in text and `aria-label`, not by class name). When seen, it debounces (~250ms) and asks the service worker for fresh changes.
2. **Drive `changes.list` cursor (low-frequency fallback, every 60s).** The background service worker tracks a `pageToken` in `chrome.storage.local` (seeded from `changes.getStartPageToken` on first run) and asks for deltas only. A request with no new files is essentially free.

This drops Drive API call volume from ~900/hr while idle (the old 4s `files.list` poll) to ~60/hr while idle, with new uploads still surfacing within ~500ms of the toast appearing. Files uploaded before opening Drive are still not back-tagged — that's a separate task.

## Permissions explained

| Permission | Why |
| --- | --- |
| `identity` | OAuth via Chrome Identity. |
| `storage` | Save the chosen Fileray API base + cached profile. |
| `alarms` | Reserved for future background polling. |
| `host_permissions: drive.google.com` | Inject the content script. |
| `host_permissions: googleapis.com` | Call the Drive REST API from the service worker. |
| `host_permissions: driveiq.replit.app` | Call the production Fileray API server. |
| OAuth scope `auth/drive` | Read file bytes (for image auto-tag) and patch metadata. |

## Project layout

```
extensions/fileray-tagger/
├── src/
│   ├── manifest.json     # Manifest V3
│   ├── background.ts     # Service worker (auth, Drive API, Fileray proxy)
│   ├── content.ts        # Injected on drive.google.com (panel + polling)
│   ├── popup.html/.ts    # Sign-in/status popup
│   ├── options.html/.ts  # API base configuration
│   └── *.css             # Lime/plum Fileray styling
├── build.mjs             # esbuild bundler (also copies static files)
├── package.json
├── tsconfig.json
└── dist/                 # Build output (load this folder into Chrome)
```
