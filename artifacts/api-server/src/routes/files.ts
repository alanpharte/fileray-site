import { Router, type IRouter } from "express";
import {
  SearchFilesQueryParams,
  SearchFilesResponse,
  GetFileDetailsParams,
  GetFileDetailsResponse,
  GetFilePathParams,
  GetFilePathResponse,
  GetFilePermissionsParams,
  GetFilePermissionsResponse,
  GetFilePreviewUrlParams,
  GetFilePreviewUrlResponse,
  ExportPermissionsCsvParams,
  UpdateFilePermissionParams,
  UpdateFilePermissionBody,
  UpdateFilePermissionResponse,
  SmartSearchFilesBody,
  SmartSearchFilesResponse,
  GetStarredFilesQueryParams,
  GetStarredFilesResponse,
} from "@workspace/api-zod";
import archiver from "archiver";
import { Readable } from "node:stream";
import * as drive from "../lib/googleDrive";
import { DriveApiError } from "../lib/googleDrive";

const router: IRouter = Router();

router.patch("/files/:fileId/star", async (req, res): Promise<void> => {
  const fileId = String(req.params.fileId || "");
  if (!fileId) {
    res.status(400).json({ error: "fileId is required" });
    return;
  }
  const starred = req.body?.starred;
  if (typeof starred !== "boolean") {
    res.status(400).json({ error: "Body must include `starred: boolean`." });
    return;
  }
  try {
    const result = await drive.toggleFileStar(fileId, starred);
    res.json(result);
  } catch (err) {
    if (err instanceof DriveApiError) {
      req.log.error({ status: err.status }, "Drive star toggle failed");
      res.status(err.status >= 500 ? 502 : err.status).json({ error: err.message });
      return;
    }
    req.log.error(err, "Star toggle error");
    res.status(500).json({ error: "Could not update starred state." });
  }
});

