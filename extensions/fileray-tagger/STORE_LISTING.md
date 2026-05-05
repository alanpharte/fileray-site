# Chrome Web Store listing — Fileray Tagger

Copy these fields directly into the Chrome Web Store Developer Dashboard when
submitting the extension.

## Item details

- **Name:** `Fileray Tagger`
- **Summary** (max 132 chars):
  `AI auto-tag your Google Drive uploads in-context. Powered by Fileray.`
- **Category:** `Productivity`
- **Language:** `English (United States)`

## Description

```
Fileray Tagger turns Google Drive into an organized library — automatically.

The moment you upload a file to Drive, Fileray Tagger surfaces it in a small
panel anchored to the bottom-right of drive.google.com and offers three ways
to tag it:

  • AI auto — Fileray's AI suggests tags based on the file's name, type, and
    (for images) contents. Confirm with one click.
  • Custom — type your own tag chips.
  • None — confirm with no tags and move on.

Tags are written directly into the file's Drive metadata:
  • properties.tags (comma-separated, machine-readable)
  • A mirrored "[fileray-tags] …" line in the file description

That means the tags travel with the file, are searchable in Drive, and stay
useful even if you stop using the extension.

What's nice about it:

  • One-time Google sign-in via Chrome Identity. No passwords, no API keys
    to paste.
  • The extension never embeds an API key. AI tagging is proxied through
    your configurable Fileray API server (default: driveiq.replit.app).
  • Lime-and-plum panel matches Drive's layout without getting in the way.
  • Works on freshly uploaded files within seconds.

Permissions, in plain English:
  • drive.google.com — to show the panel on the Drive tab.
  • googleapis.com — to read file bytes (image auto-tag) and patch metadata.
  • driveiq.replit.app — to ask the Fileray API for tag suggestions.

We do not collect analytics, do not sell data, and do not read files you
didn't upload during the current session. See our privacy policy for the
full breakdown.
```

## Privacy

- **Privacy policy URL:** Host `PRIVACY.md` on a public URL (e.g.
  `https://driveiq.replit.app/privacy`) and paste it here.
- **Single purpose:**
  `Help users tag files they upload to Google Drive, using Fileray's AI for suggestions.`
- **Permission justifications:**
  - `identity` — Sign the user in via Chrome Identity so we can call the
    Drive API on their behalf.
  - `storage` — Persist the user's chosen Fileray API base URL and a cached
    profile.
  - `alarms` — Reserved for future background polling.
  - `host_permissions: drive.google.com` — Inject the in-page panel.
  - `host_permissions: googleapis.com` — Call the Drive REST API.
  - `host_permissions: driveiq.replit.app` — Call the Fileray API server for
    tag suggestions.
  - `oauth2 scope auth/drive` — Read file bytes for image auto-tag and patch
    file metadata.
- **Data usage disclosures:**
  - Authentication information: collected, used for app functionality, not
    sold, not used for ads.
  - Personally identifiable information (name/email): collected, used for app
    functionality, not sold, not used for ads.
  - Website content (file metadata + image bytes you choose to tag):
    collected, used for app functionality, not sold, not used for ads.
- **Compliance certification:** Tick the box affirming that data handling
  matches the disclosures above.

## Assets to upload

These need to be created manually before submission. The Chrome Web Store
requires:

- **Icon:** 128×128 PNG (place at `src/icons/icon-128.png`; the build copies
  the `src/icons/` directory if it exists).
- **Small promo tile:** 440×280 PNG.
- **Screenshots:** 1–5 screenshots, 1280×800 or 640×400 PNG/JPEG. Recommended:
  1. The Fileray panel showing a freshly uploaded file with AI-suggested tags.
  2. The Custom-tag chip input in action.
  3. The Drive file detail view showing the saved `properties.tags` and the
     mirrored `[fileray-tags]` description line.
  4. The popup showing the signed-in user.
  5. The Options page showing the configurable API base URL.

To capture screenshots, load the unpacked extension in Chrome, walk through
each flow on `drive.google.com`, and use Chrome DevTools' device toolbar to
size the viewport to 1280×800 before capturing.

## Submission checklist

1. Build a clean production zip:
   ```bash
   pnpm --filter @workspace/fileray-tagger run package
   ```
   Output: `extensions/fileray-tagger/fileray-tagger-v<version>.zip`.
2. Create a Chrome Web Store developer account (one-time $5 fee) at
   <https://chrome.google.com/webstore/devconsole>.
3. Click **New item**, upload the zip.
4. Fill in **Store listing** using the copy above and upload the assets.
5. Fill in **Privacy practices** using the disclosures above and the
   privacy policy URL.
6. Submit for review.

## After approval

1. Note the **public extension ID** Google assigns. It will not change for
   the lifetime of the listing.
2. In Google Cloud Console → APIs & Services → Credentials, create a
   **Chrome Extension** OAuth client whose Item ID is the published ID.
   Replace the placeholder in `src/manifest.json` (`oauth2.client_id`).
3. Re-build (`pnpm --filter @workspace/fileray-tagger run package`) and
   upload the new zip as a **new version**. (Chrome blocks loading
   `chrome.identity.getAuthToken` without a matching client ID.)
4. Update `README.md` — replace the "Public install link" placeholder with
   `https://chrome.google.com/webstore/detail/<published-extension-id>`.
