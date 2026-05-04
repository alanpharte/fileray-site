import { X, Download, ExternalLink, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetFileDetails, getGetFileDetailsQueryKey, useGetFilePreviewUrl, getGetFilePreviewUrlQueryKey, useGetFilePermissions, getGetFilePermissionsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionInspector } from "./PermissionInspector";
import { useState } from "react";

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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[50vw] sm:max-w-[50vw] p-0 flex flex-col gap-0 border-l border-border bg-background">
          <SheetHeader className="p-6 border-b border-border flex flex-row items-center justify-between">
            <div className="flex flex-col gap-1">
              <SheetTitle className="text-xl">{loadingFile ? <Skeleton className="h-6 w-64" /> : file?.name}</SheetTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {loadingFile ? (
                  <Skeleton className="h-4 w-32" />
                ) : (
                  <>
                    <span>Modified: {file?.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Unknown'}</span>
                    <span>Size: {file?.size || 'Unknown'}</span>
                    {file?.owners?.[0]?.displayName && <span>Owner: {file.owners[0].displayName}</span>}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {permissions && (
                <Badge variant="outline" className={`flex items-center gap-1 cursor-pointer hover:bg-accent ${
                  permissions.alertLevel === 'red' ? 'border-alert-red text-alert-red' :
                  permissions.alertLevel === 'amber' ? 'border-alert-amber text-alert-amber' :
                  'border-alert-green text-alert-green'
                }`} onClick={() => setInspectPerms(true)}>
                  <Shield className="h-3 w-3" />
                  {permissions.summary}
                </Badge>
              )}
              {previewUrl?.downloadUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={previewUrl.downloadUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              )}
              {file?.webViewLink && (
                <Button variant="default" size="sm" asChild>
                  <a href={file.webViewLink} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Drive
                  </a>
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto bg-muted/30 p-6 flex flex-col">
            {loadingPreview ? (
              <div className="flex-1 flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-md" />
              </div>
            ) : previewUrl?.previewType === 'google' || previewUrl?.previewType === 'pdf' ? (
              <iframe 
                src={previewUrl.url || ''} 
                className="flex-1 w-full rounded-md border border-border bg-white shadow-sm"
                title="File Preview"
              />
            ) : previewUrl?.previewType === 'image' ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <img src={previewUrl.url || ''} alt={file?.name} className="max-w-full max-h-full object-contain rounded-md shadow-sm" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ExternalLink className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No preview available</h3>
                <p className="text-muted-foreground mb-6">
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
