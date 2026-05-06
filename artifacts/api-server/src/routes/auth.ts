import { Router, type IRouter } from "express";
import { GetAuthStatusResponse, GetAuthUserResponse } from "@workspace/api-zod";
import * as drive from "../lib/googleDrive";
import { loadUserById } from "../lib/googleOAuth";

const router: IRouter = Router();

router.get("/auth/status", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.json(GetAuthStatusResponse.parse({
      connected: false,
      email: null,
      displayName: null,
      photoUrl: null,
    }));
    return;
  }

  try {
    const user = await loadUserById(userId);
    if (!user) {
      req.session.destroy(() => undefined);
      res.json(GetAuthStatusResponse.parse({
        connected: false,
        email: null,
        displayName: null,
        photoUrl: null,
      }));
      return;
    }
    res.json(GetAuthStatusResponse.parse({
      connected: true,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
    }));
  } catch (err) {
    req.log.warn({ err }, "Failed to load auth status");
    res.json(GetAuthStatusResponse.parse({
      connected: false,
      email: null,
      displayName: null,
      photoUrl: null,
    }));
  }
});

router.get("/auth/user", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  const user = await loadUserById(userId);
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  let storageUsed: string | null = null;
  let storageLimit: string | null = null;
  try {
    const about = await drive.getAboutInfo();
    const storageQuota = about.storageQuota || {};
    storageUsed = storageQuota.usage ? formatBytes(Number(storageQuota.usage)) : null;
    storageLimit = storageQuota.limit ? formatBytes(Number(storageQuota.limit)) : null;
  } catch (err: any) {
    if (err?.status === 429) {
      req.log.warn({ err }, "Rate limited fetching user info");
      res.status(429).json({ error: "Rate limited. Please try again shortly." });
      return;
    }
    req.log.warn({ err }, "Could not fetch Drive storage info");
  }

  res.json(GetAuthUserResponse.parse({
    email: user.email,
    displayName: user.displayName ?? "",
    photoUrl: user.photoUrl,
    storageUsed,
    storageLimit,
  }));
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default router;
