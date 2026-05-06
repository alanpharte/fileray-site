import { useState } from "react";
import { useGetSharedFiles, getGetSharedFilesQueryKey, GetSharedFilesGroupBy } from "@workspace/api-client-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Eye, FileIcon } from "lucide-react";
import { FilePreviewPanel } from "@/components/FilePreviewPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScopeEmptyNotice } from "@/components/ScopeLimitedBanner";

export function SharedWithMe() {
  const [groupBy, setGroupBy] = useState<GetSharedFilesGroupBy>(GetSharedFilesGroupBy.person);
  const [staleOnly, setStaleOnly] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const { data, isLoading } = useGetSharedFiles(
    { groupBy, staleOnly },
    { query: { queryKey: getGetSharedFilesQueryKey({ groupBy, staleOnly }) } }
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Shared With Me</h2>
          <p className="text-muted-foreground">Manage and audit files shared with your account</p>
        </div>

        <div className="flex items-center gap-6 bg-card border border-border p-2 rounded-lg">
          <div className="flex items-center space-x-2">
            <Switch 
              id="stale-mode" 
              checked={staleOnly}
              onCheckedChange={setStaleOnly}
            />
            <Label htmlFor="stale-mode" className="text-sm font-medium">
              Stale files (90+ days)
            </Label>
          </div>
          
          <div className="h-6 w-px bg-border"></div>

          <ToggleGroup type="single" value={groupBy} onValueChange={(val) => val && setGroupBy(val as GetSharedFilesGroupBy)}>
            <ToggleGroupItem value={GetSharedFilesGroupBy.person} aria-label="Group by person">
              Person
            </ToggleGroupItem>
            <ToggleGroupItem value={GetSharedFilesGroupBy.fileType} aria-label="Group by type">
              File Type
            </ToggleGroupItem>
            <ToggleGroupItem value={GetSharedFilesGroupBy.date} aria-label="Group by date">
              Date
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <div className="border rounded-md p-4">
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.groups?.length ? (
        <div className="space-y-10">
          {data.groups.map((group) => (
            <div key={group.key} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-2">
                {group.photoUrl && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={group.photoUrl} />
                    <AvatarFallback>{group.label.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <h3 className="text-xl font-semibold">{group.label}</h3>
                <span className="text-muted-foreground text-sm bg-muted px-2 py-0.5 rounded-full">
                  {group.count} files
                </span>
              </div>

              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[400px]">Name</TableHead>
                      <TableHead>Shared By</TableHead>
                      <TableHead>Modified</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.files.map((file) => (
                      <TableRow key={file.id} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded flex items-center justify-center bg-muted">
                              <FileIcon className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium truncate max-w-[300px]">{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {file.sharingUser?.displayName || file.owners?.[0]?.displayName || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {new Date(file.modifiedTime).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {file.permissionsSummary && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Shield className="mr-1 h-3 w-3" />
                              {file.permissionsSummary}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setPreviewFileId(file.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Inspect
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card border border-border rounded-lg">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No shared files found</h3>
          <p className="text-muted-foreground mb-6">
            {staleOnly ? "You don't have any stale shared files." : "No files have been shared with you."}
          </p>
          {!staleOnly && (
            <div className="max-w-xl mx-auto">
              <ScopeEmptyNotice
                context="Files shared with you only show up here once you've opened them through Fileray (so we can see them under the drive.file scope)."
              />
            </div>
          )}
        </div>
      )}

      <FilePreviewPanel 
        fileId={previewFileId} 
        open={!!previewFileId} 
        onOpenChange={(open) => !open && setPreviewFileId(null)} 
      />
    </div>
  );
}
