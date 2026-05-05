import { useState, useMemo, useRef } from "react";
import {
  useGetFolderTree,
  getGetFolderTreeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload as UploadIcon,
  FolderPlus,
  Folder as FolderIcon,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
  FileIcon,
  ChevronRight,
  Search as SearchIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type DestinationMode = "existing" | "new";
type TagMode = "custom" | "ai" | "none";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

interface FolderNodeFlat {
  id: string;
  name: string;
  parentId: string | null;
  itemCount: number;
}

function buildFolderPaths(folders: FolderNodeFlat[], rootId: string): Array<{ id: string; label: string; depth: number }> {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const result: Array<{ id: string; label: string; depth: number }> = [];

  function pathOf(id: string): string {
    const parts: string[] = [];
    let current: string | null = id;
    let safety = 0;
    while (current && safety < 50) {
      const node = byId.get(current);
      if (!node) break;
      parts.unshift(node.name);
      current = node.parentId;
      safety++;
    }
    return parts.join(" / ");
  }

  function depthOf(id: string): number {
    let depth = 0;
    let current: string | null = byId.get(id)?.parentId ?? null;
    while (current && depth < 50) {
      depth++;
      current = byId.get(current)?.parentId ?? null;
    }
    return depth;
  }

  const sorted = [...folders].sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id)));
  for (const f of sorted) {
    result.push({ id: f.id, label: pathOf(f.id) || f.name, depth: depthOf(f.id) });
  }

  const rootIdx = result.findIndex((r) => r.id === rootId);
  if (rootIdx > 0) {
    const [root] = result.splice(rootIdx, 1);
    result.unshift(root);
  }

  return result;
}

