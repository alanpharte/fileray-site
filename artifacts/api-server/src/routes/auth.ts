import { Router, type IRouter } from "express";
import { GetAuthStatusResponse, GetAuthUserResponse } from "@workspace/api-zod";
import * as drive from "../lib/googleDrive";

const router: IRouter = Router();

router.get("/auth/status", async (req, res): Promise<void> => {
  try {
    const about = await drive.getAboutInfo();
    const user = about.user || {};
    res.json(GetAuthStatusResponse.parse({
      connected: true,
      email: user.emailAddress || null,
      displayName: user.displayName || null,
      photoUrl: user.photoLink || null,
    }));
  } catch (err) {
    req.log.warn({ err }, "Google Drive not connected");
    res.json(GetAuthStatusResponse.parse({
      connected: false,
      email: null,
      displayName: null,
      photoUrl: null,
    }));
  }
});

router.get("/auth/user", async (req, res): Promise<void> => {
  try {
    const about = await drive.getAboutInfo();
    const user = about.user || {};
    const storageQuota = about.storageQuota || {};
    res.json(GetAuthUserResponse.parse({
      email: user.emailAddress || "",
      displayName: user.displayName || "",
      photoUrl: user.photoLink || null,
      storageUsed: storageQuota.usage ? formatBytes(Number(storageQuota.usage)) : null,
      storageLimit: storageQuota.limit ? formatBytes(Number(storageQuota.limit)) : null,
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to get user info");
    res.status(401).json({ error: "Not connected to Google Drive" });
  }
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default router;
