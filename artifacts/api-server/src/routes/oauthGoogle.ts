import { Router, type IRouter } from "express";

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
      <li>Add the redirect URI for this environment: <code>${"https://" + (process.env["REPLIT_DEV_DOMAIN"] || "fileray.io") + "/api/auth/google/callback"}</code></li>
      <li>Set the secrets <code>GOOGLE_OAUTH_CLIENT_ID</code> and <code>GOOGLE_OAUTH_CLIENT_SECRET</code> in Replit, then restart the API server.</li>
    </ul>
  </div>
  <p style="margin-top: 24px;"><a href="/">← Back to fileray.io</a></p>
</body>
</html>`;
}

router.get("/auth/google", (req, res): void => {
  const clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_OAUTH_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    req.log.warn("GET /api/auth/google called without OAuth credentials configured");
    res.status(503).type("html").send(notConfiguredPage());
    return;
  }

  // Real OAuth flow will be wired up here once secrets are in place.
  // Intentionally not implemented in this iteration — see task plan step 2.
  res.status(503).type("html").send(notConfiguredPage());
});

router.get("/auth/google/callback", (req, res): void => {
  res.status(503).type("html").send(notConfiguredPage());
});

export default router;
