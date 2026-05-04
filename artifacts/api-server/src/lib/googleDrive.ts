import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

const connectors = new ReplitConnectors();

async function driveRequest(path: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}, retries = 2): Promise<any> {
  const response = await connectors.proxy("google-drive", path, {
    method: "GET",
    ...options,
  });
  if (!response.ok) {
    if (response.status === 429 && retries > 0) {
      const retryAfter = Number(response.headers.get("Retry-After") || "2");
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return driveRequest(path, options, retries - 1);
    }
    const errorText = await response.text();
    logger.error({ status: response.status, path, error: errorText }, "Google Drive API error");
    throw new DriveApiError(response.status, errorText, path);
  }
  return response.json();
}

export class DriveApiError extends Error {
  constructor(public status: number, public body: string, public path: string) {
    super(`Drive API error ${status} on ${path}: ${body}`);
    this.name = "DriveApiError";
  }
}

const FILE_FIELDS = "id,name,mimeType,iconLink,thumbnailLink,webViewLink,size,modifiedTime,createdTime,owners(displayName,emailAddress,photoLink),lastModifyingUser(displayName,emailAddress,photoLink),parents,shared,sharingUser(displayName,emailAddress,photoLink),permissions(id,displayName,emailAddress,photoLink,role,type,domain,expirationTime)";

