import { X, Download, ExternalLink, Shield, FileText, FileSpreadsheet, Presentation, Image as ImageIcon, Film, Music, File, FolderOpen, User, Calendar, HardDrive, Clock, Crown, Pencil, Eye, Loader2, Check, AlertTriangle } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetFileDetails, getGetFileDetailsQueryKey, useGetFilePreviewUrl, getGetFilePreviewUrlQueryKey, useGetFilePermissions, getGetFilePermissionsQueryKey, useUpdateFilePermission, type UpdatePermissionRequestRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
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

const EDITABLE_ROLES = [
  { value: "writer", label: "Editor", icon: Pencil, color: "text-blue-600 dark:text-blue-400" },
  { value: "commenter", label: "Commenter", icon: Shield, color: "text-purple-600 dark:text-purple-400" },
  { value: "reader", label: "Viewer", icon: Eye, color: "text-green-600 dark:text-green-400" },
];

function getRoleIcon(role: string) {
  if (role === "owner") return Crown;
  if (role === "writer" || role === "fileOrganizer") return Pencil;
  if (role === "commenter") return Shield;
  return Eye;
}

function getRoleLabel(role: string): string {
  const map: Record<string, string> = { owner: "Owner", writer: "Editor", commenter: "Commenter", reader: "Viewer", fileOrganizer: "Editor" };
  return map[role] || role;
}

function getRoleColor(role: string): string {
  if (role === "owner") return "text-amber-600 dark:text-amber-400";
  if (role === "writer" || role === "fileOrganizer") return "text-blue-600 dark:text-blue-400";
  if (role === "commenter") return "text-purple-600 dark:text-purple-400";
  return "text-green-600 dark:text-green-400";
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

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateFilePermission();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [ownerTransfer, setOwnerTransfer] = useState<{ id: string; displayName: string } | null>(null);

  const MimeIcon = file?.mimeType ? getMimeIcon(file.mimeType) : File;
  const mimeLabel = file?.mimeType ? getMimeLabel(file.mimeType) : "File";
  const sizeStr = formatBytes(file?.size);
  const modifiedStr = formatDate(file?.modifiedTime);
  const createdStr = formatDate(file?.createdTime);
  const ownerName = file?.owners?.[0]?.displayName;
  const ownerEmail = file?.owners?.[0]?.emailAddress;
  const breadcrumbs = file?.locationBreadcrumb;

  const downloadUrl = fileId ? `/api/files/${fileId}/download` : null;

  const executeRoleChange = async (permId: string, displayName: string, newRole: string) => {
    if (!fileId) return;
    setUpdatingId(permId);
    setSuccessId(null);
    try {
      await updateMutation.mutateAsync({
        fileId,
        permissionId: permId,
        data: { role: newRole as UpdatePermissionRequestRole },
      });
      setSuccessId(permId);
      setTimeout(() => setSuccessId(null), 2000);
      queryClient.invalidateQueries({ queryKey: getGetFilePermissionsQueryKey(fileId) });
      toast({ title: `${displayName}'s role updated to ${getRoleLabel(newRole)}` });
    } catch (err: any) {
      toast({
        title: "Permission update failed",
        description: err?.data?.error || err?.message || "Failed to update permission",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleChange = (permId: string, displayName: string, currentRole: string, newRole: string) => {
    if (newRole === currentRole || !permId) return;
    if (newRole === "owner") {
      setOwnerTransfer({ id: permId, displayName });
      return;
    }
    executeRoleChange(permId, displayName, newRole);
  };

  return (
    <>
      <AlertDialog open={!!ownerTransfer} onOpenChange={(o) => { if (!o) setOwnerTransfer(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Transfer Ownership
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will transfer ownership of this file to <strong>{ownerTransfer?.displayName}</strong>. You will lose owner privileges and become an editor. This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                if (ownerTransfer) {
                  executeRoleChange(ownerTransfer.id, ownerTransfer.displayName, "owner");
                  setOwnerTransfer(null);
                }
              }}
            >
              Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {downloadUrl && (
                <Button variant="outline" size="sm" className="h-8" asChild>
                  <a href={downloadUrl} download>
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
                <div className="flex items-center justify-center p-4" style={{ minHeight: '65vh' }}>
                  <img
                    src={previewUrl.url || ''}
                    alt={file?.name}
                    className="w-full h-full object-contain rounded-md"
                    style={{ maxHeight: '65vh' }}
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
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Who has access</p>
                </div>
                {loadingPerms ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : permissions?.people && permissions.people.length > 0 ? (
                  <div className="space-y-2">
                    {permissions.people.map((person) => {
                      const RoleIcon = getRoleIcon(person.role);
                      const roleColor = getRoleColor(person.role);
                      const editable = person.role !== "owner" && person.id;
                      const isUpdating = updatingId === person.id;
                      const isSuccess = successId === person.id;

                      return (
                        <div key={person.id} className="flex items-center justify-between gap-3 py-1.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={person.photoLink || undefined} />
                              <AvatarFallback className="text-[10px]">{person.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{person.displayName}</p>
                              {person.emailAddress && (
                                <p className="text-[11px] text-muted-foreground truncate">{person.emailAddress}</p>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            {isUpdating ? (
                              <div className="flex items-center gap-1 text-muted-foreground px-2 py-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="text-[10px]">Saving...</span>
                              </div>
                            ) : isSuccess ? (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 px-2 py-1">
                                <Check className="h-3 w-3" />
                                <span className="text-[10px] font-medium">Updated</span>
                              </div>
                            ) : editable ? (
                              <Select
                                value={person.role}
                                onValueChange={(value) => handleRoleChange(person.id, person.displayName, person.role, value)}
                              >
                                <SelectTrigger className="h-7 text-xs w-auto gap-1 border-dashed px-2 min-w-0">
                                  <RoleIcon className={`h-3 w-3 ${roleColor}`} />
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {EDITABLE_ROLES.map((r) => {
                                    const RI = r.icon;
                                    return (
                                      <SelectItem key={r.value} value={r.value}>
                                        <div className="flex items-center gap-2">
                                          <RI className={`h-3 w-3 ${r.color}`} />
                                          <span>{r.label}</span>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                  <div className="border-t border-border my-1" />
                                  <SelectItem value="owner">
                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                      <Crown className="h-3 w-3" />
                                      <span>Transfer ownership</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className={`flex items-center gap-1 ${roleColor}`}>
                                <RoleIcon className="h-3 w-3" />
                                <span className="text-xs font-medium">{getRoleLabel(person.role)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No access information available</p>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
