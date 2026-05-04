import { useState } from "react";
import { useUpdateFilePermission, getGetFilePermissionsQueryKey, type UpdatePermissionRequestRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  Pencil,
  Shield,
  Eye,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";

interface PermissionEntry {
  id: string;
  displayName: string;
  emailAddress: string | null;
  role: string;
  type: string;
}

interface PermissionPopoverProps {
  fileId: string;
  permDetails: PermissionEntry[] | undefined;
  ownerName: string;
  shared: boolean;
  trigger: React.ReactNode;
  onPermissionUpdated?: (permId: string, newRole: string) => void;
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
  const map: Record<string, string> = {
    owner: "Owner",
    writer: "Editor",
    commenter: "Commenter",
    reader: "Viewer",
    fileOrganizer: "Editor",
  };
  return map[role] || role;
}

function getRoleColor(role: string): string {
  if (role === "owner") return "text-amber-600 dark:text-amber-400";
  if (role === "writer" || role === "fileOrganizer") return "text-blue-600 dark:text-blue-400";
  if (role === "commenter") return "text-purple-600 dark:text-purple-400";
  return "text-green-600 dark:text-green-400";
}

export function PermissionPopover({
  fileId,
  permDetails,
  ownerName,
  shared,
  trigger,
  onPermissionUpdated,
}: PermissionPopoverProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [ownerTransfer, setOwnerTransfer] = useState<{ perm: PermissionEntry } | null>(null);
  const updateMutation = useUpdateFilePermission();

  const executeRoleChange = async (perm: PermissionEntry, newRole: string) => {
    setUpdatingId(perm.id);
    setSuccessId(null);

    try {
      await updateMutation.mutateAsync({
        fileId,
        permissionId: perm.id,
        data: { role: newRole as UpdatePermissionRequestRole },
      });

      onPermissionUpdated?.(perm.id, newRole);
      setSuccessId(perm.id);
      setTimeout(() => setSuccessId(null), 2000);

      queryClient.invalidateQueries({ queryKey: getGetFilePermissionsQueryKey(fileId) });

      toast({
        title: `${perm.displayName}'s role updated to ${getRoleLabel(newRole)}`,
      });
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || "Failed to update permission";
      toast({
        title: "Permission update failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleChange = (perm: PermissionEntry, newRole: string) => {
    if (newRole === perm.role || !perm.id) return;
    if (newRole === "owner") {
      setOwnerTransfer({ perm });
      return;
    }
    executeRoleChange(perm, newRole);
  };

  const canEditRole = (perm: PermissionEntry) => {
    return perm.type === "user" && perm.role !== "owner" && perm.id;
  };

  return (
    <>
    <AlertDialog open={!!ownerTransfer} onOpenChange={(open) => { if (!open) setOwnerTransfer(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Transfer Ownership
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will transfer ownership of this file to <strong>{ownerTransfer?.perm.displayName}</strong>. You will lose owner privileges and become an editor. This action cannot be easily undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-amber-600 hover:bg-amber-700"
            onClick={() => {
              if (ownerTransfer) {
                executeRoleChange(ownerTransfer.perm, "owner");
                setOwnerTransfer(null);
              }
            }}
          >
            Transfer Ownership
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-80 p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 space-y-2">
          <div className="text-xs font-semibold border-b border-border pb-1.5 mb-1 text-foreground">
            Who has access
          </div>
          {permDetails && permDetails.length > 0 ? (
            <div className="space-y-2">
              {permDetails.map((perm) => {
                const RoleIcon = getRoleIcon(perm.role);
                const roleLabel = getRoleLabel(perm.role);
                const roleColor = getRoleColor(perm.role);
                const editable = canEditRole(perm);
                const isUpdating = updatingId === perm.id;
                const isSuccess = successId === perm.id;

                return (
                  <div key={perm.id || perm.displayName} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate text-foreground">
                        {perm.displayName}
                      </div>
                      {perm.emailAddress && perm.type === "user" && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {perm.emailAddress}
                        </div>
                      )}
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
                          value={perm.role}
                          onValueChange={(value) => handleRoleChange(perm, value)}
                        >
                          <SelectTrigger className="h-6 text-[10px] w-auto gap-1 border-dashed px-2 min-w-0">
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
                        <div className={`flex items-center gap-1 shrink-0 ${roleColor}`}>
                          <RoleIcon className="h-3 w-3" />
                          <span className="text-[10px] font-medium">{roleLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {ownerName && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-foreground">{ownerName}</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <Crown className="h-3 w-3" /> Owner
                  </span>
                </div>
              )}
              <div className="text-[10px] text-muted-foreground">
                {shared ? "Shared with others" : "Only the owner"}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
    </>
  );
}
