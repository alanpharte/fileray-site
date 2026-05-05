import { Sparkles } from "lucide-react";

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
