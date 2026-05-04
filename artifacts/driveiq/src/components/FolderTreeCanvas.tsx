import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useGetFolderTree, getGetFolderTreeQueryKey } from "@workspace/api-client-react";
import { Loader2, FolderOpen, Minus, Plus, Maximize2, ChevronRight, ChevronDown } from "lucide-react";
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
  x: number;
  y: number;
  subtreeWidth: number;
}

const NODE_W = 180;
const NODE_H = 40;
const H_GAP = 20;
const V_GAP = 56;

function buildTree(folders: FolderData[], rootId: string): TreeNode | null {
  const map = new Map<string, TreeNode>();
  for (const f of folders) {
    map.set(f.id, {
      id: f.id,
      name: f.name,
      parentId: f.parentId ?? null,
      itemCount: f.itemCount,
      children: [],
      x: 0,
      y: 0,
      subtreeWidth: 0,
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

  for (const node of map.values()) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  return root || null;
}

function layoutTree(node: TreeNode, expandedIds: Set<string>, depth = 0): number {
  node.y = depth * (NODE_H + V_GAP);
  const isExpanded = expandedIds.has(node.id);

  if (node.children.length === 0 || !isExpanded) {
    node.subtreeWidth = NODE_W;
    return node.subtreeWidth;
  }

  let totalChildWidth = 0;
  for (let i = 0; i < node.children.length; i++) {
    totalChildWidth += layoutTree(node.children[i], expandedIds, depth + 1);
    if (i < node.children.length - 1) totalChildWidth += H_GAP;
  }

  node.subtreeWidth = Math.max(NODE_W, totalChildWidth);

  let xOffset = -(node.subtreeWidth / 2);
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    child.x = xOffset + child.subtreeWidth / 2;
    xOffset += child.subtreeWidth + H_GAP;
  }

  return node.subtreeWidth;
}

function positionAbsolute(node: TreeNode, parentX: number, expandedIds: Set<string>) {
  node.x = parentX + node.x;
  if (expandedIds.has(node.id)) {
    for (const child of node.children) {
      positionAbsolute(child, node.x, expandedIds);
    }
  }
}

function collectVisible(node: TreeNode, expandedIds: Set<string>): { nodes: TreeNode[]; edges: Array<{ from: TreeNode; to: TreeNode }> } {
  const nodes: TreeNode[] = [];
  const edges: Array<{ from: TreeNode; to: TreeNode }> = [];

  function walk(n: TreeNode) {
    nodes.push(n);
    if (expandedIds.has(n.id)) {
      for (const child of n.children) {
        edges.push({ from: n, to: child });
        walk(child);
      }
    }
  }

  walk(node);
  return { nodes, edges };
}

export function FolderTreeCanvas() {
  const { data, isLoading, error } = useGetFolderTree({
    query: {
      queryKey: getGetFolderTreeQueryKey(),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const totalFolderCount = useRef(0);

  const fullTree = useMemo(() => {
    if (!data?.folders || !data?.rootId) return null;
    const root = buildTree(data.folders, data.rootId);
    if (root) totalFolderCount.current = data.folders.length;
    return root;
  }, [data]);

  useEffect(() => {
    if (fullTree && expandedIds.size === 0) {
      setExpandedIds(new Set([fullTree.id]));
    }
  }, [fullTree]);

  const { nodes, edges, bounds } = useMemo(() => {
    if (!fullTree) return { nodes: [], edges: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
    layoutTree(fullTree, expandedIds);
    fullTree.x = 0;
    positionAbsolute(fullTree, 0, expandedIds);
    const { nodes: n, edges: e } = collectVisible(fullTree, expandedIds);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const nd of n) {
      minX = Math.min(minX, nd.x - NODE_W / 2);
      maxX = Math.max(maxX, nd.x + NODE_W / 2);
      minY = Math.min(minY, nd.y);
      maxY = Math.max(maxY, nd.y + NODE_H);
    }
    return {
      nodes: n,
      edges: e,
      bounds: { minX: minX - 40, maxX: maxX + 40, minY: minY - 40, maxY: maxY + 40 },
    };
  }, [fullTree, expandedIds]);

  useEffect(() => {
    if (nodes.length > 0 && !initialized && containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const tw = bounds.maxX - bounds.minX;
      const th = bounds.maxY - bounds.minY;
      if (tw === 0 || th === 0) return;
      const fitZoom = Math.min(cw / tw, ch / th, 1);
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      setZoom(Math.max(fitZoom, 0.15));
      setPan({ x: cw / 2 - cx * fitZoom, y: ch / 2 - cy * fitZoom });
      setInitialized(true);
    }
  }, [nodes, initialized, bounds]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 3);
    const scale = newZoom / zoom;
    setPan(prev => ({
      x: mouseX - (mouseX - prev.x) * scale,
      y: mouseY - (mouseY - prev.y) * scale,
    }));
    setZoom(newZoom);
  }, [zoom]);

  const fitToView = useCallback(() => {
    if (!containerRef.current || nodes.length === 0) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const tw = bounds.maxX - bounds.minX;
    const th = bounds.maxY - bounds.minY;
    if (tw === 0 || th === 0) return;
    const fitZoom = Math.min(cw / tw, ch / th, 1);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    setZoom(Math.max(fitZoom, 0.15));
    setPan({ x: cw / 2 - cx * fitZoom, y: ch / 2 - cy * fitZoom });
  }, [bounds, nodes]);

  const toggleExpand = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground text-sm">Loading folder structure...</span>
      </div>
    );
  }

  if (error || !fullTree) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FolderOpen className="h-8 w-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Unable to load folder structure</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border bg-card overflow-hidden" style={{ height: 500 }}>
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-1 rounded-md border">
          {nodes.length} / {totalFolderCount.current} folders shown
        </span>
      </div>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-card/80 backdrop-blur-sm"
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const newZoom = Math.min(zoom * 1.2, 3);
            const scale = newZoom / zoom;
            setPan(prev => ({
              x: cx - (cx - prev.x) * scale,
              y: cy - (cy - prev.y) * scale,
            }));
            setZoom(newZoom);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-card/80 backdrop-blur-sm"
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const newZoom = Math.max(zoom * 0.8, 0.1);
            const scale = newZoom / zoom;
            setPan(prev => ({
              x: cx - (cx - prev.x) * scale,
              y: cy - (cy - prev.y) * scale,
            }));
            setZoom(newZoom);
          }}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-card/80 backdrop-blur-sm"
          onClick={fitToView}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="absolute bottom-3 left-3 z-10">
        <span className="text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-1 rounded-md border">
          Drag to pan · Scroll to zoom · Click arrow to expand · Click folder to open in Drive
        </span>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full select-none"
        style={{ cursor: dragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              width: bounds.maxX - bounds.minX + 200,
              height: bounds.maxY - bounds.minY + 200,
              left: bounds.minX - 100,
              top: bounds.minY - 100,
              overflow: "visible",
            }}
          >
            {edges.map(({ from, to }, i) => {
              const fromY = from.y + NODE_H;
              const toY = to.y;
              const midY = (fromY + toY) / 2;
              return (
                <path
                  key={i}
                  d={`M ${from.x} ${fromY} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${toY}`}
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth={1.5}
                />
              );
            })}
          </svg>

          {nodes.map((node) => {
            const isExpanded = expandedIds.has(node.id);
            const hasChildren = node.children.length > 0;
            const isHovered = hoveredId === node.id;

            return (
              <div
                key={node.id}
                className="absolute"
                style={{
                  left: node.x - NODE_W / 2,
                  top: node.y,
                  width: NODE_W,
                  height: NODE_H,
                }}
              >
                <div
                  className={`relative h-full rounded-lg border px-2 py-1 flex items-center gap-1.5 transition-all duration-100 ${
                    isHovered
                      ? "bg-primary/10 border-primary/40 shadow-md"
                      : "bg-card border-border hover:border-primary/30 shadow-sm"
                  }`}
                  onMouseEnter={(e) => {
                    setHoveredId(node.id);
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://drive.google.com/drive/folders/${node.id}`, "_blank");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {hasChildren && (
                    <button
                      className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => toggleExpand(node.id, e)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                  )}
                  {!hasChildren && <div className="w-5 shrink-0" />}
                  <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-medium text-foreground truncate leading-tight flex-1">
                    {node.name}
                  </span>
                  {hasChildren && (
                    <span className="text-[9px] text-muted-foreground shrink-0 tabular-nums">
                      {node.children.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hoveredId && (() => {
          const hNode = nodes.find(n => n.id === hoveredId);
          if (!hNode) return null;
          return (
            <div
              className="absolute z-20 pointer-events-none bg-popover text-popover-foreground border rounded-lg shadow-lg px-3 py-2 text-xs max-w-[220px]"
              style={{
                left: tooltipPos.x + 12,
                top: tooltipPos.y - 40,
              }}
            >
              <div className="font-semibold truncate mb-1">{hNode.name}</div>
              <div className="text-muted-foreground">
                {hNode.itemCount} {hNode.itemCount === 1 ? "subfolder" : "subfolders"} inside
              </div>
              {hNode.children.length > 0 && !expandedIds.has(hNode.id) && (
                <div className="text-muted-foreground mt-0.5 text-[10px]">
                  Click arrow to expand
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
