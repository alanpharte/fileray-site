import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userSettingsTable, cachedScansTable } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/settings", async (req, res): Promise<void> => {
  try {
    let [settings] = await db.select().from(userSettingsTable).limit(1);

    if (!settings) {
      [settings] = await db.insert(userSettingsTable).values({
        staleThresholdDays: 90,
      }).returning();
    }

    res.json(GetSettingsResponse.parse(settings));
  } catch (err) {
    req.log.error({ err }, "Error fetching settings");
    res.status(500).json({ error: "Failed to load settings." });
  }
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    let [settings] = await db.select().from(userSettingsTable).limit(1);

    if (!settings) {
      [settings] = await db.insert(userSettingsTable).values({
        staleThresholdDays: parsed.data.staleThresholdDays ?? 90,
        namingPattern: parsed.data.namingPattern ?? null,
        namingPatternDescription: parsed.data.namingPatternDescription ?? null,
      }).returning();
    } else {
      const updateData: Record<string, any> = {};
      if (parsed.data.staleThresholdDays !== undefined) {
        updateData.staleThresholdDays = parsed.data.staleThresholdDays;
      }
      if (parsed.data.namingPattern !== undefined) {
        updateData.namingPattern = parsed.data.namingPattern;
      }
      if (parsed.data.namingPatternDescription !== undefined) {
        updateData.namingPatternDescription = parsed.data.namingPatternDescription;
      }

      [settings] = await db.update(userSettingsTable)
        .set(updateData)
        .where(eq(userSettingsTable.id, settings.id))
        .returning();
    }

    res.json(UpdateSettingsResponse.parse(settings));
  } catch (err) {
    req.log.error({ err }, "Error updating settings");
    res.status(500).json({ error: "Failed to update settings." });
  }
});

router.post("/settings/clear-cache", async (req, res): Promise<void> => {
  try {
    await db.delete(cachedScansTable);
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Error clearing cache");
    res.status(500).json({ error: "Failed to clear cache." });
  }
});

export default router;