router.get("/files/starred", async (req, res): Promise<void> => {
  const parsed = GetStarredFilesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await drive.getStarredFiles({ pageSize: parsed.data.pageSize });
    res.json(GetStarredFilesResponse.parse(result));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.get("/files/search", async (req, res): Promise<void> => {
  const parsed = SearchFilesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await drive.searchFiles(parsed.data);
    res.json(SearchFilesResponse.parse(result));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.post("/files/smart-search", async (req, res): Promise<void> => {
  const parsed = SmartSearchFilesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!parsed.data.description?.trim()) {
    res.status(400).json({ error: "Description is required" });
    return;
  }

  const fileTypes = parsed.data.fileTypes?.slice(0, 10);

  try {
    const result = await drive.smartSearchFiles({
      description: parsed.data.description.trim(),
      fileTypes,
    });
    res.json(SmartSearchFilesResponse.parse(result));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.get("/files/:fileId", async (req, res): Promise<void> => {
  const params = GetFileDetailsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const file = await drive.getFileDetails(params.data.fileId);
    res.json(GetFileDetailsResponse.parse(file));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.get("/files/:fileId/path", async (req, res): Promise<void> => {
  const params = GetFilePathParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const result = await drive.getFilePath(params.data.fileId);
    res.json(GetFilePathResponse.parse(result));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.get("/files/:fileId/permissions", async (req, res): Promise<void> => {
  const params = GetFilePermissionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const result = await drive.getFilePermissions(params.data.fileId);
    res.json(GetFilePermissionsResponse.parse(result));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.patch("/files/:fileId/permissions/:permissionId", async (req, res): Promise<void> => {
  const params = UpdateFilePermissionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateFilePermissionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    const result = await drive.updateFilePermission(
      params.data.fileId,
      params.data.permissionId,
      body.data.role
    );
    res.json(UpdateFilePermissionResponse.parse(result));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.get("/files/:fileId/preview-url", async (req, res): Promise<void> => {
  const params = GetFilePreviewUrlParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const result = await drive.getFilePreviewUrl(params.data.fileId);
    res.json(GetFilePreviewUrlResponse.parse(result));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.get("/files/:fileId/export-csv", async (req, res): Promise<void> => {
  const params = ExportPermissionsCsvParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const permissions = await drive.getFilePermissions(params.data.fileId);
    const csvLines = ["Name,Email,Role,Access Origin,Granted Date"];
    for (const person of permissions.people) {
      csvLines.push(`"${person.displayName}","${person.emailAddress || ""}","${person.role}","${person.accessOrigin}","${person.grantedDate || ""}"`);
    }
    csvLines.push("");
    csvLines.push(`Link Sharing,${permissions.linkSharing.enabled ? "Enabled" : "Disabled"},${permissions.linkSharing.role || "N/A"},${permissions.linkSharing.domain || "N/A"}`);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${permissions.fileName}_permissions.csv"`);
    res.send(csvLines.join("\n"));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.get("/files/:fileId/download", async (req, res): Promise<void> => {
  const { fileId } = req.params;
  if (!fileId) {
    res.status(400).json({ error: "fileId is required" });
    return;
  }

  try {
    const result = await drive.downloadFile(fileId);
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(sanitizeFileName(result.fileName))}"`);
    if (result.contentLength) {
      res.setHeader("Content-Length", result.contentLength);
    }
    const nodeStream = Readable.fromWeb(result.stream as any);
    nodeStream.on("error", (streamErr) => {
      req.log.error({ err: streamErr }, "Stream error during download");
      if (!res.headersSent) {
        res.status(500).json({ error: "Download stream failed" });
      } else {
        res.end();
      }
    });
    nodeStream.pipe(res);
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.post("/files/download-bulk", async (req, res): Promise<void> => {
  const { fileIds } = req.body;
  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    res.status(400).json({ error: "fileIds array is required" });
    return;
  }

  if (fileIds.length > 50) {
    res.status(400).json({ error: "Maximum 50 files per download" });
    return;
  }

  try {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="Fileray_download_${Date.now()}.zip"`);

    const archive = archiver("zip", { zlib: { level: 5 } });

    archive.on("error", (archiveErr) => {
      req.log.error({ err: archiveErr }, "Archive error during bulk download");
      if (!res.headersSent) {
        res.status(500).json({ error: "ZIP creation failed" });
      } else {
        res.end();
      }
    });

    archive.pipe(res);

    const seenNames = new Set<string>();
    let skippedCount = 0;
    for (const fileId of fileIds) {
      try {
        const result = await drive.downloadFile(fileId);
        let baseName = sanitizeFileName(result.fileName);
        let name = baseName;
        let counter = 1;
        const dotIndex = baseName.lastIndexOf(".");
        const stem = dotIndex > 0 ? baseName.slice(0, dotIndex) : baseName;
        const ext = dotIndex > 0 ? baseName.slice(dotIndex) : "";
        while (seenNames.has(name)) {
          name = `${stem} (${counter})${ext}`;
          counter++;
        }
        seenNames.add(name);
        const nodeStream = Readable.fromWeb(result.stream as any);
        archive.append(nodeStream, { name });
      } catch (fileErr) {
        skippedCount++;
        req.log.warn({ fileId, err: fileErr }, "Skipping file in bulk download");
      }
    }

    if (skippedCount > 0 && skippedCount === fileIds.length) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Could not download any of the selected files" });
        return;
      }
    }

    await archive.finalize();
  } catch (err) {
    if (!res.headersSent) {
      handleDriveError(req, res, err);
    }
  }
});

function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .slice(0, 200) || "download";
}

function handleDriveError(req: any, res: any, err: unknown) {
  if (err instanceof DriveApiError) {
    if (err.status === 401) {
      res.status(401).json({ error: "Your session has expired. Please reconnect your Google Drive." });
      return;
    }
    if (err.status === 403) {
      res.status(403).json({ error: "You don't have permission to access this file. Check that the correct Google account is connected." });
      return;
    }
    if (err.status === 404) {
      res.status(404).json({ error: "This file no longer exists or has been moved." });
      return;
    }
    if (err.status === 429) {
      res.status(429).json({ error: "Google's API rate limit has been reached. Please wait a moment and try again." });
      return;
    }
  }
  req.log.error({ err }, "Drive API error");
  res.status(500).json({ error: "Could not reach Google Drive. Please check your connection and try again." });
}

export default router;
