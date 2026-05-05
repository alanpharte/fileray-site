# Fileray Tagger — Chrome extension

A Chrome (Manifest V3) extension that detects when you're on `drive.google.com`, watches for files you upload, and offers in-context AI auto-tagging — powered by the Fileray API server's `/api/files/auto-tag` endpoint.

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

Drive's web UI is heavily obfuscated, so the extension does **not** scrape the upload toast DOM. Instead, it polls Drive's REST API every ~4 seconds for files owned by the user that were created after the extension started, are not folders, and are not trashed. Newly seen files are added to the panel and auto-tagged.

This means:

- Newly uploaded files appear within ~4 seconds.
- Files uploaded before opening Drive are not tagged.
- Sequential uploads are handled in order; the panel can hold several at once.

## Permissions explained

| Permission | Why |
| --- | --- |
| `identity` | OAuth via Chrome Identity. |
| `storage` | Save the chosen Fileray API base + cached profile. |
| `alarms` | Reserved for future background polling. |
| `host_permissions: drive.google.com` | Inject the content script. |
| `host_permissions: googleapis.com` | Call the Drive REST API from the service worker. |
| `host_permissions: replit.app/replit.dev/localhost` | Call the configured Fileray API server. |
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
