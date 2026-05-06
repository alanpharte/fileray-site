import { Sparkles, Info } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ScopeLimitedBannerProps {
  feature: string;
  description: string;
}

export function ScopeLimitedBanner({ feature, description }: ScopeLimitedBannerProps) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 mb-4 flex items-start gap-3">
      <Sparkles className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-amber-100">
          {feature} — Coming soon
        </p>
        <p className="text-sm text-amber-100/80 mt-1">
          {description} While Fileray is on the narrow <code className="text-xs bg-amber-500/20 px-1 rounded">drive.file</code> scope, this view is limited to files you've created or opened with Fileray. Full-Drive access is being submitted for Google verification.
        </p>
      </div>
    </div>
  );
}

interface ScopeEmptyNoticeProps {
  title?: string;
  context?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Friendly explainer shown when a Drive-backed view is empty because of the
 * narrow `drive.file` OAuth scope. Makes it clear this is by design (privacy
 * friendly), not a bug, and points users at the Upload page.
 */
export function ScopeEmptyNotice({
  title = "Looks empty? That's by design.",
  context,
  className = "",
  compact = false,
}: ScopeEmptyNoticeProps) {
  const padding = compact ? "p-3" : "p-4";
  return (
    <div
      className={`rounded-lg border border-[#c9ff33]/30 bg-[#c9ff33]/5 ${padding} flex items-start gap-3 text-left ${className}`}
    >
      <Info className="h-5 w-5 text-[#c9ff33] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          For your privacy, Fileray only sees files you've uploaded through Fileray or opened with Fileray — not your whole Drive.
          {context ? ` ${context} ` : " "}
          <a
            href={`${BASE}/upload`}
            className="text-[#c9ff33] hover:underline font-medium whitespace-nowrap"
          >
            Upload a file
          </a>{" "}
          to start populating this view.
        </p>
      </div>
    </div>
  );
}
