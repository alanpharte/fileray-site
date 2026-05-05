import { Router, type IRouter } from "express";

const router: IRouter = Router();

function notConfiguredPage(kind: "checkout" | "webhook"): string {
  const heading = kind === "checkout" ? "Checkout isn't ready yet" : "Stripe webhook isn't configured";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${heading} — Fileray</title>
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
  <h1>${heading}</h1>
  <p>Fileray's Stripe billing isn't fully wired up on this environment yet. The site owner needs to:</p>
  <div class="box">
    <ul>
      <li>Create a Product + recurring monthly Price in the <a href="https://dashboard.stripe.com/products">Stripe Dashboard</a>.</li>
      <li>Set the secrets <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PRICE_ID</code> and <code>STRIPE_WEBHOOK_SECRET</code> in Replit.</li>
      <li>Restart the API server, then try again.</li>
    </ul>
  </div>
  <p style="margin-top: 24px;"><a href="/">← Back to fileray.io</a></p>
</body>
</html>`;
}

router.get("/checkout", (req, res): void => {
  const stripeKey = process.env["STRIPE_SECRET_KEY"];
  const priceId = process.env["STRIPE_PRICE_ID"];

  if (!stripeKey || !priceId) {
    req.log.warn("GET /api/checkout called without Stripe credentials configured");
    res.status(503).type("html").send(notConfiguredPage("checkout"));
    return;
  }

  // Real Stripe Checkout session creation will go here once secrets are in place.
  res.status(503).type("html").send(notConfiguredPage("checkout"));
});

router.post("/stripe/webhook", (req, res): void => {
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!webhookSecret) {
    req.log.warn("POST /api/stripe/webhook called without webhook secret configured");
    res.status(503).json({ error: "Stripe webhook not configured" });
    return;
  }
  res.status(503).json({ error: "Stripe webhook not configured" });
});

export default router;
