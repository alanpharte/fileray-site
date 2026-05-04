import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGetFilePermissions, getGetFilePermissionsQueryKey, useExportPermissionsCsv } from "@workspace/api-client-react";
import { Shield, AlertTriangle, CheckCircle2, Download, Copy, Globe, Link as LinkIcon, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export function PermissionInspector({ fileId, open, onOpenChange }: { fileId: string, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: permissions, isLoading } = useGetFilePermissions(fileId, {
    query: { enabled: !!fileId && open, queryKey: getGetFilePermissionsQueryKey(fileId) }
  });

  const exportCsv = useExportPermissionsCsv(fileId, {
    query: { enabled: false, queryKey: ['export-csv', fileId] }
  });

  const { toast } = useToast();

  const handleExport = async () => {
    try {
      const { data } = await exportCsv.refetch();
      if (data) {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `permissions-${fileId}.csv`;
        a.click();
      }
    } catch (e) {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const copyEmail = (email: string | null | undefined) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    toast({ title: "Email copied" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Access Inspector</DialogTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : permissions ? (
          <div className="space-y-8 py-2">
            {/* Access Summary Banner */}
            <div className={`p-4 rounded-lg flex gap-3 ${
              permissions.alertLevel === 'red' ? 'bg-alert-red/10 border border-alert-red/20' :
              permissions.alertLevel === 'amber' ? 'bg-alert-amber/10 border border-alert-amber/20' :
              'bg-alert-green/10 border border-alert-green/20'
            }`}>
              <div className={`mt-0.5 ${
                permissions.alertLevel === 'red' ? 'text-alert-red' :
                permissions.alertLevel === 'amber' ? 'text-alert-amber' :
                'text-alert-green'
              }`}>
                {permissions.alertLevel === 'red' ? <Globe className="h-5 w-5" /> :
                 permissions.alertLevel === 'amber' ? <LinkIcon className="h-5 w-5" /> :
                 <Lock className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{permissions.summary}</h3>
                <p className="text-sm text-muted-foreground">{permissions.alertMessage}</p>
              </div>
            </div>

            {/* Link Sharing Status */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Link Sharing</h4>
              <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {permissions.linkSharing.enabled ? "Link sharing is on" : "Link sharing is off"}
                  </p>
                  {permissions.linkSharing.enabled && permissions.linkSharing.role && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Anyone {permissions.linkSharing.domain ? `in ${permissions.linkSharing.domain}` : 'on the internet'} with the link can {permissions.linkSharing.role}
                    </p>
                  )}
                </div>
                <Badge variant={permissions.linkSharing.enabled ? "secondary" : "outline"}>
                  {permissions.linkSharing.enabled ? 'Active' : 'Restricted'}
                </Badge>
              </div>
            </div>

            {/* People with Access */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">People with access ({permissions.people.length})</h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Origin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.people.map(person => (
                      <TableRow key={person.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={person.photoLink || undefined} />
                              <AvatarFallback>{person.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{person.displayName}</p>
                              {person.emailAddress && (
                                <div className="flex items-center text-xs text-muted-foreground group">
                                  <span>{person.emailAddress}</span>
                                  <button 
                                    onClick={() => copyEmail(person.emailAddress)}
                                    className="ml-2 opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{person.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{person.accessOrigin}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
