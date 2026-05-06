import { Router, type IRouter, type RequestHandler } from "express";
import { eq, or } from "drizzle-orm";
import { db, userSettingsTable } from "@workspace/db";
import { getStripeClient, getStripeConfig, getPublicBaseUrl } from "../lib/stripe";

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

// Resolve (or create) the Fileray account row for the signed-in caller.
async function getOrCreateCallerAccountId(userId: number): Promise<number> {
  const [existing] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(userSettingsTable).values({ userId }).returning();
  if (!created) throw new Error("Failed to create user_settings row");
  return created.id;
}

router.get("/checkout", async (req, res): Promise<void> => {
  const config = getStripeConfig();
  const stripe = getStripeClient();

  if (!config || !stripe) {
    req.log.warn("GET /api/checkout called without Stripe credentials configured");
    res.status(503).type("html").send(notConfiguredPage("checkout"));
    return;
  }

  const userId = req.session?.userId;
  if (!userId) {
    res.redirect(303, "/api/auth/google");
    return;
  }

  try {
    const baseUrl = getPublicBaseUrl();
    const accountId = await getOrCreateCallerAccountId(userId);

    const [account] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.id, accountId))
      .limit(1);

    const existingCustomerId = account?.stripeCustomerId ?? undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: config.priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { fileray_account_id: String(accountId) },
      },
      ...(existingCustomerId ? { customer: existingCustomerId } : {}),
      client_reference_id: String(accountId),
      metadata: { fileray_account_id: String(accountId) },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      req.log.error({ sessionId: session.id }, "Stripe session created without redirect URL");
      res.status(502).type("html").send(notConfiguredPage("checkout"));
      return;
    }

    res.redirect(303, session.url);
  } catch (err) {
    req.log.error({ err }, "Failed to create Stripe checkout session");
    res.status(502).type("html").send(notConfiguredPage("checkout"));
  }
});

type BillingFields = {
  stripeCustomerId: string;
  subscriptionId: string | null;
  status: string | null;
  trialEnd: number | null;
  currentPeriodEnd: number | null;
};

async function findAccountIdForBillingEvent(opts: {
  filerayAccountId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}): Promise<number | null> {
  // 1. Trust the metadata/client_reference_id we attached at checkout time.
  if (opts.filerayAccountId) {
    const parsed = Number(opts.filerayAccountId);
    if (Number.isFinite(parsed)) {
      const [row] = await db
        .select()
        .from(userSettingsTable)
        .where(eq(userSettingsTable.id, parsed))
        .limit(1);
      if (row) return row.id;
    }
  }

  // 2. Fall back to the row already linked to this Stripe customer / subscription.
  const filters = [];
  if (opts.customerId) filters.push(eq(userSettingsTable.stripeCustomerId, opts.customerId));
  if (opts.subscriptionId) filters.push(eq(userSettingsTable.stripeSubscriptionId, opts.subscriptionId));
  if (filters.length > 0) {
    const where = filters.length === 1 ? filters[0]! : or(...filters)!;
    const [row] = await db.select().from(userSettingsTable).where(where).limit(1);
    if (row) return row.id;
  }

  return null;
}

async function writeBillingFields(accountId: number, fields: BillingFields): Promise<void> {
  await db
    .update(userSettingsTable)
    .set({
      stripeCustomerId: fields.stripeCustomerId,
      stripeSubscriptionId: fields.subscriptionId,
      subscriptionStatus: fields.status,
      trialEndsAt: fields.trialEnd ? new Date(fields.trialEnd * 1000) : null,
      currentPeriodEndsAt: fields.currentPeriodEnd ? new Date(fields.currentPeriodEnd * 1000) : null,
    })
    .where(eq(userSettingsTable.id, accountId));
}

export const stripeWebhookHandler: RequestHandler = async (req, res): Promise<void> => {
  const config = getStripeConfig();
  const stripe = getStripeClient();
  if (!config || !stripe) {
    req.log.warn("POST /api/stripe/webhook called without Stripe configured");
    res.status(503).json({ error: "Stripe webhook not configured" });
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || Array.isArray(signature)) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    req.log.error("Webhook handler received non-buffer body; raw body middleware not active");
    res.status(500).json({ error: "Invalid webhook body" });
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret);
  } catch (err) {
    req.log.warn({ err }, "Stripe webhook signature verification failed");
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!customerId) {
          req.log.warn({ sessionId: session.id }, "checkout.session.completed without customer; ignoring");
          break;
        }
        const filerayAccountId =
          session.client_reference_id ?? session.metadata?.["fileray_account_id"] ?? null;

        const accountId = await findAccountIdForBillingEvent({
          filerayAccountId,
          customerId,
          subscriptionId,
        });
        if (accountId === null) {
          req.log.warn(
            { sessionId: session.id, customerId, subscriptionId },
            "checkout.session.completed could not be matched to a Fileray account; ignoring",
          );
          break;
        }

        let status: string | null = null;
        let trialEnd: number | null = null;
        let currentPeriodEnd: number | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          status = sub.status;
          trialEnd = sub.trial_end ?? null;
          const item = sub.items.data[0];
          currentPeriodEnd = item?.current_period_end ?? null;
        }
        await writeBillingFields(accountId, {
          stripeCustomerId: customerId,
          subscriptionId: subscriptionId ?? null,
          status,
          trialEnd,
          currentPeriodEnd,
        });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.trial_will_end":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (!customerId) break;
        const filerayAccountId = sub.metadata?.["fileray_account_id"] ?? null;
        const accountId = await findAccountIdForBillingEvent({
          filerayAccountId,
          customerId,
          subscriptionId: sub.id,
        });
        if (accountId === null) {
          req.log.warn(
            { eventType: event.type, customerId, subscriptionId: sub.id },
            "Subscription event could not be matched to a Fileray account; ignoring",
          );
          break;
        }
        const item = sub.items?.data?.[0];
        await writeBillingFields(accountId, {
          stripeCustomerId: customerId,
          subscriptionId: sub.id,
          status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
          trialEnd: sub.trial_end ?? null,
          currentPeriodEnd: item?.current_period_end ?? null,
        });
        break;
      }
      default:
        req.log.debug({ type: event.type }, "Ignoring Stripe event");
    }

    res.json({ received: true });
  } catch (err) {
    req.log.error({ err, eventType: event.type }, "Failed to process Stripe webhook");
    res.status(500).json({ error: "Webhook handler error" });
  }
};

export default router;
