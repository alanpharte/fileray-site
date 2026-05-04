import { useState } from "react";
import { useSmartSearchFiles } from "@workspace/api-client-react";
import { Sparkles, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

const FILE_TYPE_OPTIONS = [
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "jpeg", label: "JPEG" },
  { value: "svg", label: "SVG" },
  { value: "psd", label: "PSD" },
  { value: "gif", label: "GIF" },
  { value: "webp", label: "WebP" },
  { value: "pdf", label: "PDF" },
  { value: "ai", label: "AI" },
  { value: "eps", label: "EPS" },
  { value: "tiff", label: "TIFF" },
  { value: "doc", label: "DOC" },
  { value: "docx", label: "DOCX" },
  { value: "xls", label: "XLS" },
  { value: "xlsx", label: "XLSX" },
  { value: "ppt", label: "PPT" },
  { value: "pptx", label: "PPTX" },
  { value: "mp4", label: "MP4" },
  { value: "mov", label: "MOV" },
];

interface SmartSearchPanelProps {
  onResults: (files: any[], searchTerms: string[]) => void;
  onClear: () => void;
  isActive: boolean;
}

export function SmartSearchPanel({ onResults, onClear, isActive }: SmartSearchPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [lastTerms, setLastTerms] = useState<string[]>([]);
  const [showFileTypes, setShowFileTypes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const smartSearch = useSmartSearchFiles();

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSearch = async () => {
    if (!description.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const result = await smartSearch.mutateAsync({
        data: {
          description: description.trim(),
          fileTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
        },
      });
      setLastTerms(result.searchTerms ?? []);
      onResults(result.files ?? [], result.searchTerms ?? []);
    } catch {
      setError("Smart search failed. Please try again or refine your description.");
      onResults([], []);
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setDescription("");
    setSelectedTypes([]);
    setLastTerms([]);
    setError(null);
    onClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  if (!expanded && !isActive) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors px-1 py-1.5"
      >
        <Sparkles className="h-4 w-4" />
        <span>Can't remember the file name? Try <span className="font-medium text-primary">AI Smart Search</span></span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI Smart Search</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-[18px] border-primary/30 text-primary">
            AI-Powered
          </Badge>
        </div>
        <button
          onClick={() => {
            if (isActive) {
              handleClear();
            }
            setExpanded(false);
          }}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {isActive ? <X className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Describe what's in the file you're looking for. The AI will generate smart search terms to find it for you.
      </p>

      <div className="space-y-3">
        <Textarea
          placeholder="Describe what's in the file... e.g. 'a red car on a beach with sunset' or 'quarterly revenue chart with pie graph'"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[80px] text-sm bg-background resize-none"
          disabled={searching}
        />

        <div className="space-y-1.5">
          <button
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowFileTypes(prev => !prev)}
          >
            {showFileTypes ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Filter by file type {selectedTypes.length > 0 && `(${selectedTypes.length} selected)`}
          </button>
          {showFileTypes && (
            <div className="flex flex-wrap gap-1.5">
              {FILE_TYPE_OPTIONS.map((opt) => {
                const active = selectedTypes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleType(opt.value)}
                    disabled={searching}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    .{opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSearch}
            disabled={!description.trim() || searching}
            size="sm"
            className="gap-1.5"
          >
            {searching ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching with AI...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Smart Search
              </>
            )}
          </Button>
          {isActive && (
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear Results
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {lastTerms.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">AI searched for:</span>
            {lastTerms.map((term, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-[18px]"
              >
                {term}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
