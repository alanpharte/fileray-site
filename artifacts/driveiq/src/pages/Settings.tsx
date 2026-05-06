import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings, useClearCache, useCreateBillingPortalSession } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, Database, ExternalLink, LogOut, Settings as SettingsIcon, Trash2 } from "lucide-react";
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

export function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      toast({ title: "Account deleted", description: "Your Fileray account and stored data have been removed." });
      window.location.href = "/";
    } catch (err) {
      toast({
        title: "Could not delete account",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };
  
  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() }
  });

  const updateSettings = useUpdateSettings();
  const clearCache = useClearCache();
  const billingPortal = useCreateBillingPortalSession();

  const [threshold, setThreshold] = useState(90);
  const [pattern, setPattern] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (settings) {
      setThreshold(settings.staleThresholdDays);
      setPattern(settings.namingPattern || "");
      setDesc(settings.namingPatternDescription || "");
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      data: {
        staleThresholdDays: threshold,
        namingPattern: pattern,
        namingPatternDescription: desc
      }
    }, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully" });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    });
  };

  const handleClearCache = () => {
    clearCache.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Cache cleared successfully" });
        queryClient.invalidateQueries();
      }
    });
  };

  const handleOpenPortal = () => {
    billingPortal.mutate(undefined, {
      onSuccess: (data) => {
        if (data?.url) {
          window.location.href = data.url;
        } else {
          toast({ title: "Could not open billing portal", variant: "destructive" });
        }
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to open billing portal";
        toast({ title: message, variant: "destructive" });
      },
    });
  };

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  };

  const statusLabel: Record<string, { label: string; tone: string }> = {
    trialing: { label: "Free trial", tone: "bg-alert-green/15 text-alert-green border-alert-green/30" },
    active: { label: "Active", tone: "bg-alert-green/15 text-alert-green border-alert-green/30" },
    past_due: { label: "Past due", tone: "bg-alert-red/15 text-alert-red border-alert-red/30" },
    unpaid: { label: "Unpaid", tone: "bg-alert-red/15 text-alert-red border-alert-red/30" },
    canceled: { label: "Canceled", tone: "bg-muted text-muted-foreground border-border" },
    incomplete: { label: "Incomplete", tone: "bg-muted text-muted-foreground border-border" },
    incomplete_expired: { label: "Expired", tone: "bg-muted text-muted-foreground border-border" },
    paused: { label: "Paused", tone: "bg-muted text-muted-foreground border-border" },
  };

  if (isLoading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Configure Fileray behaviors and connections.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Billing
            </CardTitle>
            <CardDescription>Your Fileray plan, trial status, and Stripe billing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(() => {
              const status = settings?.subscriptionStatus ?? null;
              const trialEnd = formatDate(settings?.trialEndsAt);
              const periodEnd = formatDate(settings?.currentPeriodEndsAt);
              const hasCustomer = Boolean(settings?.stripeCustomerId);
              const badge = status ? statusLabel[status] ?? { label: status, tone: "bg-muted text-muted-foreground border-border" } : null;

              return (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 border border-border rounded-lg bg-card">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Plan</div>
                      <div className="font-semibold">Solo — £19/mo</div>
                    </div>
                    <div className="p-4 border border-border rounded-lg bg-card">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Status</div>
                      {badge ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.tone}`}>
                          {badge.label}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No active subscription</span>
                      )}
                    </div>
                    <div className="p-4 border border-border rounded-lg bg-card">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Trial ends</div>
                      <div className="font-medium">{trialEnd ?? <span className="text-muted-foreground">—</span>}</div>
                    </div>
                    <div className="p-4 border border-border rounded-lg bg-card">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                        {status === "canceled" ? "Access until" : "Next billing date"}
                      </div>
                      <div className="font-medium">{periodEnd ?? <span className="text-muted-foreground">—</span>}</div>
                    </div>
                  </div>
                  {!hasCustomer && (
                    <p className="text-sm text-muted-foreground">
                      You don't have a Stripe subscription on file yet. Start your 14-day free trial from the
                      pricing page to unlock billing management here.
                    </p>
                  )}
                </>
              );
            })()}
          </CardContent>
          <CardFooter className="border-t border-border pt-6 flex gap-3">
            <Button
              onClick={handleOpenPortal}
              disabled={billingPortal.isPending || !settings?.stripeCustomerId}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {billingPortal.isPending ? "Opening..." : "Manage billing"}
            </Button>
            {!settings?.stripeCustomerId && (
              <Button variant="outline" onClick={() => (window.location.href = "/api/checkout")}>
                Start subscription
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="mr-2 h-5 w-5" />
              General Preferences
            </CardTitle>
            <CardDescription>Configure application thresholds and behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Stale File Threshold (Days)</Label>
                <span className="text-sm font-medium">{threshold} days</span>
              </div>
              <Slider 
                value={[threshold]} 
                onValueChange={([v]) => setThreshold(v)} 
                max={365} 
                min={30} 
                step={15} 
              />
              <p className="text-xs text-muted-foreground">
                Files unmodified for this many days will be flagged as stale in dashboards.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-6">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Naming Conventions</CardTitle>
            <CardDescription>Define regular expressions for the Smart Organiser to enforce.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pattern (Regex)</Label>
              <Input 
                placeholder="e.g. ^\[[A-Z]{2,4}\]-\d{4}-.+" 
                value={pattern} 
                onChange={(e) => setPattern(e.target.value)} 
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="e.g. Project files must start with a department code and year" 
                value={desc} 
                onChange={(e) => setDesc(e.target.value)} 
              />
            </div>
            <div className="bg-muted p-4 rounded-md text-sm">
              <p className="font-semibold mb-2">Pattern Preview</p>
              <p className="text-muted-foreground mb-1">Matches: <span className="text-alert-green font-mono">[ENG]-2024-Q3-Report.pdf</span></p>
              <p className="text-muted-foreground">Fails: <span className="text-alert-red font-mono line-through">QuarterlyReport.pdf</span></p>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-6">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>Save Conventions</Button>
          </CardFooter>
        </Card>

        <Card className="border-alert-red/20">
          <CardHeader>
            <CardTitle className="flex items-center text-alert-red">
              <Database className="mr-2 h-5 w-5" />
              Data & Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
              <div>
                <h4 className="font-medium">Local Cache</h4>
                <p className="text-sm text-muted-foreground">Clear cached files and permissions data. Does not delete Drive files.</p>
              </div>
              <Button variant="outline" onClick={handleClearCache} disabled={clearCache.isPending}>
                {clearCache.isPending ? "Clearing..." : "Clear Cache"}
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
              <div>
                <h4 className="font-medium">Sign out</h4>
                <p className="text-sm text-muted-foreground">End your Fileray session on this device. Your account and Google connection stay intact.</p>
              </div>
              <Button variant="outline" onClick={() => window.location.href = '/api/auth/logout'}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border border-alert-red/30 rounded-lg bg-alert-red/5">
              <div>
                <h4 className="font-medium text-alert-red">Delete account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently remove your Fileray account, settings, and cached data, and revoke Fileray's access to your Google Drive. This cannot be undone.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { if (!deleting) setDeleteDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your Fileray account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke Fileray's access to your Google Drive and permanently delete your Fileray account, settings, and cached scan data. Files in your Google Drive are not affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              disabled={deleting}
              className="bg-alert-red text-white hover:bg-alert-red/90"
            >
              {deleting ? "Deleting..." : "Yes, delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
