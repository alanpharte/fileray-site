import { useState, useMemo, useCallback, useEffect } from "react";
import { useGetFolderTree, getGetFolderTreeQueryKey } from "@workspace/api-client-react";
import {
  Search,
  FolderOpen,
  FolderClosed,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Loader2,
  ChevronsUpDown,
  ChevronsDownUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FolderData {
  id: string;
  name: string;
  parentId?: string | null;
  itemCount: number;
}

interface TreeNode {
  id: string;
  name: string;
  parentId: string | null;
  itemCount: number;
  children: TreeNode[];
  depth: number;
}

function buildTree(folders: FolderData[], rootId: string): TreeNode | null {
  const map = new Map<string, TreeNode>();
  for (const f of folders) {
    map.set(f.id, {
      id: f.id,
      name: f.name,
      parentId: f.parentId ?? null,
      itemCount: f.itemCount,
      children: [],
      depth: 0,
    });
  }

  const assigned = new Set<string>();
  for (const node of map.values()) {
    if (node.parentId && node.parentId !== node.id && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
      assigned.add(node.id);
    }
  }

  const root = map.get(rootId);
  if (root) {
    for (const node of map.values()) {
      if (node.id === rootId) continue;
      if (!assigned.has(node.id)) {
        node.parentId = rootId;
        root.children.push(node);
      }
    }
  }

  function setDepth(n: TreeNode, d: number) {
    n.depth = d;
    n.children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of n.children) setDepth(child, d + 1);
  }

  if (root) setDepth(root, 0);
  return root || null;
}

function countDescendants(node: TreeNode): number {
  let count = node.children.length;
  for (const child of node.children) count += countDescendants(child);
  return count;
}

function collectAllIds(node: TreeNode): string[] {
  const ids: string[] = [node.id];
  for (const child of node.children) ids.push(...collectAllIds(child));
  return ids;
}

function findMatchingIds(node: TreeNode, query: string): { visible: Set<string>; direct: Set<string> } {
  const visible = new Set<string>();
  const direct = new Set<string>();
  const q = query.toLowerCase();

  function walk(n: TreeNode, ancestors: string[]) {
    const nameMatch = n.name.toLowerCase().includes(q);
    if (nameMatch) {
      direct.add(n.id);
      visible.add(n.id);
      for (const a of ancestors) visible.add(a);
    }
    for (const child of n.children) {
      walk(child, [...ancestors, n.id]);
    }
  }

  walk(node, []);
  return { visible, direct };
}

function FolderRow({
  node,
  expandedIds,
  onToggle,
  searchQuery,
  matchingIds,
}: {
  node: TreeNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  searchQuery: string;
  matchingIds: Set<string> | null;
}) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const descendantCount = useMemo(() => countDescendants(node), [node]);
  const isMatch = matchingIds ? matchingIds.has(node.id) : true;
  const isDirectMatch = searchQuery
    ? node.name.toLowerCase().includes(searchQuery.toLowerCase())
    : false;

  if (matchingIds && !isMatch) return null;

  const visibleChildren = isExpanded
    ? node.children.filter((child) => !matchingIds || matchingIds.has(child.id))
    : [];

  return (
    <div>
      <div
        className={`group flex items-center gap-1 py-1.5 px-2 rounded-lg transition-colors hover:bg-muted/60 ${
          isDirectMatch && searchQuery ? "bg-primary/8" : ""
        }`}
        style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <div className="w-6 shrink-0" />
        )}

        {isExpanded && hasChildren ? (
          <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
        ) : (
          <FolderClosed className="h-4 w-4 text-amber-500 shrink-0" />
        )}

        <span
          className={`text-sm font-medium truncate flex-1 ml-1 ${
            isDirectMatch && searchQuery ? "text-primary" : "text-foreground"
          }`}
        >
          {node.name}
        </span>

        {hasChildren && (
          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 mr-1">
            {node.children.length} {node.children.length === 1 ? "folder" : "folders"}
            {descendantCount > node.children.length && (
              <span className="text-muted-foreground/60"> · {descendantCount} total</span>
            )}
          </span>
        )}

        <a
          href={`https://drive.google.com/drive/folders/${node.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {isExpanded && visibleChildren.length > 0 && (
        <div>
          {visibleChildren.map((child) => (
            <FolderRow
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              onToggle={onToggle}
              searchQuery={searchQuery}
              matchingIds={matchingIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderExplorer() {
  const { data, isLoading, error } = useGetFolderTree({
    query: {
      queryKey: getGetFolderTreeQueryKey(),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  });

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [initialized, setInitialized] = useState(false);

  const fullTree = useMemo(() => {
    if (!data?.folders || !data?.rootId) return null;
    return buildTree(data.folders, data.rootId);
  }, [data]);

  useEffect(() => {
    if (fullTree && !initialized) {
      setExpandedIds(new Set([fullTree.id]));
      setInitialized(true);
    }
  }, [fullTree, initialized]);

  const searchResult = useMemo(() => {
    if (!searchQuery.trim() || !fullTree) return null;
    return findMatchingIds(fullTree, searchQuery.trim());
  }, [fullTree, searchQuery]);

  const matchingIds = searchResult?.visible ?? null;
  const directMatchCount = searchResult?.direct.size ?? null;

  useEffect(() => {
    if (matchingIds && fullTree) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        for (const id of matchingIds) next.add(id);
        return next;
      });
    }
  }, [matchingIds, fullTree]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!fullTree) return;
    setExpandedIds(new Set(collectAllIds(fullTree)));
  }, [fullTree]);

  const collapseAll = useCallback(() => {
    if (!fullTree) return;
    setExpandedIds(new Set([fullTree.id]));
  }, [fullTree]);

  const totalFolders = data?.folders?.length ?? 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground text-sm">Loading folder structure...</span>
        <span className="text-muted-foreground/60 text-xs">This may take a moment for large drives</span>
      </div>
    );
  }

  if (error || !fullTree) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Unable to load folder structure</p>
      </div>
    );
  }

  const matchCount = directMatchCount;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto -mt-2">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search folders..."
            className="pl-9 h-9 bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {matchCount !== null ? `${matchCount} matches · ` : ""}
            {totalFolders} folders
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1.5"
            onClick={expandAll}
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1.5"
            onClick={collapseAll}
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            Collapse
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border bg-card p-2">
        <FolderRow
          node={fullTree}
          expandedIds={expandedIds}
          onToggle={toggleExpand}
          searchQuery={searchQuery}
          matchingIds={matchingIds}
        />
      </div>
    </div>
  );
}
