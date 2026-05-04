import { X, Download, ExternalLink, Shield, FileText, FileSpreadsheet, Presentation, Image as ImageIcon, Film, Music, File, FolderOpen, User, Calendar, HardDrive, Clock } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetFileDetails, getGetFileDetailsQueryKey, useGetFilePreviewUrl, getGetFilePreviewUrlQueryKey, useGetFilePermissions, getGetFilePermissionsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionInspector } from "./PermissionInspector";
import { useState } from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";

function getMimeLabel(mimeType: string) {
  if (mimeType.includes("document")) return "Document";
  if (mimeType.includes("spreadsheet")) return "Spreadsheet";
  if (mimeType.includes("presentation")) return "Slides";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.includes("folder")) return "Folder";
  return "File";
}

function getMimeIcon(mimeType: string) {
  if (mimeType.includes("document") || mimeType === "application/pdf") return FileText;
  if (mimeType.includes("spreadsheet")) return FileSpreadsheet;
  if (mimeType.includes("presentation")) return Presentation;
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.includes("folder")) return FolderOpen;
  return File;
}

function formatBytes(bytes: string | null | undefined) {
  if (!bytes) return null;
  const num = parseInt(bytes, 10);
  if (isNaN(num)) return null;
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FilePreviewPanel({ fileId, open, onOpenChange }: { fileId: string | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: file, isLoading: loadingFile } = useGetFileDetails(fileId || "", {
    query: { enabled: !!fileId && open, queryKey: getGetFileDetailsQueryKey(fileId || "") }
  });

  const { data: previewUrl, isLoading: loadingPreview } = useGetFilePreviewUrl(fileId || "", {
    query: { enabled: !!fileId && open, queryKey: getGetFilePreviewUrlQueryKey(fileId || "") }
  });

  const { data: permissions, isLoading: loadingPerms } = useGetFilePermissions(fileId || "", {
    query: { enabled: !!fileId && open, queryKey: getGetFilePermissionsQueryKey(fileId || "") }
  });

  const [inspectPerms, setInspectPerms] = useState(false);

  const MimeIcon = file?.mimeType ? getMimeIcon(file.mimeType) : File;
  const mimeLabel = file?.mimeType ? getMimeLabel(file.mimeType) : "File";
  const sizeStr = formatBytes(file?.size);
  const modifiedStr = formatDate(file?.modifiedTime);
  const createdStr = formatDate(file?.createdTime);
  const ownerName = file?.owners?.[0]?.displayName;
  const ownerEmail = file?.owners?.[0]?.emailAddress;
  const breadcrumbs = file?.locationBreadcrumb;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[55vw] sm:max-w-[55vw] p-0 flex flex-col gap-0 border-l border-border bg-background [&>button:first-child]:hidden">
          <SheetPrimitive.Title className="sr-only">File Preview</SheetPrimitive.Title>

          <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {loadingFile ? (
                <Skeleton className="h-5 w-48" />
              ) : (
                <h2 className="text-base font-semibold truncate">{file?.name}</h2>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {previewUrl?.downloadUrl && (
                <Button variant="outline" size="sm" className="h-8" asChild>
                  <a href={previewUrl.downloadUrl} target="_blank" rel="noreferrer">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </a>
                </Button>
              )}
              {file?.webViewLink && (
                <Button variant="default" size="sm" className="h-8" asChild>
                  <a href={file.webViewLink} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Open in Drive
                  </a>
                </Button>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="bg-muted/30">
              {loadingPreview ? (
                <div className="flex items-center justify-center p-8 min-h-[300px]">
                  <Skeleton className="w-full h-[50vh] rounded-md" />
                </div>
              ) : previewUrl?.previewType === 'google' || previewUrl?.previewType === 'pdf' ? (
                <iframe
                  src={previewUrl.url || ''}
                  className="w-full border-0 bg-white"
                  style={{ height: '65vh' }}
                  title="File Preview"
                />
              ) : previewUrl?.previewType === 'image' ? (
                <div className="flex items-center justify-center p-4">
                  <img
                    src={previewUrl.url || ''}
                    alt={file?.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-md"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-16 px-8">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <MimeIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No preview available</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    {previewUrl?.message || "This file type cannot be previewed in Fileray."}
                  </p>
                  {file?.webViewLink && (
                    <Button asChild>
                      <a href={file.webViewLink} target="_blank" rel="noreferrer">
                        Open in Google Drive
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 space-y-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MimeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Type</p>
                      <p className="text-sm font-medium">{loadingFile ? <Skeleton className="h-4 w-20" /> : mimeLabel}</p>
                    </div>
                  </div>

                  {sizeStr && (
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Size</p>
                        <p className="text-sm font-medium">{sizeStr}</p>
                      </div>
                    </div>
                  )}

                  {modifiedStr && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Modified</p>
                        <p className="text-sm font-medium">{modifiedStr}</p>
                      </div>
                    </div>
                  )}

                  {createdStr && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Uploaded</p>
                        <p className="text-sm font-medium">{createdStr}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {(ownerName || loadingFile) && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Owner</p>
                        {loadingFile ? (
                          <Skeleton className="h-4 w-28" />
                        ) : (
                          <>
                            <p className="text-sm font-medium">{ownerName}</p>
                            {ownerEmail && <p className="text-xs text-muted-foreground">{ownerEmail}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {(breadcrumbs || loadingFile) && (
                    <div className="flex items-start gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Location</p>
                        {loadingFile ? (
                          <Skeleton className="h-4 w-40" />
                        ) : (
                          <p className="text-sm font-medium break-words">{breadcrumbs}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Access</p>
                      {loadingPerms ? (
                        <Skeleton className="h-4 w-28" />
                      ) : permissions ? (
                        <Badge
                          variant="outline"
                          className={`mt-0.5 cursor-pointer hover:bg-accent text-xs ${
                            permissions.alertLevel === 'red' ? 'border-alert-red text-alert-red' :
                            permissions.alertLevel === 'amber' ? 'border-alert-amber text-alert-amber' :
                            'border-alert-green text-alert-green'
                          }`}
                          onClick={() => setInspectPerms(true)}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {permissions.summary}
                        </Badge>
                      ) : (
                        <p className="text-sm font-medium">Unknown</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {fileId && (
        <PermissionInspector
          fileId={fileId}
          open={inspectPerms}
          onOpenChange={setInspectPerms}
        />
      )}
    </>
  );
}
