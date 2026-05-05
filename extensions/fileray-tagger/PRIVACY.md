# Fileray Tagger — Privacy Policy

_Last updated: May 5, 2026_

Fileray Tagger ("the extension") is a Chrome extension that helps you tag files
you upload to Google Drive. This document explains what information the
extension handles, why, and where it goes.

## Data the extension handles

The extension processes the following data **only on your device or against
services you have explicitly authorized**:

| Data | Why it's used | Where it goes |
| --- | --- | --- |
| Your Google account identity (email, name, profile picture) | Sign-in via Chrome Identity so the extension can call the Drive API on your behalf. | Google (Chrome Identity / OAuth). Cached locally in `chrome.storage` for display only. |
| OAuth access token for Google Drive | Read file bytes (for image auto-tagging) and patch file metadata (`properties.tags`, `description`). | Google APIs (`googleapis.com`). The token is held in memory by the extension's service worker and never sent to any third party. |
| Metadata of files you upload to Drive while the extension is active (file ID, name, MIME type) | Display the file in the Fileray panel and request tag suggestions. | Sent to the Fileray API server (`https://driveiq.replit.app` by default, or whatever URL you configure on the Options page). |
| File contents (image bytes only, when AI auto-tag mode is selected) | Generate AI tag suggestions. | Sent to the Fileray API server you have configured. |
| Tags you confirm | Saved as Drive file `properties.tags` and mirrored into the file's description. | Google Drive (your own account). |
| Your Fileray API base URL preference | Lets you point the extension at a different Fileray instance (e.g. self-hosted or local dev). | Stored locally in `chrome.storage.sync`. |

## Data the extension does **not** collect

- The extension does **not** send analytics, telemetry, or crash reports.
- The extension does **not** read or transmit files you did not upload during the
  current session.
- The extension does **not** share data with advertisers or data brokers.
- The extension does **not** include any embedded API keys.

## Permissions

| Permission | Reason |
| --- | --- |
| `identity` | Google sign-in via Chrome Identity. |
| `storage` | Save your Fileray API base URL and a cached copy of your profile. |
| `alarms` | Reserved for future background polling. |
| Host: `drive.google.com` | Inject the in-page Fileray panel. |
| Host: `googleapis.com` | Call the Drive REST API. |
| Host: `driveiq.replit.app` | Call the Fileray API server for tag suggestions. |
| OAuth scope `auth/drive` | Read file bytes (for image auto-tag) and patch metadata. |

## Third parties

- **Google** — receives your OAuth requests and Drive API calls (this is
  unavoidable; the extension is a Drive client).
- **Fileray API server** (`https://driveiq.replit.app` by default) — receives
  the file metadata and, in AI auto-tag mode, image bytes that you choose to
  tag. You may point the extension at a different server via the Options page.

## Data retention

- Your OAuth token is held in service-worker memory and discarded when Chrome
  restarts the worker.
- Cached profile data lives in `chrome.storage` until you sign out or remove
  the extension.
- The Fileray API server does not persist file bytes; it processes them in
  request scope only. See the Fileray privacy notice on the Fileray website
  for the server-side policy.

## Your choices

- Sign out from the popup at any time to revoke the cached token.
- Remove the extension from `chrome://extensions/` to delete all locally
  cached data.
- Revoke the extension's Google access at
  <https://myaccount.google.com/permissions>.

## Contact

Questions or concerns: file an issue on the Fileray project repository, or
email the address listed on the Chrome Web Store listing.