export async function searchFiles(params: {
  q?: string;
  fileType?: string;
  owner?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  location?: string;
  sortBy?: string;
  pageToken?: string;
  pageSize?: number;
}) {
  const queryParts: string[] = [];

  if (params.q) {
    queryParts.push(`fullText contains '${params.q.replace(/'/g, "\\'")}'`);
  }

  if (params.fileType) {
    const mimeMap: Record<string, string> = {
      document: "application/vnd.google-apps.document",
      spreadsheet: "application/vnd.google-apps.spreadsheet",
      presentation: "application/vnd.google-apps.presentation",
      pdf: "application/pdf",
      image: "image/",
      folder: "application/vnd.google-apps.folder",
    };
    const mime = mimeMap[params.fileType];
    if (mime) {
      if (params.fileType === "image") {
        queryParts.push(`mimeType contains 'image/'`);
      } else {
        queryParts.push(`mimeType = '${mime}'`);
      }
    }
  }

  if (params.owner) {
    queryParts.push(`'${params.owner.replace(/'/g, "\\'")}' in owners`);
  }

  if (params.modifiedAfter) {
    queryParts.push(`modifiedTime > '${params.modifiedAfter}'`);
  }

  if (params.modifiedBefore) {
    queryParts.push(`modifiedTime < '${params.modifiedBefore}'`);
  }

  queryParts.push("trashed = false");

  const query = queryParts.join(" and ");

  let orderBy = "modifiedTime desc";
  if (params.sortBy === "name") {
    orderBy = "name";
  } else if (params.sortBy === "modifiedTime") {
    orderBy = "modifiedTime desc";
  }

  const searchParams = new URLSearchParams({
    q: query,
    fields: `nextPageToken,files(${FILE_FIELDS})`,
    pageSize: String(params.pageSize || 20),
    orderBy,
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  if (params.pageToken) {
    searchParams.set("pageToken", params.pageToken);
  }

  if (params.location === "sharedWithMe") {
    const existingQ = searchParams.get("q") || "";
    searchParams.set("q", existingQ ? `${existingQ} and sharedWithMe = true` : "sharedWithMe = true");
  }

  const data = await driveRequest(`/drive/v3/files?${searchParams.toString()}`);

  const files = (data.files || []).map((f: any) => enrichFile(f));

  await resolveBreadcrumbs(files);

  return {
    files,
    nextPageToken: data.nextPageToken || null,
    totalCount: null,
  };
}

export async function getFileDetails(fileId: string) {
  const params = new URLSearchParams({
    fields: FILE_FIELDS,
    supportsAllDrives: "true",
  });
  const data = await driveRequest(`/drive/v3/files/${fileId}?${params.toString()}`);
  return enrichFile(data);
}

export async function getFilePath(fileId: string) {
  const file = await getFileDetails(fileId);
  const breadcrumbs: Array<{ id: string; name: string }> = [];

  let currentId = file.parents?.[0];
  let depth = 0;
  while (currentId && depth < 10) {
    try {
      const parent = await driveRequest(`/drive/v3/files/${currentId}?fields=id,name,parents&supportsAllDrives=true`);
      breadcrumbs.unshift({ id: parent.id, name: parent.name });
      currentId = parent.parents?.[0];
      depth++;
    } catch {
      break;
    }
  }

  return {
    fileId,
    fileName: file.name,
    breadcrumbs,
  };
}

export async function getFilePermissions(fileId: string) {
  const params = new URLSearchParams({
    fields: "name,permissions(id,displayName,emailAddress,photoLink,role,type,domain,expirationTime)",
    supportsAllDrives: "true",
  });
  const data = await driveRequest(`/drive/v3/files/${fileId}?${params.toString()}`);

  const permissions = data.permissions || [];
  const people = permissions
    .filter((p: any) => p.type === "user" || p.type === "group")
    .map((p: any) => ({
      id: p.id,
      displayName: p.displayName || p.emailAddress || "Unknown",
      emailAddress: p.emailAddress || null,
      photoLink: p.photoLink || null,
      role: p.role,
      accessOrigin: p.type === "group" ? "Group membership" : "Direct share",
      grantedDate: null,
    }));

  const anyonePermission = permissions.find((p: any) => p.type === "anyone");
  const domainPermission = permissions.find((p: any) => p.type === "domain");

  let alertLevel: "green" | "amber" | "red" = "green";
  let alertMessage = "Restricted - only named people can access";

  if (anyonePermission) {
    alertLevel = "red";
    alertMessage = "Public - anyone on the internet can access this";
  } else if (domainPermission) {
    alertLevel = "amber";
    alertMessage = `Link sharing is on - anyone with the link can ${domainPermission.role || "view"}`;
  }

  const linkPermission = anyonePermission || domainPermission;

  return {
    fileId,
    fileName: data.name,
    summary: `This file is visible to ${people.length} specific ${people.length === 1 ? "person" : "people"}${linkPermission ? " and anyone with the link can " + (linkPermission.role || "view") + " it" : ""}.`,
    alertLevel,
    alertMessage,
    people,
    linkSharing: {
      enabled: !!linkPermission,
      role: linkPermission?.role || null,
      domain: domainPermission?.domain || null,
      allowEditorsToReshare: true,
    },
  };
}

export async function updateFilePermission(fileId: string, permissionId: string, role: string) {
  const validRoles = ["owner", "writer", "commenter", "reader"];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(", ")}`);
  }

  const body: Record<string, any> = { role };
  const transferOwnership = role === "owner";

  const params = new URLSearchParams({
    supportsAllDrives: "true",
  });
  if (transferOwnership) {
    params.set("transferOwnership", "true");
  }

  const result = await driveRequest(
    `/drive/v3/files/${fileId}/permissions/${permissionId}?${params.toString()}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  return {
    id: result.id,
    role: result.role,
    displayName: result.displayName || null,
    emailAddress: result.emailAddress || null,
  };
}

export async function getFilePreviewUrl(fileId: string) {
  const file = await getFileDetails(fileId);
  const mimeType = file.mimeType;

  const googleDocTypes = [
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.spreadsheet",
    "application/vnd.google-apps.presentation",
    "application/vnd.google-apps.drawing",
  ];

  if (googleDocTypes.includes(mimeType)) {
    return {
      fileId,
      previewType: "google" as const,
      url: `https://drive.google.com/file/d/${fileId}/preview`,
      downloadUrl: file.webViewLink || null,
      mimeType,
      fileName: file.name,
      message: null,
    };
  }

  if (mimeType === "application/pdf") {
    return {
      fileId,
      previewType: "pdf" as const,
      url: `https://drive.google.com/file/d/${fileId}/preview`,
      downloadUrl: null,
      mimeType,
      fileName: file.name,
      message: null,
    };
  }

  if (mimeType.startsWith("image/")) {
    return {
      fileId,
      previewType: "image" as const,
      url: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
      downloadUrl: null,
      mimeType,
      fileName: file.name,
      message: null,
    };
  }

  return {
    fileId,
    previewType: "unsupported" as const,
    url: null,
    downloadUrl: file.webViewLink || null,
    mimeType,
    fileName: file.name,
    message: `Preview is not available for ${mimeType} files. You can open this file directly in Google Drive.`,
  };
}

export async function getSharedFiles(params: {
  groupBy?: string;
  staleOnly?: boolean;
  search?: string;
  pageToken?: string;
  pageSize?: number;
}) {
  const queryParts = ["sharedWithMe = true", "trashed = false"];

  if (params.search) {
    queryParts.push(`fullText contains '${params.search.replace(/'/g, "\\'")}'`);
  }

  const searchParams = new URLSearchParams({
    q: queryParts.join(" and "),
    fields: `nextPageToken,files(${FILE_FIELDS})`,
    pageSize: String(params.pageSize || 50),
    orderBy: "sharedWithMeTime desc",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  if (params.pageToken) {
    searchParams.set("pageToken", params.pageToken);
  }

  const data = await driveRequest(`/drive/v3/files?${searchParams.toString()}`);
  let files = (data.files || []).map((f: any) => enrichFile(f));

  if (params.staleOnly) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    files = files.filter((f: any) => new Date(f.modifiedTime) < ninetyDaysAgo);
  }

  const groupBy = params.groupBy || "person";
  const groups = groupFiles(files, groupBy);

  return {
    groups,
    nextPageToken: data.nextPageToken || null,
  };
}

export async function getAboutInfo() {
  const data = await driveRequest("/drive/v3/about?fields=user(displayName,emailAddress,photoLink),storageQuota(usage,limit)");
  return data;
}

async function countDriveFiles(query: string): Promise<number> {
  let total = 0;
  let pageToken: string | undefined;
  const maxPages = 3;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      q: query,
      fields: "nextPageToken,files(id)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);

    try {
      const data = await driveRequest(`/drive/v3/files?${params.toString()}`);
      total += data.files?.length || 0;
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    } catch {
      break;
    }
  }
  return total;
}

export async function getDashboardSummary() {
  const [about, totalFiles, sharedWithMe, recentlyModified] = await Promise.allSettled([
    getAboutInfo(),
    countDriveFiles("trashed = false"),
    countDriveFiles("sharedWithMe = true and trashed = false"),
    countDriveFiles("modifiedTime > '" + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() + "' and trashed = false"),
  ]);

  const aboutData = about.status === "fulfilled" ? about.value : { storageQuota: {} };
  const storageQuota = aboutData.storageQuota || {};

  return {
    totalFiles: totalFiles.status === "fulfilled" ? totalFiles.value : 0,
    sharedWithMeCount: sharedWithMe.status === "fulfilled" ? sharedWithMe.value : 0,
    sharedByMeCount: 0,
    recentlyModifiedCount: recentlyModified.status === "fulfilled" ? recentlyModified.value : 0,
    storageUsed: formatBytes(Number(storageQuota.usage || 0)),
    storageLimit: formatBytes(Number(storageQuota.limit || 0)),
    sharingRiskCount: 0,
    staleFileCount: 0,
  };
}

export async function getRecentActivity(limit: number = 10) {
  const params = new URLSearchParams({
    q: "trashed = false",
    fields: `files(${FILE_FIELDS})`,
    pageSize: String(limit),
    orderBy: "modifiedTime desc",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const data = await driveRequest(`/drive/v3/files?${params.toString()}`);
  return (data.files || []).map((f: any) => ({
    fileId: f.id,
    fileName: f.name,
    action: "modified",
    actorName: f.lastModifyingUser?.displayName || "Unknown",
    actorEmail: f.lastModifyingUser?.emailAddress || null,
    actorPhoto: f.lastModifyingUser?.photoLink || null,
    timestamp: f.modifiedTime,
    mimeType: f.mimeType,
  }));
}

export async function getStorageBreakdown() {
  const about = await getAboutInfo();
  const storageQuota = about.storageQuota || {};

  const categories = [
    { type: "document", label: "Documents", mime: "application/vnd.google-apps.document", color: "#4285F4" },
    { type: "spreadsheet", label: "Spreadsheets", mime: "application/vnd.google-apps.spreadsheet", color: "#34A853" },
    { type: "presentation", label: "Presentations", mime: "application/vnd.google-apps.presentation", color: "#FBBC04" },
    { type: "pdf", label: "PDFs", mime: "application/pdf", color: "#EA4335" },
    { type: "image", label: "Images", mime: "image/", color: "#9C27B0" },
    { type: "other", label: "Other", mime: "", color: "#9E9E9E" },
  ];

  const byType = categories.map(cat => ({
    type: cat.type,
    label: cat.label,
    size: "0 B",
    count: 0,
    color: cat.color,
  }));

  return {
    total: formatBytes(Number(storageQuota.usage || 0)),
    limit: formatBytes(Number(storageQuota.limit || 0)),
    byType,
  };
}

export async function getSharingOverview() {
  const params = new URLSearchParams({
    q: "trashed = false and 'me' in owners",
    fields: `files(${FILE_FIELDS})`,
    pageSize: "200",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const data = await driveRequest(`/drive/v3/files?${params.toString()}`);
  const files = (data.files || []).map((f: any) => enrichFile(f));

  let publicFiles = 0;
  let linkSharedFiles = 0;
  let restrictedFiles = 0;

  for (const file of files) {
    const perms = file.permissions || [];
    const hasAnyone = perms.some((p: any) => p.type === "anyone");
    const hasDomain = perms.some((p: any) => p.type === "domain");

    if (hasAnyone) {
      publicFiles++;
    } else if (hasDomain) {
      linkSharedFiles++;
    } else {
      restrictedFiles++;
    }
  }

  return {
    publicFiles,
    linkSharedFiles,
    restrictedFiles,
    topSharedFiles: files.filter((f: any) => f.shared).slice(0, 5),
  };
}

export async function findDuplicates() {
  const params = new URLSearchParams({
    q: "trashed = false",
    fields: `files(${FILE_FIELDS})`,
    pageSize: "500",
    orderBy: "name",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const data = await driveRequest(`/drive/v3/files?${params.toString()}`);
  const files = (data.files || []).map((f: any) => enrichFile(f));

  const nameMap = new Map<string, any[]>();
  for (const file of files) {
    const key = file.name.toLowerCase().trim();
    if (!nameMap.has(key)) {
      nameMap.set(key, []);
    }
    nameMap.get(key)!.push(file);
  }

  return Array.from(nameMap.entries())
    .filter(([, group]) => group.length > 1)
    .map(([name, groupFiles]) => ({
      name,
      files: groupFiles,
    }));
}

export async function findUnnamedFiles() {
  const patterns = ["Untitled", "Copy of", "Untitled document", "Untitled spreadsheet"];
  const queryParts = patterns.map(p => `name contains '${p}'`);
  const q = `(${queryParts.join(" or ")}) and trashed = false`;

  const params = new URLSearchParams({
    q,
    fields: `files(${FILE_FIELDS})`,
    pageSize: "100",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const data = await driveRequest(`/drive/v3/files?${params.toString()}`);
  return (data.files || []).map((f: any) => {
    const file = enrichFile(f);
    const dateStr = new Date(file.modifiedTime).toISOString().split("T")[0];
    const owner = file.owners?.[0]?.displayName || "Unknown";
    const typeLabel = getMimeLabel(file.mimeType);
    return {
      file,
      suggestedName: `${dateStr}_${owner}_${typeLabel}`.replace(/\s+/g, "_"),
    };
  });
}

export async function findOrphanFiles() {
  const params = new URLSearchParams({
    q: "'root' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'",
    fields: `files(${FILE_FIELDS})`,
    pageSize: "100",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const data = await driveRequest(`/drive/v3/files?${params.toString()}`);
  return (data.files || []).map((f: any) => {
    const file = enrichFile(f);
    const typeLabel = getMimeLabel(file.mimeType);
    return {
      file,
      suggestedFolder: typeLabel ? `${typeLabel}s` : null,
    };
  });
}

export async function checkNamingConventions(pattern: string | null) {
  if (!pattern) return [];

  const params = new URLSearchParams({
    q: "trashed = false and mimeType != 'application/vnd.google-apps.folder'",
    fields: `files(${FILE_FIELDS})`,
    pageSize: "200",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });

  const data = await driveRequest(`/drive/v3/files?${params.toString()}`);
  const files = (data.files || []).map((f: any) => enrichFile(f));

  try {
    const regex = new RegExp(pattern);
    return files
      .filter((f: any) => !regex.test(f.name))
      .map((f: any) => ({
        file: f,
        currentName: f.name,
        suggestedName: generateSuggestedName(f, pattern),
        rule: pattern,
      }));
  } catch {
    return [];
  }
}

function enrichFile(file: any) {
  const owners = file.owners || [];
  const permissions = file.permissions || [];
  const shared = file.shared || false;

  let permissionsSummary: string;
  if (permissions.length > 0) {
    const userPerms = permissions.filter((p: any) => p.type === "user");
    const anyonePerms = permissions.filter((p: any) => p.type === "anyone");
    const domainPerms = permissions.filter((p: any) => p.type === "domain");
    if (anyonePerms.length > 0) {
      permissionsSummary = `Public${userPerms.length > 0 ? ` + ${userPerms.length} people` : ""}`;
    } else if (domainPerms.length > 0) {
      permissionsSummary = `Link shared${userPerms.length > 0 ? ` + ${userPerms.length} people` : ""}`;
    } else {
      permissionsSummary = `${userPerms.length} ${userPerms.length === 1 ? "person" : "people"}`;
    }
  } else if (shared) {
    const ownerName = owners[0]?.displayName || "Someone";
    permissionsSummary = `Shared by ${ownerName}`;
  } else {
    permissionsSummary = "Private";
  }

  const permissionDetails = permissions.map((p: any) => ({
    id: p.id || "",
    displayName: p.displayName || p.emailAddress || (p.type === "anyone" ? "Anyone" : p.type === "domain" ? `Anyone at ${p.domain || "org"}` : "Unknown"),
    emailAddress: p.emailAddress || null,
    role: p.role,
    type: p.type,
  }));

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    iconLink: file.iconLink || null,
    thumbnailLink: file.thumbnailLink || null,
    webViewLink: file.webViewLink || null,
    size: file.size || null,
    modifiedTime: file.modifiedTime,
    createdTime: file.createdTime || null,
    owners: file.owners || [],
    lastModifyingUser: file.lastModifyingUser || null,
    parents: file.parents || [],
    shared,
    sharingUser: file.sharingUser || null,
    locationBreadcrumb: null as string | null,
    permissionsSummary,
    breadcrumbSegments: [] as Array<{ id: string; name: string }>,
    permissionDetails,
  };
}

const FOLDER_CACHE_MAX = 500;
const folderCache = new Map<string, { name: string; parentId: string | null }>();

const inflightFetches = new Map<string, Promise<{ name: string; parentId: string | null }>>();

async function fetchFolderInfo(folderId: string): Promise<{ name: string; parentId: string | null }> {
  if (folderCache.has(folderId)) return folderCache.get(folderId)!;
  if (inflightFetches.has(folderId)) return inflightFetches.get(folderId)!;
  const promise = (async () => {
    try {
      const data = await driveRequest(`/drive/v3/files/${folderId}?fields=id,name,parents&supportsAllDrives=true`);
      const info = { name: data.name, parentId: data.parents?.[0] || null };
      folderCache.set(folderId, info);
      return info;
    } catch {
      return { name: "", parentId: null };
    } finally {
      inflightFetches.delete(folderId);
    }
  })();
  inflightFetches.set(folderId, promise);
  return promise;
}

async function buildFullPath(startParentId: string): Promise<Array<{ id: string; name: string }>> {
  const segments: Array<{ id: string; name: string }> = [];
  const visited = new Set<string>();
  let currentId: string | null = startParentId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const info = await fetchFolderInfo(currentId);
    if (!info.name) break;
    segments.unshift({ id: currentId, name: info.name });
    if (info.name === "My Drive" || !info.parentId) break;
    currentId = info.parentId;
  }
  return segments;
}

async function resolveBreadcrumbs(files: any[]) {
  if (folderCache.size > FOLDER_CACHE_MAX) {
    const keysToDelete = Array.from(folderCache.keys()).slice(0, Math.floor(FOLDER_CACHE_MAX / 2));
    for (const key of keysToDelete) folderCache.delete(key);
  }

  const uniqueParents = new Set<string>();
  for (const file of files) {
    if (file.parents?.[0]) uniqueParents.add(file.parents[0]);
  }

  const pathMap = new Map<string, Array<{ id: string; name: string }>>();
  const pathResults = await Promise.allSettled(
    Array.from(uniqueParents).map(async (parentId) => {
      const path = await buildFullPath(parentId);
      return { parentId, path };
    })
  );

  for (const result of pathResults) {
    if (result.status === "fulfilled") {
      pathMap.set(result.value.parentId, result.value.path);
    }
  }

  for (const file of files) {
    const parentId = file.parents?.[0];
    if (parentId && pathMap.has(parentId)) {
      const segments = pathMap.get(parentId)!;
      file.breadcrumbSegments = segments;
      file.locationBreadcrumb = segments.map(s => s.name).join(" > ");
    }
  }
}

export async function downloadFile(fileId: string): Promise<{ stream: ReadableStream; fileName: string; mimeType: string; contentLength: string | null }> {
  const file = await getFileDetails(fileId);
  const googleTypes: Record<string, { exportMime: string; ext: string }> = {
    "application/vnd.google-apps.document": { exportMime: "application/pdf", ext: ".pdf" },
    "application/vnd.google-apps.spreadsheet": { exportMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ".xlsx" },
    "application/vnd.google-apps.presentation": { exportMime: "application/pdf", ext: ".pdf" },
    "application/vnd.google-apps.drawing": { exportMime: "application/pdf", ext: ".pdf" },
  };

  const googleType = googleTypes[file.mimeType];
  let response: Response;
  let fileName = file.name;

  if (googleType) {
    const params = new URLSearchParams({ mimeType: googleType.exportMime });
    response = await connectors.proxy("google-drive", `/drive/v3/files/${fileId}/export?${params.toString()}`);
    if (!fileName.endsWith(googleType.ext)) {
      fileName += googleType.ext;
    }
  } else {
    response = await connectors.proxy("google-drive", `/drive/v3/files/${fileId}?alt=media`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new DriveApiError(response.status, errorText, `/download/${fileId}`);
  }

  return {
    stream: response.body!,
    fileName,
    mimeType: googleType?.exportMime || file.mimeType,
    contentLength: response.headers.get("content-length"),
  };
}

function groupFiles(files: any[], groupBy: string) {
  const groups = new Map<string, { key: string; label: string; photoUrl: string | null; files: any[] }>();

  for (const file of files) {
    let key: string;
    let label: string;
    let photoUrl: string | null = null;

    if (groupBy === "person") {
      const sharer = file.sharingUser || file.owners?.[0];
      key = sharer?.emailAddress || "unknown";
      label = sharer?.displayName || sharer?.emailAddress || "Unknown";
      photoUrl = sharer?.photoLink || null;
    } else if (groupBy === "fileType") {
      key = getMimeLabel(file.mimeType);
      label = key;
    } else {
      const date = new Date(file.modifiedTime);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        key = "this_week";
        label = "This Week";
      } else if (diffDays < 30) {
        key = "this_month";
        label = "This Month";
      } else if (diffDays < 90) {
        key = "last_3_months";
        label = "Last 3 Months";
      } else {
        key = "older";
        label = "Older";
      }
    }

    if (!groups.has(key)) {
      groups.set(key, { key, label, photoUrl, files: [] });
    }
    groups.get(key)!.files.push(file);
  }

  return Array.from(groups.values()).map(g => ({
    ...g,
    count: g.files.length,
  }));
}

function getMimeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    "application/vnd.google-apps.document": "Document",
    "application/vnd.google-apps.spreadsheet": "Spreadsheet",
    "application/vnd.google-apps.presentation": "Presentation",
    "application/vnd.google-apps.folder": "Folder",
    "application/vnd.google-apps.drawing": "Drawing",
    "application/pdf": "PDF",
  };
  if (map[mimeType]) return map[mimeType];
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  return "File";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export async function getFolderTree() {
  const folderMap = new Map<string, { id: string; name: string; parentId: string | null }>();
  let rootId = "root";

  try {
    const rootData = await driveRequest("/drive/v3/files/root?fields=id,name");
    rootId = rootData.id;
    folderMap.set(rootId, { id: rootId, name: rootData.name || "My Drive", parentId: null });
  } catch {
    logger.warn("Could not get root folder, using alias");
    folderMap.set(rootId, { id: rootId, name: "My Drive", parentId: null });
  }

  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: "nextPageToken,files(id,name,parents)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const data = await driveRequest(`/drive/v3/files?${params.toString()}`);
    for (const f of data.files || []) {
      const parentId = f.parents?.[0] || null;
      folderMap.set(f.id, { id: f.id, name: f.name, parentId });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  const itemCountMap = new Map<string, number>();
  for (const folder of folderMap.values()) {
    itemCountMap.set(folder.id, 0);
  }
  for (const folder of folderMap.values()) {
    if (folder.parentId && itemCountMap.has(folder.parentId)) {
      itemCountMap.set(folder.parentId, (itemCountMap.get(folder.parentId) || 0) + 1);
    }
  }

  const folders = Array.from(folderMap.values()).map(f => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    itemCount: itemCountMap.get(f.id) || 0,
  }));

  return { folders, rootId };
}

export async function smartSearchFiles(params: {
  description: string;
  fileTypes?: string[];
}) {
  const { openai } = await import("@workspace/integrations-openai-ai-server");

  const fileTypeContext = params.fileTypes?.length
    ? `The user is looking for files with these extensions: ${params.fileTypes.join(", ")}.`
    : "";

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 256,
    messages: [
      {
        role: "system",
        content: `You are a search query generator for Google Drive. Given a user's description of a file they're looking for, generate 3-5 short, distinct search terms that would help find the file via Google Drive's fullText search. Each term should be a keyword or short phrase (1-3 words). Return ONLY a JSON array of strings, nothing else. Example: ["red car beach", "sunset vehicle", "car photo"]`,
      },
      {
        role: "user",
        content: `${params.description}${fileTypeContext ? `\n${fileTypeContext}` : ""}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "[]";
  let searchTerms: string[];
  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      searchTerms = [params.description];
    } else {
      searchTerms = parsed
        .filter((item: unknown): item is string => typeof item === "string")
        .map((s: string) => s.trim().slice(0, 100))
        .filter((s: string) => s.length > 0);
      if (searchTerms.length === 0) searchTerms = [params.description];
    }
  } catch {
    searchTerms = [params.description];
  }

  const mimeFilters: string[] = [];
  if (params.fileTypes?.length) {
    const extToMime: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
      bmp: "image/bmp",
      tiff: "image/tiff",
      tif: "image/tiff",
      psd: "image/vnd.adobe.photoshop",
      ai: "application/postscript",
      eps: "application/postscript",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      mp4: "video/mp4",
      mov: "video/quicktime",
      mp3: "audio/mpeg",
      wav: "audio/wav",
    };

    for (const ext of params.fileTypes) {
      const mime = extToMime[ext.toLowerCase()];
      if (mime) {
        mimeFilters.push(`mimeType = '${mime}'`);
      } else {
        mimeFilters.push(`name contains '.${ext.toLowerCase()}'`);
      }
    }
  }

  const allFiles = new Map<string, any>();

  for (const term of searchTerms.slice(0, 5)) {
    try {
      const queryParts: string[] = [
        `fullText contains '${term.replace(/'/g, "\\'")}'`,
        "trashed = false",
      ];

      if (mimeFilters.length === 1) {
        queryParts.push(mimeFilters[0]);
      } else if (mimeFilters.length > 1) {
        queryParts.push(`(${mimeFilters.join(" or ")})`);
      }

      const query = queryParts.join(" and ");
      const searchParams = new URLSearchParams({
        q: query,
        fields: `files(${FILE_FIELDS})`,
        pageSize: "10",
        orderBy: "modifiedTime desc",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      });

      const data = await driveRequest(`/drive/v3/files?${searchParams.toString()}`);
      for (const file of data.files || []) {
        if (!allFiles.has(file.id)) {
          allFiles.set(file.id, enrichFile(file));
        }
      }
    } catch (err) {
      logger.warn({ term, err }, "Smart search term failed, continuing with others");
    }
  }

  const files = Array.from(allFiles.values());
  await resolveBreadcrumbs(files);

  return {
    files,
    searchTerms,
    totalFound: files.length,
  };
}

function generateSuggestedName(file: any, _pattern: string): string {
  const dateStr = new Date(file.modifiedTime).toISOString().split("T")[0];
  const owner = file.owners?.[0]?.displayName || "Unknown";
  return `${dateStr}_${owner}_${file.name}`.replace(/\s+/g, "_");
}
