import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, userSettingsTable, cachedScansTable } from "@workspace/db";
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
  getOAuthConfig,
  getRedirectUri,
  loadUserById,
  revokeRefreshToken,
  upsertUserFromOAuth,
} from "../lib/googleOAuth";
import { decryptSecret } from "../lib/crypto";

const router: IRouter = Router();

function notConfiguredPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Google sign-in not configured yet — Fileray</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #1c0f2e; color: #f0e8ff; padding: 60px 24px; max-width: 640px; margin: 0 auto; line-height: 1.55; }
  h1 { color: #c9ff33; font-size: 28px; margin-bottom: 16px; }
  code { background: #2e1b50; padding: 2px 6px; border-radius: 4px; color: #c9ff33; font-size: 13px; }
  ul { margin: 12px 0 24px 20px; }
  li { margin-bottom: 8px; }
  a { color: #c9ff33; }
  .box { background: #251540; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-top: 24px; }
</style>
</head>
<body>
  <h1>Sign in with Google isn't wired up yet</h1>
  <p>Fileray's production Google OAuth client hasn't been configured on this environment. The site owner needs to:</p>
  <div class="box">
    <ul>
      <li>Create a Google Cloud OAuth 2.0 Client ID in <a href="https://console.cloud.google.com/apis/credentials">Google Cloud Console</a>.</li>
      <li>Add the redirect URI for this environment: <code>${getRedirectUri()}</code></li>
      <li>Set the secrets <code>GOOGLE_OAUTH_CLIENT_ID</code> and <code>GOOGLE_OAUTH_CLIENT_SECRET</code> in Replit, then restart the API server.</li>
    </ul>
  </div>
  <p style="margin-top: 24px;"><a href="/">← Back to fileray.io</a></p>
</body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function errorPage(message: string): string {
  const safe = escapeHtml(message);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Sign-in failed — Fileray</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#1c0f2e;color:#f0e8ff;padding:60px 24px;max-width:640px;margin:0 auto;line-height:1.55}h1{color:#ff6b6b;font-size:24px;margin-bottom:12px}a{color:#c9ff33}</style>
</head><body><h1>Sign-in failed</h1><p>${safe}</p><p><a href="/">← Back to fileray.io</a></p></body></html>`;
}

router.get("/auth/google", (req, res): void => {
  if (!getOAuthConfig()) {
    req.log.warn("GET /api/auth/google called without OAuth credentials configured");
    res.status(503).type("html").send(notConfiguredPage());
    return;
  }

  const state = randomBytes(24).toString("hex");
  req.session.oauthState = state;
  req.session.save((err) => {
    if (err) {
      req.log.error({ err }, "Failed to save session before OAuth redirect");
      res.status(500).type("html").send(errorPage("Could not start sign-in. Please try again."));
      return;
    }
    res.redirect(buildAuthorizationUrl(state));
  });
});

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  if (!getOAuthConfig()) {
    res.status(503).type("html").send(notConfiguredPage());
    return;
  }

  const { code, state, error } = req.query as Record<string, string | undefined>;

  if (error) {
    req.log.warn({ error }, "Google OAuth returned an error");
    const safeError = String(error).slice(0, 100).replace(/[^a-zA-Z0-9_\- .]/g, "");
    res.status(400).type("html").send(errorPage(`Google declined the sign-in: ${safeError || "unknown_error"}`));
    return;
  }

  if (!code || !state) {
    res.status(400).type("html").send(errorPage("Missing authorization code."));
    return;
  }

  const expectedState = req.session.oauthState;
  if (!expectedState || expectedState !== state) {
    req.log.warn("OAuth state mismatch");
    res.status(400).type("html").send(errorPage("Sign-in was interrupted. Please try again."));
    return;
  }
  delete req.session.oauthState;

  try {
    const tokens = await exchangeCodeForTokens(code);
    const info = await fetchUserInfo(tokens.access_token);
    const user = await upsertUserFromOAuth(info, tokens);

    req.session.regenerate((regenErr) => {
      if (regenErr) {
        req.log.error({ err: regenErr }, "Failed to regenerate session after OAuth");
        res.status(500).type("html").send(errorPage("Could not finish sign-in. Please try again."));
        return;
      }
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          req.log.error({ err }, "Failed to save session after OAuth");
          res.status(500).type("html").send(errorPage("Could not finish sign-in. Please try again."));
          return;
        }
        res.redirect("/");
      });
    });
  } catch (err) {
    req.log.error({ err }, "OAuth callback failed");
    res.status(500).type("html").send(errorPage("Sign-in failed. Please try again."));
  }
});

router.get("/auth/logout", (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Failed to destroy session on logout");
    }
    res.clearCookie("fileray.sid");
    res.redirect("/");
  });
});

router.post("/auth/delete-account", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }

  let user;
  try {
    user = await loadUserById(userId);
  } catch (err) {
    req.log.error({ err }, "Failed to load user during account deletion");
    res.status(500).json({ error: "Failed to delete account." });
    return;
  }

  if (!user) {
    req.session.destroy(() => undefined);
    res.clearCookie("fileray.sid");
    res.sendStatus(204);
    return;
  }

  if (user.encryptedRefreshToken) {
    try {
      const refreshToken = decryptSecret(user.encryptedRefreshToken);
      await revokeRefreshToken(refreshToken);
    } catch (err) {
      // Log but continue — we still want to remove the user's data even if
      // Google's revoke call fails. The user can revoke manually at
      // myaccount.google.com/permissions if needed.
      req.log.warn({ err, userId }, "Failed to revoke Google refresh token during account deletion");
    }
  }

  try {
    // Wipe per-user rows (scoped strictly by userId so we never touch
    // another account's data) in a single transaction with the users-row
    // delete. The user_settings/cached_scans FKs also have ON DELETE CASCADE
    // as a defence-in-depth fallback.
    await db.transaction(async (tx) => {
      await tx.delete(cachedScansTable).where(eq(cachedScansTable.userId, userId));
      await tx.delete(userSettingsTable).where(eq(userSettingsTable.userId, userId));
      await tx.delete(usersTable).where(eq(usersTable.id, userId));
    });
  } catch (err) {
    req.log.error({ err, userId }, "Failed to delete user row during account deletion");
    res.status(500).json({ error: "Failed to delete account." });
    return;
  }

  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Failed to destroy session after account deletion");
    }
    res.clearCookie("fileray.sid");
    res.sendStatus(204);
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Failed to destroy session on logout");
      res.status(500).json({ error: "Failed to log out." });
      return;
    }
    res.clearCookie("fileray.sid");
    res.sendStatus(204);
  });
});

export default router;
