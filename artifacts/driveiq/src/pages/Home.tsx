import { useSearchFiles, getSearchFilesQueryKey, useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import type { SearchFilesFileType } from "@workspace/api-client-react";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search as SearchIcon,
  Download,
  FolderOpen,
  Lock,
  Globe,
  Users,
  User,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Film,
  Music,
  File,
  ChevronRight,
  X,
  Loader2,
  ExternalLink,
  ListFilter,
  Link2,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FilePreviewPanel } from "@/components/FilePreviewPanel";
import { PermissionPopover } from "@/components/PermissionPopover";
import { SmartSearchPanel } from "@/components/SmartSearchPanel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getMimeIcon(mimeType: string) {
  if (mimeType.includes("document") || mimeType === "application/pdf") return FileText;
  if (mimeType.includes("spreadsheet")) return FileSpreadsheet;
  if (mimeType.includes("presentation")) return Presentation;
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.includes("folder")) return FolderOpen;
  return File;
}

function getMimeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    "application/vnd.google-apps.document": "Document",
    "application/vnd.google-apps.spreadsheet": "Spreadsheet",
    "application/vnd.google-apps.presentation": "Slides",
    "application/vnd.google-apps.folder": "Folder",
    "application/vnd.google-apps.drawing": "Drawing",
    "application/pdf": "PDF",
  };
  if (map[mimeType]) return map[mimeType];
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "Archive";
  return "File";
}

function getMimeBadgeColor(mimeType: string): string {
  if (mimeType.includes("document")) return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
  if (mimeType.includes("spreadsheet")) return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
  if (mimeType.includes("presentation")) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
  if (mimeType === "application/pdf") return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
  if (mimeType.startsWith("image/")) return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800";
  if (mimeType.startsWith("video/")) return "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800";
  return "bg-muted text-muted-foreground border-border";
}

