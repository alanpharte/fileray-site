import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, userSettingsTable } from "@workspace/db";
import {
  FindDuplicatesResponse,
  FindUnnamedFilesResponse,
  FindOrphanFilesResponse,
  CheckNamingConventionsResponse,
} from "@workspace/api-zod";
import * as drive from "../lib/googleDrive";
import { DriveApiError } from "../lib/googleDrive";

const router: IRouter = Router();

router.get("/organiser/duplicates", async (req, res): Promise<void> => {
  try {
    const result = await drive.findDuplicates();
    res.json(FindDuplicatesResponse.parse(result));
  } catch (err) {
    if (err instanceof DriveApiError) {
      req.log.error({ err }, "Drive API error finding duplicates");
      res.status(err.status).json({ error: "Could not scan for duplicates." });
      return;
    }
    req.log.error({ err }, "Error finding duplicates");
    res.status(500).json({ error: "Failed to scan for duplicates." });
  }
});

router.get("/organiser/unnamed", async (req, res): Promise<void> => {
  try {
    const result = await drive.findUnnamedFiles();
    res.json(FindUnnamedFilesResponse.parse(result));
  } catch (err) {
    if (err instanceof DriveApiError) {
      req.log.error({ err }, "Drive API error finding unnamed files");
      res.status(err.status).json({ error: "Could not scan for unnamed files." });
      return;
    }
    req.log.error({ err }, "Error finding unnamed files");
    res.status(500).json({ error: "Failed to scan for unnamed files." });
  }
});

router.get("/organiser/orphans", async (req, res): Promise<void> => {
  try {
    const result = await drive.findOrphanFiles();
    res.json(FindOrphanFilesResponse.parse(result));
  } catch (err) {
    if (err instanceof DriveApiError) {
      req.log.error({ err }, "Drive API error finding orphan files");
      res.status(err.status).json({ error: "Could not scan for orphan files." });
      return;
    }
    req.log.error({ err }, "Error finding orphan files");
    res.status(500).json({ error: "Failed to scan for orphan files." });
  }
});

router.get("/organiser/naming-check", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  try {
    const [settings] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .limit(1);
    const pattern = settings?.namingPattern || null;

    const result = await drive.checkNamingConventions(pattern);
    res.json(CheckNamingConventionsResponse.parse(result));
  } catch (err) {
    if (err instanceof DriveApiError) {
      req.log.error({ err }, "Drive API error checking naming");
      res.status(err.status).json({ error: "Could not check naming conventions." });
      return;
    }
    req.log.error({ err }, "Error checking naming conventions");
    res.status(500).json({ error: "Failed to check naming conventions." });
  }
});

export default router;
