import { useState } from "react";
import { useTheme } from "next-themes";
import { useCompleteOnboarding, getGetSettingsQueryKey, getGetAuthStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

export function Onboarding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const completeOnboarding = useCompleteOnboarding();

  const [displayName, setDisplayName] = useState("");
  const [staleThreshold, setStaleThreshold] = useState<"30" | "60" | "90">("90");
  const [taggingMode, setTaggingMode] = useState<"manual" | "auto" | "off">("manual");
  const [themePref, setThemePref] = useState<"dark" | "light">("dark");
  const [emailNotifications, setEmailNotifications] = useState(true);

  const isPending = completeOnboarding.isPending;
  const canSubmit = displayName.trim().length > 0 && !isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    completeOnboarding.mutate(
      {
        data: {
          displayName: displayName.trim(),
          staleThresholdDays: parseInt(staleThreshold, 10),
          defaultTaggingMode: taggingMode,
          themePreference: themePref,
          emailNotifications,
        },
      },
      {
        onSuccess: () => {
          setTheme(themePref);
          toast({ title: "All set — welcome to Fileray" });
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAuthStatusQueryKey() });
        },
        onError: () => {
          toast({ title: "Couldn't save your preferences", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">One-time setup</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome to Fileray</h1>
          <p className="text-muted-foreground mt-2">A handful of preferences to tailor your experience. You can change all of these later in Settings.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Tell us a bit about you</CardTitle>
              <CardDescription>We'll use these defaults across the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="displayName">What should we call you?</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Stale-file threshold</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Files untouched longer than this will be flagged as stale.</p>
                </div>
                <RadioGroup
                  value={staleThreshold}
                  onValueChange={(v) => setStaleThreshold(v as "30" | "60" | "90")}
                  className="grid grid-cols-3 gap-3"
                >
                  {(["30", "60", "90"] as const).map((d) => (
                    <Label
                      key={d}
                      htmlFor={`stale-${d}`}
                      className="flex items-center gap-2 border rounded-md px-4 py-3 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:border-primary"
                    >
                      <RadioGroupItem value={d} id={`stale-${d}`} />
                      <span className="font-medium">{d} days</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Default tagging mode</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">How should Fileray suggest tags when you upload?</p>
                </div>
                <RadioGroup
                  value={taggingMode}
                  onValueChange={(v) => setTaggingMode(v as "manual" | "auto" | "off")}
                  className="space-y-2"
                >
                  {[
                    { v: "manual", t: "Manual", d: "Suggest tags but I'll pick them myself" },
                    { v: "auto", t: "Auto-apply", d: "Apply suggested tags without asking" },
                    { v: "off", t: "Off", d: "Don't suggest tags" },
                  ].map((opt) => (
                    <Label
                      key={opt.v}
                      htmlFor={`tag-${opt.v}`}
                      className="flex items-start gap-3 border rounded-md px-4 py-3 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:border-primary"
                    >
                      <RadioGroupItem value={opt.v} id={`tag-${opt.v}`} className="mt-0.5" />
                      <div>
                        <div className="font-medium">{opt.t}</div>
                        <div className="text-xs text-muted-foreground">{opt.d}</div>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Theme</Label>
                <RadioGroup
                  value={themePref}
                  onValueChange={(v) => setThemePref(v as "dark" | "light")}
                  className="grid grid-cols-2 gap-3"
                >
                  {(["dark", "light"] as const).map((t) => (
                    <Label
                      key={t}
                      htmlFor={`theme-${t}`}
                      className="flex items-center gap-2 border rounded-md px-4 py-3 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:border-primary capitalize"
                    >
                      <RadioGroupItem value={t} id={`theme-${t}`} />
                      <span className="font-medium">{t}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between border-t pt-6">
                <div>
                  <Label htmlFor="emailNotifs" className="text-base">Email notifications</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Weekly digests of stale files and oversharing alerts.</p>
                </div>
                <Switch
                  id="emailNotifs"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end mt-6">
            <Button type="submit" size="lg" disabled={!canSubmit}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Take me to Fileray →"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
