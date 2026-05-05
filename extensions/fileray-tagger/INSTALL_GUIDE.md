# Fileray Tagger — Install & OAuth Setup

A one-time, ~10 minute setup. After this, sign-in just works forever.

---

## Part 1 — Load the extension into Chrome (2 min)

1. Unzip `fileray-tagger-v0.1.0.zip` somewhere stable (e.g. `~/fileray-tagger/`).
   Don't put it in Downloads — if you delete it, the extension breaks.
2. Open Chrome and go to `chrome://extensions`
3. Top-right corner: toggle **Developer mode** ON
4. Click **Load unpacked** (top-left)
5. Select the unzipped folder (the one that contains `manifest.json`)
6. The Fileray card appears. **Copy the ID** shown on the card —
   it's a 32-character string like `abcdefghijklmnopabcdefghijklmnop`.
   You'll paste it in Part 2.

If you click the Fileray icon now and try **Sign in with Google**, you'll
get an `OAuth2 not granted or revoked` error. That's expected — Part 2
fixes it.

---

## Part 2 — Create the OAuth client (5 min)

### 2a. Open Google Cloud Console

1. Go to https://console.cloud.google.com/
2. Sign in with the Google account you want to own this extension
3. Top bar: click the project dropdown → **New Project**
   - Name: `Fileray Tagger`
   - Click **Create**, wait ~10 seconds, then make sure that project is selected

### 2b. Enable the Drive API

1. Left sidebar → **APIs & Services** → **Library**
2. Search **Google Drive API** → click it → click **Enable**
3. Wait for the green checkmark

### 2c. Configure the consent screen

1. Left sidebar → **APIs & Services** → **OAuth consent screen**
2. User type: **External** → **Create**
3. Fill in:
   - App name: `Fileray Tagger`
   - User support email: your email
   - Developer contact: your email
   - (Leave logo, domains, etc. blank for now)
4. Click **Save and Continue**
5. **Scopes** screen → click **Save and Continue** (don't add scopes here;
   the manifest declares them)
6. **Test users** → click **Add Users** → add your own Gmail address →
   **Save and Continue**
7. **Summary** → **Back to Dashboard**

> While the app is in "Testing" mode, only the test users you added can
> sign in. That's fine for personal use.

### 2d. Create the OAuth client ID

1. Left sidebar → **APIs & Services** → **Credentials**
2. Top: **+ Create Credentials** → **OAuth client ID**
3. Application type: **Chrome Extension**
4. Name: `Fileray Tagger Extension`
5. **Item ID**: paste the 32-character extension ID you copied in Part 1
6. Click **Create**
7. A dialog shows your **Client ID** — looks like
   `123456789012-xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
8. **Copy it.**

---

## Part 3 — Wire the client ID into the extension (1 min)

1. In your unzipped extension folder, open `manifest.json` in any text
   editor (TextEdit, Notepad, VS Code — anything)
2. Find the line:
   ```json
   "client_id": "REPLACE_WITH_YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com",
   ```
3. Replace the whole quoted string with the Client ID you just copied.
   Keep the quotes.
4. Save the file.
5. Back in `chrome://extensions`, click the **reload arrow** ⟳ on the
   Fileray card.

---

## Part 4 — Try it (1 min)

1. Click the Fileray icon in your toolbar (pin it via the puzzle-piece
   menu if you don't see it)
2. Click **Sign in with Google** → pick your account → grant Drive access
3. Open https://drive.google.com in a new tab
4. Drag any file in
5. The Fileray panel slides in bottom-right within ~250ms with AI tag
   suggestions. Click **Save** to write them to the file's Drive
   properties + description.

---

## Common stumbles

- **"This app is blocked"** — your OAuth consent screen is in production
  mode without verification. Switch it back to **Testing** in the consent
  screen settings.
- **"OAuth2 not granted or revoked"** — usually means the client_id in
  manifest.json doesn't match the extension ID, OR you forgot to reload
  the extension after editing the manifest. Double-check both.
- **Extension ID changed after I reloaded** — happens if you re-imported
  the folder from a different path. The fix: in `chrome://extensions`,
  remove the extension, then **Load unpacked** again from the original
  path. To make the ID stable across machines, generate a key (advanced —
  ask if you want this).
- **Panel doesn't appear on Drive** — make sure you're on
  `https://drive.google.com/...` (not `docs.google.com` or
  `mail.google.com`), and that the icon shows you're signed in.

---

## When you publish to the Chrome Web Store

This whole OAuth dance becomes a one-time-per-developer thing. End users
just install from the store and click "Sign in" — no manifest editing,
no Cloud Console. The store-listing prep is in `STORE_LISTING.md`.
