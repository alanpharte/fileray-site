import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings, useClearCache } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Database, LogOut, Settings as SettingsIcon } from "lucide-react";

export function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() }
  });

  const updateSettings = useUpdateSettings();
  const clearCache = useClearCache();

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

  if (isLoading) return <div>Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Configure DriveIQ behaviors and connections.</p>
      </div>

      <div className="grid gap-6">
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
            <div className="flex items-center justify-between p-4 border border-alert-red/30 rounded-lg bg-alert-red/5">
              <div>
                <h4 className="font-medium text-alert-red">Disconnect Account</h4>
                <p className="text-sm text-muted-foreground">Revoke DriveIQ's access to your Google Drive.</p>
              </div>
              <Button variant="destructive" onClick={() => window.location.href = '/api/auth/logout'}>
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
