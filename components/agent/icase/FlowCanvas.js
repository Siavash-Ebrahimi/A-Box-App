"use client";

// Lightweight flow canvas — no react-flow / dnd-kit / any heavy deps. Pure
// React + native HTML5 DnD for sidebar→canvas drops, mouse events for
// node-drag and edge-pulling, and an SVG overlay for edges.
//
// Interactions:
//   - Drag a card from the FlowSidebar onto the canvas → creates a node.
//   - Mouse-drag a node by its header to move it.
//   - Click + on a node's right edge to start an edge, then click any other
//     node to commit it. Esc cancels.
//   - Click a node body to select (drives the right Inspector).
//   - Click an edge's circle midpoint to delete it.

import { useEffect, useRef, useState, useCallback } from "react";
import {
  NODE_FAMILY_META,
  TOOL_NODES_BY_KIND,
  makeSourceNode,
  makeToolNode,
  canConnect,
} from "@/lib/agent/iCaseFlow";

const NODE_WIDTH = 200;
const NODE_HEIGHT_ESTIMATE = 78; // for edge endpoint maths; actual height auto

export default function FlowCanvas({
  flow,
  selectedNodeId,
  runningNodeId = null,   // node currently mid-execution (e.g. AI Compare) → pulse animation
  onChange,            // (nextFlow) => void
  onSelectNode,        // (nodeId | null) => void
  onRunNode,           // (nodeId) => Promise<void> — fired by the per-node Re-run button
  onViewToolReport,    // (nodeId) => void — opens the full-screen ToolReportModal
}) {
  const canvasRef = useRef(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [pendingEdgeFrom, setPendingEdgeFrom] = useState(null); // nodeId
  const [hoverPoint, setHoverPoint] = useState(null);           // {x,y} for ghost edge

  // --- Drop handler (sidebar card → canvas) -----------------------------

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }
  function handleDrop(e) {
    e.preventDefault();
    let raw;
    try {
      raw = e.dataTransfer.getData("application/x-icase-node");
    } catch { /* ignore */ }
    if (!raw) return;
    let payload;
    try { payload = JSON.parse(raw); } catch { return; }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - NODE_WIDTH / 2;
    const y = e.clientY - rect.top - 20;

    let node = null;
    if (payload.nodeKind === "source") {
      node = makeSourceNode({
        kind: payload.sourceKind,
        refId: payload.refId,
        zoneId: payload.zoneId,
        label: payload.label,
        sub: payload.sub,
        color: payload.color,
      }, { x, y });
    } else if (payload.nodeKind === "tool") {
      node = makeToolNode(payload.toolKind, { x, y });
    }
    if (!node) return;
    onChange({ ...flow, nodes: [...flow.nodes, node] });
    onSelectNode?.(node.id);
  }

  // --- Node move handlers -----------------------------------------------

  function startNodeDrag(e, nodeId) {
    e.stopPropagation();
    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left - node.position.x,
      y: e.clientY - rect.top - node.position.y,
    };
    setDraggingNodeId(nodeId);
  }
  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (pendingEdgeFrom) {
      setHoverPoint({ x, y });
    }
    if (draggingNodeId) {
      const nx = x - dragOffsetRef.current.x;
      const ny = y - dragOffsetRef.current.y;
      onChange({
        ...flow,
        nodes: flow.nodes.map((n) =>
          n.id === draggingNodeId ? { ...n, position: { x: Math.max(0, nx), y: Math.max(0, ny) } } : n,
        ),
      });
    }
  }, [draggingNodeId, pendingEdgeFrom, flow, onChange]);

  const handleMouseUp = useCallback(() => {
    setDraggingNodeId(null);
  }, []);

  useEffect(() => {
    if (!draggingNodeId && !pendingEdgeFrom) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingNodeId, pendingEdgeFrom, handleMouseMove, handleMouseUp]);

  // Esc cancels a pending edge
  useEffect(() => {
    if (!pendingEdgeFrom) return;
    function onKey(e) {
      if (e.key === "Escape") {
        setPendingEdgeFrom(null);
        setHoverPoint(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingEdgeFrom]);

  // --- Edge handlers ----------------------------------------------------

  function startEdge(e, nodeId) {
    e.stopPropagation();
    setPendingEdgeFrom(nodeId);
    const rect = canvasRef.current.getBoundingClientRect();
    setHoverPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  function finishEdge(e, targetNodeId) {
    e.stopPropagation();
    if (!pendingEdgeFrom) return;
    if (canConnect(flow.nodes, flow.edges, pendingEdgeFrom, targetNodeId)) {
      onChange({
        ...flow,
        edges: [
          ...flow.edges,
          { id: `e_${Date.now().toString(36)}`, source: pendingEdgeFrom, target: targetNodeId },
        ],
      });
    }
    setPendingEdgeFrom(null);
    setHoverPoint(null);
  }
  function deleteEdge(edgeId) {
    onChange({ ...flow, edges: flow.edges.filter((e) => e.id !== edgeId) });
  }
  function deleteNode(nodeId) {
    onChange({
      ...flow,
      nodes: flow.nodes.filter((n) => n.id !== nodeId),
      edges: flow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
    if (selectedNodeId === nodeId) onSelectNode?.(null);
  }

  function handleCanvasClick() {
    onSelectNode?.(null);
    if (pendingEdgeFrom) {
      setPendingEdgeFrom(null);
      setHoverPoint(null);
    }
  }

  // --- Render -----------------------------------------------------------

  const nodeMap = new Map(flow.nodes.map((n) => [n.id, n]));

  return (
    <div
      ref={canvasRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
      className="flex-1 min-w-0 relative overflow-auto bg-slate-950"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(148,163,184,0.10) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      {/* Inner positioning surface — big enough to feel like a canvas. */}
      <div className="relative" style={{ minWidth: 2000, minHeight: 1400 }}>
        {/* SVG edge layer */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width="100%"
          height="100%"
          style={{ minWidth: 2000, minHeight: 1400 }}
        >
          {/* Existing edges */}
          {flow.edges.map((edge) => {
            const a = nodeMap.get(edge.source);
            const b = nodeMap.get(edge.target);
            if (!a || !b) return null;
            return (
              <EdgePath
                key={edge.id}
                from={portRight(a)}
                to={portLeft(b)}
                onDelete={() => deleteEdge(edge.id)}
              />
            );
          })}
          {/* Pending ghost edge while user is connecting */}
          {pendingEdgeFrom && hoverPoint ? (
            <EdgePath
              from={portRight(nodeMap.get(pendingEdgeFrom))}
              to={hoverPoint}
              ghost
            />
          ) : null}
        </svg>

        {/* Nodes */}
        {flow.nodes.map((n) => (
          <NodeBox
            key={n.id}
            node={n}
            selected={selectedNodeId === n.id}
            running={runningNodeId === n.id}
            pendingFromId={pendingEdgeFrom}
            onSelect={() => onSelectNode?.(n.id)}
            onMouseDownHeader={(e) => startNodeDrag(e, n.id)}
            onStartEdge={(e) => startEdge(e, n.id)}
            onFinishEdge={(e) => finishEdge(e, n.id)}
            onDelete={() => deleteNode(n.id)}
            onToggleExpanded={() => {
              onChange({
                ...flow,
                nodes: flow.nodes.map((nn) =>
                  nn.id === n.id ? { ...nn, data: { ...nn.data, expanded: !nn.data?.expanded } } : nn,
                ),
              });
            }}
            onRun={onRunNode ? () => onRunNode(n.id) : null}
            onViewFullReport={onViewToolReport ? () => onViewToolReport(n.id) : null}
          />
        ))}

        {/* Empty-state hint */}
        {flow.nodes.length === 0 ? (
          <EmptyHint pendingFromId={pendingEdgeFrom} />
        ) : null}
      </div>
    </div>
  );
}

// ---- Edge path (cubic bezier) -------------------------------------------

function EdgePath({ from, to, ghost = false, onDelete }) {
  const dx = Math.max(40, Math.abs(to.x - from.x) * 0.5);
  const c1 = { x: from.x + dx, y: from.y };
  const c2 = { x: to.x - dx, y: to.y };
  const d = `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={ghost ? "#fbbf24" : "#06b6d4"}
        strokeWidth={ghost ? 2 : 2.5}
        strokeDasharray={ghost ? "6 5" : undefined}
        style={{ pointerEvents: ghost ? "none" : "stroke" }}
      />
      {!ghost && onDelete ? (
        <g style={{ pointerEvents: "auto", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <circle cx={mid.x} cy={mid.y} r={9} fill="#0b1220" stroke="#475569" strokeWidth={1} />
          <text x={mid.x} y={mid.y + 3.5} textAnchor="middle" fontSize="11" fill="#f87171" fontWeight="700" style={{ userSelect: "none" }}>×</text>
        </g>
      ) : null}
    </g>
  );
}

function portRight(node) {
  if (!node) return { x: 0, y: 0 };
  return { x: node.position.x + NODE_WIDTH, y: node.position.y + NODE_HEIGHT_ESTIMATE / 2 };
}
function portLeft(node) {
  if (!node) return { x: 0, y: 0 };
  return { x: node.position.x, y: node.position.y + NODE_HEIGHT_ESTIMATE / 2 };
}

// ---- Node box -----------------------------------------------------------

function NodeBox({
  node, selected, running, pendingFromId,
  onSelect, onMouseDownHeader, onStartEdge, onFinishEdge, onDelete,
  onToggleExpanded, onRun, onViewFullReport,
}) {
  const family = NODE_FAMILY_META[node.type] || NODE_FAMILY_META.action;
  const color = node.data?.color || family.color;
  const tool = node.kind && TOOL_NODES_BY_KIND[node.kind];
  const label = node.data?.label || tool?.label || node.kind || "Node";
  const icon = tool?.icon || family.icon;
  const sub =
    node.type === "source"
      ? node.data?.sub
      : tool?.description?.slice(0, 90) || "";

  const isConnecting = !!pendingFromId && pendingFromId !== node.id;
  const expanded = !!node.data?.expanded;
  const lastResult = node.data?.lastResult;
  const lastRunAt = node.data?.lastRunAt;
  // Source nodes don't run anything — only tool/AI/condition nodes get the
  // Re-run + result panel inside their expanded body.
  const canRun = !!onRun && node.type !== "source";
  const width = expanded ? 320 : NODE_WIDTH;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (isConnecting) {
          onFinishEdge(e);
        } else {
          onSelect();
        }
      }}
      className={`absolute rounded-lg border bg-slate-900/95 backdrop-blur shadow-xl transition-all ${
        selected ? "ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950" : ""
      } ${isConnecting ? "hover:ring-2 hover:ring-cyan-400 cursor-crosshair" : "cursor-pointer"} ${
        running ? "icase-node-running" : ""
      }`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width,
        borderColor: `${color}99`,
      }}
    >
      {/* Header — draggable + expand/collapse + delete */}
      <div
        onMouseDown={onMouseDownHeader}
        className="px-2.5 py-1.5 flex items-center gap-2 rounded-t-lg cursor-grab active:cursor-grabbing"
        style={{ background: `${color}22`, borderBottom: `1px solid ${color}44` }}
      >
        <span className="text-base shrink-0 leading-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] font-semibold text-slate-100 truncate">{label}</div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color }}>
            {family.label}
          </div>
        </div>
        {/* Expand / collapse — only meaningful on tool nodes. Source nodes
            don't have results so we skip the chevron for them. */}
        {node.type !== "source" ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleExpanded?.(); }}
            title={expanded ? "Collapse" : "Expand to see / edit results"}
            className="text-slate-400 hover:text-slate-100 px-1 leading-none text-[12px]"
          >
            {expanded ? "▴" : "▾"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete this node"
          className="text-slate-500 hover:text-red-400 px-1 leading-none text-[12px]"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="px-2.5 py-1.5">
        {sub ? (
          <div className="text-[10.5px] text-slate-400 leading-snug line-clamp-2">{sub}</div>
        ) : (
          <div className="text-[10px] text-slate-500 italic">Click the chevron to expand</div>
        )}

        {/* Expanded body — last-result preview + Re-run button. Configuration
            lives in the right Inspector (clicking the node body opens it). */}
        {expanded && node.type !== "source" ? (
          <div
            className="mt-2 pt-2 border-t"
            style={{ borderColor: `${color}33` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-semibold">
                Last result
              </span>
              {lastRunAt ? (
                <span className="text-[9px] text-slate-500 tabular-nums">
                  {new Date(lastRunAt).toLocaleTimeString()}
                </span>
              ) : null}
            </div>
            {lastResult ? (
              <div className="text-[10.5px] text-slate-200 leading-relaxed bg-slate-950/60 rounded p-2 max-h-48 overflow-y-auto scrollbar-thin whitespace-pre-wrap">
                {String(lastResult).slice(0, 1200)}
                {String(lastResult).length > 1200 ? "…" : ""}
              </div>
            ) : (
              <div className="text-[10.5px] text-slate-500 italic">
                No result yet. Configure in the right panel, then tap Run.
              </div>
            )}
            {canRun ? (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRun(); }}
                  disabled={running}
                  className={`flex-1 text-[10.5px] font-semibold px-2 py-1 rounded transition ${
                    running
                      ? "bg-slate-800 text-slate-500 cursor-progress"
                      : "bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200"
                  }`}
                >
                  {running ? "Running…" : lastResult ? "↻ Re-run" : "▶ Run"}
                </button>
                {lastResult && onViewFullReport ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onViewFullReport(); }}
                    className="text-[10.5px] px-2 py-1 rounded border border-emerald-500/50 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 font-semibold transition"
                    title="Open the full report in a readable window (translate + print)"
                  >
                    📖 Full
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelect(); }}
                  className="text-[10.5px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
                  title="Open the right Inspector to edit settings"
                >
                  Edit ↗
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Connection ports */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isConnecting) onFinishEdge(e);
        }}
        className={`absolute -left-2 top-[28px] w-4 h-4 rounded-full border-2 transition ${
          isConnecting
            ? "border-cyan-400 bg-cyan-500/40 hover:bg-cyan-400"
            : "border-slate-600 bg-slate-800"
        }`}
        title="Drop target — click to finish a connection here"
      />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onStartEdge(e); }}
        className="absolute -right-2 top-[28px] w-5 h-5 rounded-full border-2 border-cyan-500 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center"
        title="Start a connection from this node"
      >
        +
      </button>
    </div>
  );
}

// ---- Empty state --------------------------------------------------------

function EmptyHint({ pendingFromId }) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none max-w-md text-center">
      <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-6 py-5 backdrop-blur">
        <div className="text-4xl mb-2">{pendingFromId ? "🪢" : "🧩"}</div>
        <div className="text-sm font-semibold text-slate-200">
          {pendingFromId ? "Click any node to finish the connection" : "Drag a card from the left to begin"}
        </div>
        <div className="text-[11.5px] text-slate-400 mt-1.5 leading-relaxed">
          {pendingFromId
            ? "Or press Esc to cancel."
            : "Start with a saved Property or Recommendation, then drop a Trigger / Action / AI tool next to it, and connect them with a line."}
        </div>
      </div>
    </div>
  );
}