function getAccessIcon(summary: string | null) {
  if (!summary) return { icon: Lock, color: "text-muted-foreground", bg: "bg-muted" };
  if (summary.startsWith("Public")) return { icon: Globe, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950" };
  if (summary.startsWith("Link shared")) return { icon: Globe, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950" };
  if (summary.startsWith("Shared")) return { icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950" };
  if (summary.includes("people") || summary.includes("person")) return { icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950" };
  return { icon: Lock, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950" };
}


function formatBytes(bytes: string | null): string {
  if (!bytes) return "";
  const num = parseInt(bytes, 10);
  if (isNaN(num) || num === 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const FILE_TYPE_FILTERS: { value: SearchFilesFileType | null; label: string; icon: typeof FileText }[] = [
  { value: null, label: "All", icon: ListFilter },
  { value: "document" as SearchFilesFileType, label: "Documents", icon: FileText },
  { value: "spreadsheet" as SearchFilesFileType, label: "Spreadsheets", icon: FileSpreadsheet },
  { value: "presentation" as SearchFilesFileType, label: "Slides", icon: Presentation },
  { value: "pdf" as SearchFilesFileType, label: "PDFs", icon: File },
  { value: "image" as SearchFilesFileType, label: "Images", icon: ImageIcon },
  { value: "video" as SearchFilesFileType, label: "Videos", icon: Film },
  { value: "audio" as SearchFilesFileType, label: "Audio", icon: Music },
  { value: "folder" as SearchFilesFileType, label: "Folders", icon: FolderOpen },
];

const FILE_SUB_TYPE_FILTERS: Record<string, { value: string | null; label: string }[]> = {
  image: [
    { value: null, label: "All Images" },
    { value: "png", label: "PNG" },
    { value: "jpeg", label: "JPEG" },
    { value: "svg", label: "SVG" },
    { value: "gif", label: "GIF" },
    { value: "webp", label: "WebP" },
    { value: "bmp", label: "BMP" },
    { value: "tiff", label: "TIFF" },
    { value: "psd", label: "PSD" },
    { value: "heic", label: "HEIC" },
    { value: "ico", label: "ICO" },
  ],
  video: [
    { value: null, label: "All Videos" },
    { value: "mp4", label: "MP4" },
    { value: "mov", label: "MOV" },
    { value: "avi", label: "AVI" },
    { value: "mkv", label: "MKV" },
    { value: "webm", label: "WebM" },
    { value: "wmv", label: "WMV" },
    { value: "mpeg", label: "MPEG" },
    { value: "flv", label: "FLV" },
    { value: "3gp", label: "3GP" },
  ],
  audio: [
    { value: null, label: "All Audio" },
    { value: "mp3", label: "MP3" },
    { value: "wav", label: "WAV" },
    { value: "flac", label: "FLAC" },
    { value: "aac", label: "AAC" },
    { value: "ogg", label: "OGG" },
    { value: "m4a", label: "M4A" },
    { value: "wma", label: "WMA" },
  ],
};

export function Home() {
  const [query, setQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<SearchFilesFileType | null>(null);
  const [fileSubTypeFilter, setFileSubTypeFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [settledQuery, setSettledQuery] = useState("");
  const [settledFilter, setSettledFilter] = useState<SearchFilesFileType | null>(null);
  const [settledSubFilter, setSettledSubFilter] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const activeQueryRef = useRef("");
  const activeFilterRef = useRef<SearchFilesFileType | null>(null);
  const activeSubFilterRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [smartSearchFiles, setSmartSearchFiles] = useState<any[]>([]);
  const [smartSearchTerms, setSmartSearchTerms] = useState<string[]>([]);
  const [isSmartSearchActive, setIsSmartSearchActive] = useState(false);

  const subTypeOptions = fileTypeFilter ? FILE_SUB_TYPE_FILTERS[fileTypeFilter] ?? null : null;

  const { data: summary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const searchParams: Record<string, string> = { q: query };
  if (fileTypeFilter) searchParams.fileType = fileTypeFilter;
  if (fileSubTypeFilter) searchParams.fileSubType = fileSubTypeFilter;
  const searchQueryKey = getSearchFilesQueryKey(searchParams as any);

  const { data: searchResults, isLoading } = useSearchFiles(
    searchParams,
    { query: { enabled: !!query, queryKey: searchQueryKey } }
  );

  useEffect(() => {
    if (!query) {
      setAllFiles([]);
      setNextPageToken(null);
      setSettledQuery("");
      setSettledFilter(null);
      setSettledSubFilter(null);
      setSelectedIds(new Set());
      activeQueryRef.current = "";
      activeFilterRef.current = null;
      activeSubFilterRef.current = null;
      return;
    }
    if (query !== settledQuery || fileTypeFilter !== settledFilter || fileSubTypeFilter !== settledSubFilter) {
      setAllFiles([]);
      setNextPageToken(null);
      setSelectedIds(new Set());
      activeQueryRef.current = query;
      activeFilterRef.current = fileTypeFilter;
      activeSubFilterRef.current = fileSubTypeFilter;
      if (abortRef.current) abortRef.current.abort();
    }
  }, [query, fileTypeFilter, fileSubTypeFilter]);

  useEffect(() => {
    if (!searchResults) return;
    if (query !== activeQueryRef.current && activeQueryRef.current) return;
    activeQueryRef.current = query;
    activeFilterRef.current = fileTypeFilter;
    activeSubFilterRef.current = fileSubTypeFilter;
    setAllFiles(searchResults.files ?? []);
    setNextPageToken((searchResults as any).nextPageToken ?? null);
    setSettledQuery(query);
    setSettledFilter(fileTypeFilter);
    setSettledSubFilter(fileSubTypeFilter);
  }, [searchResults, query, fileTypeFilter, fileSubTypeFilter]);

  const loadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore || !query) return;
    const requestQuery = query;
    const requestToken = nextPageToken;
    const requestFilter = fileTypeFilter;
    const requestSubFilter = fileSubTypeFilter;
    setLoadingMore(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const params = new URLSearchParams({ q: requestQuery, pageToken: requestToken });
      if (requestFilter) params.set("fileType", requestFilter);
      if (requestSubFilter) params.set("fileSubType", requestSubFilter);
      const res = await fetch(`${BASE}/api/files/search?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to load more");
      const data = await res.json();
      if (activeQueryRef.current !== requestQuery || activeFilterRef.current !== requestFilter || activeSubFilterRef.current !== requestSubFilter) return;
      setAllFiles(prev => [...prev, ...(data.files ?? [])]);
      setNextPageToken(data.nextPageToken ?? null);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageToken, loadingMore, query, fileTypeFilter, fileSubTypeFilter]);

  useEffect(() => {
    if (!nextPageToken || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [nextPageToken, loadingMore, loadMore]);

  const files = isSmartSearchActive ? smartSearchFiles : (query ? allFiles : []);

  const toggleSelect = useCallback((fileId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map(f => f.id)));
    }
  }, [selectedIds.size, files]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const openPreview = useCallback((fileId: string) => {
    setPreviewFileId(fileId);
    setPreviewOpen(true);
  }, []);

  const copyFileLink = useCallback((fileId: string, webViewLink: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!webViewLink) return;
    navigator.clipboard.writeText(webViewLink).then(() => {
      setCopiedLinkId(fileId);
      setTimeout(() => setCopiedLinkId(prev => prev === fileId ? null : prev), 2000);
    });
  }, []);

  const handleDownload = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDownloading(true);
    try {
      if (selectedIds.size === 1) {
        const fileId = Array.from(selectedIds)[0];
        const url = `${BASE}/api/files/${fileId}/download`;
        const a = document.createElement("a");
        a.href = url;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const response = await fetch(`${BASE}/api/files/download-bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileIds: Array.from(selectedIds) }),
        });
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Fileray_download_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloading(false);
    }
  }, [selectedIds]);

  const hasSelection = selectedIds.size > 0;

  const statCards = [
    {
      label: "Total Files",
      value: summary?.totalFiles ?? 0,
      color: "text-[#c9ff33]",
      borderColor: "border-[#c9ff33]/30",
      bgGlow: "bg-[#c9ff33]/5 dark:bg-[#c9ff33]/8",
    },
    {
      label: "Shared With Me",
      value: summary?.sharedWithMeCount ?? 0,
      color: "text-[#33d4ff]",
      borderColor: "border-[#33d4ff]/30",
      bgGlow: "bg-[#33d4ff]/5 dark:bg-[#33d4ff]/8",
    },
    {
      label: "Sharing Risks",
      value: summary?.sharingRiskCount ?? 0,
      color: "text-[#ff6b6b]",
      borderColor: "border-[#ff6b6b]/30",
      bgGlow: "bg-[#ff6b6b]/5 dark:bg-[#ff6b6b]/8",
    },
    {
      label: "Stale Files",
      value: summary?.staleFileCount ?? 0,
      color: "text-[#ffb347]",
      borderColor: "border-[#ffb347]/30",
      bgGlow: "bg-[#ffb347]/5 dark:bg-[#ffb347]/8",
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 max-w-6xl mx-auto">
        {!query && !isSmartSearchActive && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className={`rounded-2xl border ${card.borderColor} ${card.bgGlow} p-5 transition-all hover:scale-[1.02]`}
              >
                <p
                  className="text-sm font-semibold text-muted-foreground tracking-wide uppercase"
                  style={{ fontFamily: 'var(--app-font-heading)' }}
                >
                  {card.label}
                </p>
                <p
                  className={`text-4xl font-extrabold mt-2 tracking-tight ${card.color}`}
                  style={{ fontFamily: 'var(--app-font-heading)', letterSpacing: '-0.03em' }}
                >
                  {card.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
            <Input
              placeholder="Search files across all Drive locations..."
              className="pl-14 pr-5 h-16 text-xl bg-card border-2 border-[#c9ff33]/60 focus:border-[#c9ff33] rounded-[100px] shadow-[0_0_0_1px_rgba(201,255,51,0.1)]"
              value={query}
              onChange={(e) => {
                const newQuery = e.target.value;
                setQuery(newQuery);
                if (isSmartSearchActive) {
                  setSmartSearchFiles([]);
                  setSmartSearchTerms([]);
                  setIsSmartSearchActive(false);
                }
                if (!newQuery) {
                  setAllFiles([]);
                  setNextPageToken(null);
                  setSettledQuery("");
                  setSelectedIds(new Set());
                }
              }}
            />
          </div>

          {!isSmartSearchActive && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {FILE_TYPE_FILTERS.map((filter) => {
                  const Icon = filter.icon;
                  const isActive = fileTypeFilter === filter.value;
                  return (
                    <button
                      key={filter.label}
                      onClick={() => {
                        setFileTypeFilter(filter.value);
                        setFileSubTypeFilter(null);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {filter.label}
                    </button>
                  );
                })}
              </div>

              {subTypeOptions && (
                <div className="flex items-center gap-1.5 flex-wrap pl-1">
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  {subTypeOptions.map((sub) => {
                    const isActive = fileSubTypeFilter === sub.value;
                    return (
                      <button
                        key={sub.label}
                        onClick={() => setFileSubTypeFilter(sub.value)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                          isActive
                            ? "bg-primary/15 text-primary border-primary/40"
                            : "bg-card/60 text-muted-foreground border-border/60 hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <SmartSearchPanel
          onResults={(files, terms) => {
            setSmartSearchFiles(files);
            setSmartSearchTerms(terms);
            setIsSmartSearchActive(true);
            setSelectedIds(new Set());
          }}
          onClear={() => {
            setSmartSearchFiles([]);
            setSmartSearchTerms([]);
            setIsSmartSearchActive(false);
            setSelectedIds(new Set());
          }}
          isActive={isSmartSearchActive}
        />

        {(query || isSmartSearchActive) && (
          <div className="space-y-3">
            {!isSmartSearchActive && isLoading && allFiles.length === 0 ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Searching your Drive...</span>
              </div>
            ) : files.length > 0 ? (
              <>
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={hasSelection && selectedIds.size === files.length}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      {files.length} {files.length === 1 ? "result" : "results"}
                      {!isSmartSearchActive && nextPageToken && "+"}
                      {isSmartSearchActive && " via AI Smart Search"}
                      {hasSelection && ` \u00b7 ${selectedIds.size} selected`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearSelection}
                      disabled={!hasSelection}
                      className={`h-8 px-3 text-xs transition-opacity ${!hasSelection ? "opacity-40" : ""}`}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDownload}
                      disabled={!hasSelection || downloading}
                      className={`h-8 px-4 text-xs transition-opacity ${!hasSelection ? "opacity-40" : ""}`}
                    >
                      {downloading ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3 mr-1" />
                      )}
                      {selectedIds.size <= 1
                        ? "Download"
                        : `Download ${selectedIds.size} as ZIP`}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {files.map(file => {
                    const isSelected = selectedIds.has(file.id);
                    const MimeIcon = getMimeIcon(file.mimeType);
                    const mimeLabel = getMimeLabel(file.mimeType);
                    const mimeBadgeColor = getMimeBadgeColor(file.mimeType);
                    const accessInfo = getAccessIcon(file.permissionsSummary ?? null);
                    const AccessIcon = accessInfo.icon;
                    const sizeStr = formatBytes(file.size ?? null);
                    const ownerName = file.owners?.[0]?.displayName ?? "";
                    const breadcrumbs = (file as any).breadcrumbSegments as Array<{ id: string; name: string }> | undefined;
                    const permDetails = (file as any).permissionDetails as Array<{ displayName: string; emailAddress: string | null; role: string; type: string }> | undefined;

                    return (
                      <Card
                        key={file.id}
                        className={`group transition-all duration-150 cursor-pointer border ${
                          isSelected
                            ? "ring-2 ring-primary/40 border-primary/30 bg-primary/5"
                            : "hover:border-border/80 hover:shadow-sm"
                        }`}
                        onClick={() => toggleSelect(file.id)}
                      >
                        <div className="p-3 space-y-2.5">
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5 shrink-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(file.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>

                            {file.thumbnailLink ? (
                              <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center border shrink-0">
                                <img
                                  src={file.thumbnailLink.replace(/=s\d+$/, "=s400")}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = "none";
                                    const parent = target.parentElement;
                                    if (parent) {
                                      const fallback = document.createElement("div");
                                      fallback.className = "w-full h-full flex items-center justify-center";
                                      fallback.innerHTML = `<svg class="h-10 w-10 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
                                      parent.appendChild(fallback);
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border shrink-0">
                                <MimeIcon className="h-10 w-10 text-muted-foreground" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-sm text-foreground leading-tight line-clamp-2">
                                    {file.name}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] px-1.5 py-0 h-[18px] font-medium ${mimeBadgeColor}`}
                                    >
                                      {mimeLabel}
                                    </Badge>
                                    {sizeStr && (
                                      <span className="text-[11px] text-muted-foreground">{sizeStr}</span>
                                    )}
                                    <span className="text-[11px] text-muted-foreground">
                                      {formatDate(file.modifiedTime)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2.5 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary"
                                    onClick={(e) => { e.stopPropagation(); openPreview(file.id); }}
                                  >
                                    Preview
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={`h-7 px-2.5 text-xs ${
                                      copiedLinkId === file.id
                                        ? "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30"
                                        : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                                    }`}
                                    onClick={(e) => copyFileLink(file.id, file.webViewLink ?? null, e)}
                                  >
                                    {copiedLinkId === file.id ? "Copied!" : "Copy"}
                                  </Button>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={file.webViewLink ?? "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 rounded-md text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>Open in Google Drive</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>

                              {ownerName && (
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <User className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{ownerName}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pl-7 flex-wrap">
                            {breadcrumbs && breadcrumbs.length > 0 && (
                              <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground overflow-hidden">
                                <FolderOpen className="h-3 w-3 shrink-0 mr-0.5" />
                                {breadcrumbs.map((seg, i) => (
                                  <span key={seg.id} className="flex items-center shrink-0">
                                    {i > 0 && <ChevronRight className="h-2.5 w-2.5 mx-0.5 text-muted-foreground/50" />}
                                    <a
                                      href={`https://drive.google.com/drive/folders/${seg.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="hover:text-primary hover:underline transition-colors whitespace-nowrap"
                                    >
                                      {seg.name}
                                    </a>
                                  </span>
                                ))}
                              </div>
                            )}

                            {!breadcrumbs?.length && file.locationBreadcrumb && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <FolderOpen className="h-3 w-3 shrink-0" />
                                <span>{file.locationBreadcrumb}</span>
                              </div>
                            )}

                            <PermissionPopover
                              fileId={file.id}
                              permDetails={permDetails as any}
                              ownerName={ownerName}
                              shared={!!file.shared}
                              onPermissionUpdated={(permId, newRole) => {
                                const updater = (prev: any[]) => prev.map(f => {
                                  if (f.id !== file.id) return f;
                                  const updatedPerms = ((f as any).permissionDetails || []).map((p: any) =>
                                    p.id === permId ? { ...p, role: newRole } : p
                                  );
                                  return { ...f, permissionDetails: updatedPerms };
                                });
                                if (isSmartSearchActive) {
                                  setSmartSearchFiles(updater);
                                } else {
                                  setAllFiles(updater);
                                }
                              }}
                              trigger={
                                <div
                                  className={`flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 cursor-pointer hover:opacity-80 transition-opacity ${accessInfo.bg}`}
                                >
                                  <AccessIcon className={`h-3 w-3 ${accessInfo.color}`} />
                                  <span className={accessInfo.color}>
                                    {file.permissionsSummary ?? "Unknown"}
                                  </span>
                                </div>
                              }
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {!isSmartSearchActive && nextPageToken && (
                  <div ref={loadMoreRef} className="flex items-center justify-center py-6">
                    {loadingMore ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading more results...</span>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={loadMore}>
                        Load more results
                      </Button>
                    )}
                  </div>
                )}

                {!isSmartSearchActive && !nextPageToken && files.length > 20 && (
                  <div className="text-center py-4">
                    <span className="text-xs text-muted-foreground">All {files.length} results loaded</span>
                  </div>
                )}
              </>
            ) : (!isLoading || isSmartSearchActive) ? (
              <div className="text-center py-16 text-muted-foreground">
                <SearchIcon className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>
                  {isSmartSearchActive
                    ? "No files found matching your description"
                    : <>No files found matching &ldquo;{query}&rdquo;</>}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {hasSelection && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <Card className="shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm">
              <div className="flex items-center gap-4 px-5 py-3">
                <span className="text-sm font-medium">
                  {selectedIds.size} {selectedIds.size === 1 ? "file" : "files"} selected
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearSelection}
                  className="h-8"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="h-8"
                >
                  {downloading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {selectedIds.size === 1
                    ? "Download file"
                    : `Download ${selectedIds.size} as ZIP`}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      <FilePreviewPanel
        fileId={previewFileId}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </TooltipProvider>
  );
}