export function Upload() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: folderTree, isLoading: foldersLoading } = useGetFolderTree({
    query: { queryKey: getGetFolderTreeQueryKey() },
  });

  const folderOptions = useMemo(() => {
    if (!folderTree) return [];
    const flat: FolderNodeFlat[] = folderTree.folders.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId ?? null,
      itemCount: f.itemCount ?? 0,
    }));
    return buildFolderPaths(flat, folderTree.rootId);
  }, [folderTree]);

  const [file, setFile] = useState<File | null>(null);
  const [destinationMode, setDestinationMode] = useState<DestinationMode>("existing");
  const [folderSearch, setFolderSearch] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentSearch, setNewFolderParentSearch] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  const [tagMode, setTagMode] = useState<TagMode>("custom");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [aiTagging, setAiTagging] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [completedFile, setCompletedFile] = useState<{ name: string; webViewLink: string | null } | null>(null);

  const filteredFolders = useMemo(() => {
    const q = folderSearch.toLowerCase().trim();
    if (!q) return folderOptions;
    return folderOptions.filter((f) => f.label.toLowerCase().includes(q));
  }, [folderOptions, folderSearch]);

  const filteredParentOptions = useMemo(() => {
    const q = newFolderParentSearch.toLowerCase().trim();
    if (!q) return folderOptions;
    return folderOptions.filter((f) => f.label.toLowerCase().includes(q));
  }, [folderOptions, newFolderParentSearch]);

  function pickFile(f: File | null) {
    setFile(f);
    setCompletedFile(null);
    if (tagMode === "ai") setTags([]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    pickFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  function addTagFromInput() {
    const cleaned = tagInput
      .split(/[,\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 50 && !tags.includes(t));
    if (cleaned.length === 0) return;
    setTags([...tags, ...cleaned].slice(0, 20));
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  async function fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function handleAiSuggest() {
    if (!file) {
      toast({ title: "Choose a file first", description: "Select a file before generating tags.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large for AI tagging", description: "Files larger than 10 MB cannot be auto-tagged. Add custom tags instead.", variant: "destructive" });
      return;
    }
    setAiTagging(true);
    try {
      const isImage = (file.type || "").startsWith("image/");
      const body: Record<string, string> = {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
      };
      if (isImage) {
        body.base64Data = await fileToBase64(file);
      }
      const resp = await fetch(`${BASE}/api/files/auto-tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(err || `Auto-tag failed (${resp.status})`);
      }
      const data = await resp.json();
      setTags((data.tags as string[]).slice(0, 20));
      toast({ title: "Tags generated", description: `Added ${data.tags.length} suggested tags.` });
    } catch (err: any) {
      toast({ title: "Could not generate tags", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setAiTagging(false);
    }
  }

  function validate(): string | null {
    if (!file) return "Please choose a file to upload.";
    if (file.size > 100 * 1024 * 1024) return "File is too large. Maximum upload size is 100 MB.";
    if (destinationMode === "new") {
      if (!newFolderName.trim()) return "Please enter a name for the new folder.";
    }
    return null;
  }

  async function handleUpload() {
    const error = validate();
    if (error) {
      toast({ title: "Cannot upload yet", description: error, variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setCompletedFile(null);

    try {
      let parentId: string | null = null;
      if (destinationMode === "existing") {
        parentId = selectedFolderId === folderTree?.rootId ? null : selectedFolderId;
      } else {
        const parent = newFolderParentId === folderTree?.rootId ? null : newFolderParentId;
        const folderResp = await fetch(`${BASE}/api/folders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newFolderName.trim(), parentId: parent }),
        });
        if (!folderResp.ok) {
          const txt = await folderResp.text();
          throw new Error(`Could not create folder: ${txt}`);
        }
        const folderData = await folderResp.json();
        parentId = folderData.id;
      }

      const finalTags = tagMode === "none" ? [] : tags;

      const form = new FormData();
      form.append("file", file as File);
      form.append("name", (file as File).name);
      if (parentId) form.append("parentId", parentId);
      if (finalTags.length > 0) form.append("tags", JSON.stringify(finalTags));

      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${BASE}/api/files/upload`);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { resolve({}); }
          } else {
            reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(form);
      });

      setCompletedFile({
        name: result.name || (file as File).name,
        webViewLink: result.webViewLink || null,
      });

      queryClient.invalidateQueries({ queryKey: getGetFolderTreeQueryKey() });

      toast({
        title: "Upload complete",
        description: `${result.name || (file as File).name} was uploaded to your Drive.`,
      });

      setFile(null);
      setTags([]);
      setTagInput("");
      setNewFolderName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: "var(--app-font-heading)", letterSpacing: "-0.02em" }}>
          Upload to Drive
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send any file straight to your Google Drive. Choose where it lives, add tags, or let AI describe it for you.
        </p>
      </div>

      {completedFile && (
        <Card className="p-4 border-primary/40 bg-primary/5 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{completedFile.name} uploaded successfully</p>
            {completedFile.webViewLink && (
              <a href={completedFile.webViewLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                Open in Google Drive →
              </a>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCompletedFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <div>
          <Label className="text-sm font-semibold">1. Choose a file</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Any file type Google Drive accepts. Up to 100 MB per file.</p>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileIcon className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium truncate max-w-md">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)} · {file.type || "unknown type"}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); pickFile(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadIcon className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Click to choose a file or drag and drop</p>
              <p className="text-xs text-muted-foreground">Images, videos, PDFs, documents, archives — anything supported by Google Drive</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <Label className="text-sm font-semibold">2. Pick the destination</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Save into an existing folder or create a brand new one.</p>
        </div>

        <RadioGroup
          value={destinationMode}
          onValueChange={(v) => setDestinationMode(v as DestinationMode)}
          className="grid grid-cols-2 gap-3"
        >
          <label className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer ${destinationMode === "existing" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="existing" id="dest-existing" />
            <FolderIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Existing folder</span>
          </label>
          <label className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer ${destinationMode === "new" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="new" id="dest-new" />
            <FolderPlus className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Create new folder</span>
          </label>
        </RadioGroup>

        {destinationMode === "existing" && (
          <div className="space-y-2">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search folders..."
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto border border-border rounded-md divide-y divide-border">
              {foldersLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading folders...
                </div>
              ) : filteredFolders.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No folders match.</div>
              ) : (
                filteredFolders.slice(0, 200).map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => setSelectedFolderId(f.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 ${selectedFolderId === f.id ? "bg-primary/10" : ""}`}
                    style={{ paddingLeft: `${12 + f.depth * 16}px` }}
                  >
                    <FolderIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{f.label}</span>
                    {selectedFolderId === f.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                ))
              )}
            </div>
            {filteredFolders.length > 200 && (
              <p className="text-xs text-muted-foreground">Showing first 200 — refine your search to see more.</p>
            )}
          </div>
        )}

        {destinationMode === "new" && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-folder-name" className="text-xs">New folder name</Label>
              <Input
                id="new-folder-name"
                placeholder="e.g. Brand Assets 2026"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                maxLength={255}
              />
            </div>

            <div>
              <Label className="text-xs">Where should it live?</Label>
              <p className="text-xs text-muted-foreground mb-2">Pick a parent folder. Choose "My Drive" to create a top-level folder.</p>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parent folders..."
                  value={newFolderParentSearch}
                  onChange={(e) => setNewFolderParentSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded-md divide-y divide-border">
                {foldersLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                  </div>
                ) : filteredParentOptions.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No folders match.</div>
                ) : (
                  filteredParentOptions.slice(0, 200).map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => setNewFolderParentId(f.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 ${newFolderParentId === f.id ? "bg-primary/10" : ""}`}
                      style={{ paddingLeft: `${12 + f.depth * 16}px` }}
                    >
                      <FolderIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{f.label}</span>
                      {newFolderParentId === f.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))
                )}
              </div>
              {newFolderName && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <FolderPlus className="h-3 w-3" />
                  Will create:{" "}
                  <span className="font-medium text-foreground">
                    {newFolderParentId
                      ? `${folderOptions.find((f) => f.id === newFolderParentId)?.label || ""} / ${newFolderName}`
                      : `My Drive / ${newFolderName}`}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <Label className="text-sm font-semibold">3. Tag your file</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Tags make this file easier to find later.</p>
        </div>

        <RadioGroup
          value={tagMode}
          onValueChange={(v) => { setTagMode(v as TagMode); if (v === "none") setTags([]); }}
          className="grid grid-cols-3 gap-3"
        >
          <label className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer ${tagMode === "custom" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="custom" id="tag-custom" />
            <span className="text-sm font-medium">Custom tags</span>
          </label>
          <label className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer ${tagMode === "ai" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="ai" id="tag-ai" />
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI auto-tag</span>
          </label>
          <label className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer ${tagMode === "none" ? "border-primary bg-primary/5" : "border-border"}`}>
            <RadioGroupItem value="none" id="tag-none" />
            <span className="text-sm font-medium">No tags</span>
          </label>
        </RadioGroup>

        {tagMode === "custom" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Type a tag and press Enter (or comma-separate)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTagFromInput(); }
                }}
                maxLength={120}
              />
              <Button type="button" variant="outline" onClick={addTagFromInput}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1 pr-1">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="ml-1 hover:bg-background/30 rounded-sm">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Up to 20 tags. Tags are saved to the file's metadata in Drive.</p>
          </div>
        )}

        {tagMode === "ai" && (
          <div className="space-y-2">
            <Button type="button" onClick={handleAiSuggest} disabled={aiTagging || !file} variant="outline" className="gap-2">
              {aiTagging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
              {aiTagging ? "Analysing file..." : tags.length > 0 ? "Regenerate tags" : "Generate tags with AI"}
            </Button>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1 pr-1">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="ml-1 hover:bg-background/30 rounded-sm">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              AI looks at the actual contents of images and uses the file name + type for everything else. You can edit the tags before uploading.
            </p>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-end gap-3 pb-4">
        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading {uploadProgress}%
          </div>
        )}
        <Button onClick={handleUpload} disabled={uploading || !file} className="gap-2">
          <UploadIcon className="h-4 w-4" />
          Upload to Drive
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
