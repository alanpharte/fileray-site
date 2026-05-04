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
} from "@workspace/api-zod";
import * as drive from "../lib/googleDrive";
import { DriveApiError } from "../lib/googleDrive";

const router: IRouter = Router();

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
