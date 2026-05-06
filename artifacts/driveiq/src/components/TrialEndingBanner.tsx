import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useGetSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_STORAGE_KEY = "fileray.trialEndingBanner.dismissedFor";
const WARN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

function formatTrialDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

function describeRemaining(msRemaining: number): string {
  if (msRemaining <= 0) return "today";
  const hours = Math.floor(msRemaining / (60 * 60 * 1000));
  if (hours < 24) {
    if (hours <= 1) return "in less than an hour";
    return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(hours / 24);
  if (days <= 1) return "tomorrow";
  return `in ${days} days`;
}

export function TrialEndingBanner() {
  const { data: settings } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedKey(localStorage.getItem(DISMISS_STORAGE_KEY));
    } catch {
      setDismissedKey(null);
    }
  }, []);

  if (!settings) return null;
  if (settings.subscriptionStatus !== "trialing") return null;
  if (!settings.trialEndsAt) return null;

  const trialEnd = new Date(settings.trialEndsAt);
  if (Number.isNaN(trialEnd.getTime())) return null;

  const msRemaining = trialEnd.getTime() - Date.now();
  if (msRemaining > WARN_WINDOW_MS) return null;

  const trialKey = trialEnd.toISOString();
  if (dismissedKey === trialKey) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, trialKey);
    } catch {
      // ignore — banner will just reappear next reload
    }
    setDismissedKey(trialKey);
  };

  const expired = msRemaining <= 0;
  const headline = expired
    ? "Your free trial has ended"
    : `Your free trial ends ${describeRemaining(msRemaining)}`;
  const subtext = expired
    ? `Add a payment method to keep using Fileray.`
    : `On ${formatTrialDate(trialEnd)} we'll start your monthly subscription. Manage or cancel any time before then.`;

  return (
    <div className="border-b border-alert-amber/40 bg-alert-amber/10 px-6 py-3">
      <div className="flex items-start gap-3 max-w-6xl mx-auto">
        <AlertCircle className="h-5 w-5 text-alert-amber flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{headline}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{subtext}</p>
        </div>
        <Link
          href="/settings"
          className="text-sm font-medium text-alert-orange hover:underline whitespace-nowrap mt-0.5"
        >
          Manage billing
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-7 w-7 -mt-1 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss trial reminder"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
