import { useGetTeamMembers, getGetTeamMembersQueryKey, useGetCachedTeamScan, getGetCachedTeamScanQueryKey, useRunTeamScan, useAddTeamMember, useDeleteTeamMember } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Users, Trash2, Plus, RefreshCw, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ScopeLimitedBanner } from "@/components/ScopeLimitedBanner";

export function TeamDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  const { data: members, isLoading: loadingMembers } = useGetTeamMembers({
    query: { queryKey: getGetTeamMembersQueryKey() }
  });

  const { data: scanResult, isLoading: loadingScan } = useGetCachedTeamScan({
    query: { queryKey: getGetCachedTeamScanQueryKey() }
  });

  const runScan = useRunTeamScan();
  const addMember = useAddTeamMember();
  const deleteMember = useDeleteTeamMember();

  const handleAddMember = () => {
    if (!newEmail) return;
    addMember.mutate({ data: { email: newEmail, name: newName } }, {
      onSuccess: () => {
        toast({ title: "Team member added" });
        setNewEmail("");
        setNewName("");
        queryClient.invalidateQueries({ queryKey: getGetTeamMembersQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to add member", variant: "destructive" });
      }
    });
  };

  const handleDeleteMember = (id: number) => {
    deleteMember.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Team member removed" });
        queryClient.invalidateQueries({ queryKey: getGetTeamMembersQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to remove member", variant: "destructive" });
      }
    });
  };

  const handleRunScan = () => {
    runScan.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Scan complete" });
        queryClient.invalidateQueries({ queryKey: getGetCachedTeamScanQueryKey() });
      },
      onError: () => {
        toast({ title: "Scan failed", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <ScopeLimitedBanner
        feature="Cross-team access scanning"
        description="Auditing access for files you don't own across the whole organisation needs broader access than the launch scope provides."
      />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Access Dashboard</h2>
          <p className="text-muted-foreground mt-1">Manage team members and audit their access levels</p>
        </div>
        <Button onClick={handleRunScan} disabled={runScan.isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${runScan.isPending ? 'animate-spin' : ''}`} />
          {runScan.isPending ? 'Scanning...' : 'Run Access Scan'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team Members List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>Tracked accounts for access auditing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Input 
                placeholder="Email address" 
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <Input 
                  placeholder="Name (optional)" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddMember} disabled={!newEmail || addMember.isPending}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {loadingMembers ? (
                <div className="space-y-2">
                  <div className="h-10 bg-muted animate-pulse rounded" />
                  <div className="h-10 bg-muted animate-pulse rounded" />
                </div>
              ) : members?.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/20">
                  <div className="truncate">
                    <p className="text-sm font-medium truncate">{m.name || m.email}</p>
                    {m.name && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMember(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scan Results */}
        <div className="md:col-span-2 space-y-6">
          {scanResult?.scannedAt && (
            <div className="text-sm text-muted-foreground flex justify-end">
              Last scanned: {new Date(scanResult.scannedAt).toLocaleString()}
            </div>
          )}

          {/* Oversharing Alerts */}
          <Card className="border-alert-red/30">
            <CardHeader className="bg-alert-red/5 pb-4">
              <CardTitle className="text-alert-red flex items-center text-lg">
                <ShieldAlert className="mr-2 h-5 w-5" />
                Oversharing Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!scanResult?.oversharingAlerts?.length ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        No critical oversharing detected.
                      </TableCell>
                    </TableRow>
                  ) : (
                    scanResult.oversharingAlerts.map((alert, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{alert.fileName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            alert.severity === 'high' ? 'border-alert-red text-alert-red' : 
                            alert.severity === 'medium' ? 'border-alert-amber text-alert-amber' : ''
                          }>
                            {alert.sharingLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{alert.owner}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Access Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <AlertTriangle className="mr-2 h-5 w-5 text-alert-amber" />
                Stale Access
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Person</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!scanResult?.staleAccessAlerts?.length ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        No stale access detected.
                      </TableCell>
                    </TableRow>
                  ) : (
                    scanResult.staleAccessAlerts.map((alert, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{alert.fileName}</TableCell>
                        <TableCell>{alert.personName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {alert.lastActivityDate ? new Date(alert.lastActivityDate).toLocaleDateString() : 'Unknown'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
