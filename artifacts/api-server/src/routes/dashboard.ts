import { Router, type IRouter } from "express";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityQueryParams,
  GetRecentActivityResponse,
  GetStorageBreakdownResponse,
  GetSharingOverviewResponse,
} from "@workspace/api-zod";
import * as drive from "../lib/googleDrive";
import { DriveApiError } from "../lib/googleDrive";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  try {
    const result = await drive.getDashboardSummary();
    res.json(GetDashboardSummaryResponse.parse(result));
  } catch (err) {
    if (err instanceof DriveApiError) {
      req.log.error({ err }, "Drive API error fetching dashboard summary");
      res.status(err.status).json({ error: "Could not load dashboard data." });
      return;
    }
    req.log.error({ err }, "Error fetching dashboard summary");
    res.status(500).json({ error: "Failed to load dashboard data." });
  }
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await drive.getRecentActivity(parsed.data.limit);
    res.json(GetRecentActivityResponse.parse(result));
  } catch (err) {
    if (err instanceof DriveApiError) {
      req.log.error({ err }, "Drive API error fetching recent activity");
      res.status(err.status).json({ error: "Could not load recent activity." });
      return;
    }
    req.log.error({ err }, "Error fetching recent activity");
    res.status(500).json({ error: "Failed to load recent activity." });
  }
});

router.get("/dashboard/storage-breakdown", async (req, res): Promise<void> => {
  try {
    const result = await drive.getStorageBreakdown();
    res.json(GetStorageBreakdownResponse.parse(result));
  } catch (err) {
    if (err instanceof DriveApiError) {
      req.log.error({ err }, "Drive API error fetching storage breakdown");
      res.status(err.status).json({ error: "Could not load storage data." });
      return;
    }
    req.log.error({ err }, "Error fetching storage breakdown");
    res.status(500).json({ error: "Failed to load storage data." });
  }
});

router.get("/dashboard/sharing-overview", async (req, res): Promise<void> => {
  try {
    const result = await drive.getSharingOverview();
    res.json(GetSharingOverviewResponse.parse(result));
  } catch (err) {
    if (err instanceof DriveApiError) {
      req.log.error({ err }, "Drive API error fetching sharing overview");
      res.status(err.status).json({ error: "Could not load sharing overview." });
      return;
    }
    req.log.error({ err }, "Error fetching sharing overview");
    res.status(500).json({ error: "Failed to load sharing overview." });
  }
});

export default router;
