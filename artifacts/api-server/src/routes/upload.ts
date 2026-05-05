import { Router, type IRouter } from "express";
import multer from "multer";
import {
  CreateFolderBody,
  CreateFolderResponse,
  AutoTagFileBody,
  AutoTagFileResponse,
} from "@workspace/api-zod";
import * as drive from "../lib/googleDrive";
import { DriveApiError } from "../lib/googleDrive";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

function handleDriveError(req: any, res: any, err: unknown) {
  if (err instanceof DriveApiError) {
    req.log.error({ status: err.status, path: err.path }, err.message);
    res.status(err.status >= 500 ? 502 : err.status).json({ error: err.message });
  } else {
    req.log.error(err, "Unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
}

router.post("/folders", async (req, res): Promise<void> => {
  const parsed = CreateFolderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await drive.createFolder({
      name: parsed.data.name.trim(),
      parentId: parsed.data.parentId ?? null,
    });
    res.json(CreateFolderResponse.parse(result));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.post("/files/auto-tag", async (req, res): Promise<void> => {
  const parsed = AutoTagFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await drive.autoTagFile({
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      base64Data: parsed.data.base64Data ?? null,
    });
    res.json(AutoTagFileResponse.parse(result));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

function uploadMiddleware(req: any, res: any, next: any) {
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "File is too large. Maximum upload size is 100 MB." });
        return;
      }
      req.log.error(err, "Multer upload error");
      res.status(400).json({ error: err.message || "Upload parsing failed" });
      return;
    }
    next();
  });
}

router.post("/files/upload", uploadMiddleware, async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  const name = String(req.body.name || req.file.originalname || "untitled").trim();
  if (!name) {
    res.status(400).json({ error: "File name is required" });
    return;
  }

  const parentId = req.body.parentId && req.body.parentId !== "root" ? String(req.body.parentId) : null;

  let tags: string[] = [];
  if (req.body.tags) {
    try {
      const raw = typeof req.body.tags === "string" ? JSON.parse(req.body.tags) : req.body.tags;
      if (Array.isArray(raw)) {
        tags = raw
          .filter((t: unknown): t is string => typeof t === "string")
          .map((t: string) => t.trim().toLowerCase().slice(0, 50))
          .filter((t: string) => t.length > 0)
          .slice(0, 20);
      }
    } catch {
      tags = [];
    }
  }

  try {
    const result = await drive.uploadFile({
      name,
      mimeType: req.file.mimetype,
      parentId,
      buffer: req.file.buffer,
      tags,
    });
    res.json(result);
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

export default router;
