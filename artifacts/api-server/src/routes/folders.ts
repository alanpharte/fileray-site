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

const CACHE_TTL = 5 * 60 * 1000;
const folderTreeCacheByUser = new Map<number, { data: unknown; expiresAt: number }>();
const pendingFetchByUser = new Map<number, Promise<unknown>>();

function pruneFolderTreeCache(now: number): void {
  for (const [userId, entry] of folderTreeCacheByUser) {
    if (entry.expiresAt <= now) folderTreeCacheByUser.delete(userId);
  }
}

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
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  try {
    const now = Date.now();
    pruneFolderTreeCache(now);

    const cached = folderTreeCacheByUser.get(userId);
    if (cached && now < cached.expiresAt) {
      res.json(cached.data);
      return;
    }

    let pending = pendingFetchByUser.get(userId);
    if (!pending) {
      pending = drive.getFolderTree().then(result => {
        const parsed = GetFolderTreeResponse.parse(result);
        folderTreeCacheByUser.set(userId, { data: parsed, expiresAt: Date.now() + CACHE_TTL });
        pendingFetchByUser.delete(userId);
        return parsed;
      }).catch(err => {
        pendingFetchByUser.delete(userId);
        throw err;
      });
      pendingFetchByUser.set(userId, pending);
    }

    const result = await pending;
    res.json(result);
  } catch (err) {
    handleDriveError(req, res, err);
  }
});

export default router;
