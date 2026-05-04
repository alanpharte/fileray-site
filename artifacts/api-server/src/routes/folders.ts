import { Router, type IRouter } from "express";
import { GetFolderTreeResponse, ListFolderFilesParams, ListFolderFilesQueryParams, ListFolderFilesResponse } from "@workspace/api-zod";
import * as drive from "../lib/googleDrive";
import { DriveApiError } from "../lib/googleDrive";
const router: IRouter = Router();

function handleDriveError(req: any, res: any, err: unknown) {
  if (err instanceof DriveApiError) {
    req.log.error({ status: err.status, path: err.path }, err.message);
    res.status(err.status >= 500 ? 502 : err.status).json({ error: err.message });
  } else {
    req.log.error(err, "Unexpected error");
    res.status(500).json({ error: "Internal server error" });
  }
}

let folderTreeCache: { data: unknown; expiresAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;
let pendingFetch: Promise<unknown> | null = null;

router.get("/folders/:folderId/files", async (req, res): Promise<void> => {
  const parsedParams = ListFolderFilesParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.message });
    return;
  }

  const parsedQuery = ListFolderFilesQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  try {
    const result = await drive.listFolderFiles({
      folderId: parsedParams.data.folderId,
      search: parsedQuery.data.search,
      pageToken: parsedQuery.data.pageToken,
      pageSize: parsedQuery.data.pageSize,
    });
    res.json(ListFolderFilesResponse.parse(result));
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

router.get("/folders/tree", async (req, res): Promise<void> => {
  try {
    if (folderTreeCache && Date.now() < folderTreeCache.expiresAt) {
      res.json(folderTreeCache.data);
      return;
    }

    if (!pendingFetch) {
      pendingFetch = drive.getFolderTree().then(result => {
        const parsed = GetFolderTreeResponse.parse(result);
        folderTreeCache = { data: parsed, expiresAt: Date.now() + CACHE_TTL };
        pendingFetch = null;
        return parsed;
      }).catch(err => {
        pendingFetch = null;
        throw err;
      });
    }

    const result = await pendingFetch;
    res.json(result);
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

export default router;
