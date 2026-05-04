import { Router, type IRouter } from "express";
import {
  GetSharedFilesQueryParams,
  GetSharedFilesResponse,
} from "@workspace/api-zod";
import * as drive from "../lib/googleDrive";
import { DriveApiError } from "../lib/googleDrive";

const router: IRouter = Router();

router.get("/shared-files", async (req, res): Promise<void> => {
  const parsed = GetSharedFilesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await drive.getSharedFiles(parsed.data);
    res.json(GetSharedFilesResponse.parse(result));
  } catch (err) {
    if (err instanceof DriveApiError) {
      req.log.error({ err }, "Drive API error fetching shared files");
      res.status(err.status).json({ error: "Could not load shared files from Google Drive." });
      return;
    }
    req.log.error({ err }, "Error fetching shared files");
    res.status(500).json({ error: "Failed to load shared files." });
  }
});

export default router;
