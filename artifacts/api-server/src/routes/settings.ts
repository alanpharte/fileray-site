import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userSettingsTable, cachedScansTable } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
  CompleteOnboardingBody,
  CompleteOnboardingResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function requireUserId(req: Parameters<Parameters<typeof router.get>[1]>[0]): number | null {
  return req.session?.userId ?? null;
}

async function loadOrCreate(userId: number) {
  let [settings] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);
  if (!settings) {
    [settings] = await db
      .insert(userSettingsTable)
      .values({ userId, staleThresholdDays: 90 })
      .returning();
  }
  return settings;
}

function serialize(s: typeof userSettingsTable.$inferSelect) {
  return {
    ...s,
    onboardingCompletedAt: s.onboardingCompletedAt ? s.onboardingCompletedAt.toISOString() : null,
    trialEndsAt: s.trialEndsAt ? s.trialEndsAt.toISOString() : null,
    currentPeriodEndsAt: s.currentPeriodEndsAt ? s.currentPeriodEndsAt.toISOString() : null,
  };
}

router.get("/settings", async (req, res): Promise<void> => {
  const userId = requireUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  try {
    const settings = await loadOrCreate(userId);
    res.json(GetSettingsResponse.parse(serialize(settings)));
  } catch (err) {
    req.log.error({ err }, "Error fetching settings");
    res.status(500).json({ error: "Failed to load settings." });
  }
});

router.patch("/settings", async (req, res): Promise<void> => {
  const userId = requireUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const existing = await loadOrCreate(userId);
    const updateData: Record<string, unknown> = {};
    const fields = [
      "staleThresholdDays",
      "namingPattern",
      "namingPatternDescription",
      "displayName",
      "defaultTaggingMode",
      "themePreference",
      "emailNotifications",
    ] as const;
    for (const f of fields) {
      if (parsed.data[f] !== undefined) {
        updateData[f] = parsed.data[f];
      }
    }

    const [settings] = await db
      .update(userSettingsTable)
      .set(updateData)
      .where(eq(userSettingsTable.id, existing.id))
      .returning();

    res.json(UpdateSettingsResponse.parse(serialize(settings)));
  } catch (err) {
    req.log.error({ err }, "Error updating settings");
    res.status(500).json({ error: "Failed to update settings." });
  }
});

router.post("/onboarding/complete", async (req, res): Promise<void> => {
  const userId = requireUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const parsed = CompleteOnboardingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const existing = await loadOrCreate(userId);
    const [settings] = await db
      .update(userSettingsTable)
      .set({
        displayName: parsed.data.displayName,
        staleThresholdDays: parsed.data.staleThresholdDays,
        defaultTaggingMode: parsed.data.defaultTaggingMode,
        themePreference: parsed.data.themePreference,
        emailNotifications: parsed.data.emailNotifications,
        onboardingCompletedAt: new Date(),
      })
      .where(eq(userSettingsTable.id, existing.id))
      .returning();

    res.json(CompleteOnboardingResponse.parse(serialize(settings)));
  } catch (err) {
    req.log.error({ err }, "Error completing onboarding");
    res.status(500).json({ error: "Failed to complete onboarding." });
  }
});

router.post("/settings/clear-cache", async (req, res): Promise<void> => {
  const userId = requireUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  try {
    await db.delete(cachedScansTable).where(eq(cachedScansTable.userId, userId));
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Error clearing cache");
    res.status(500).json({ error: "Failed to clear cache." });
  }
});

export default router;
