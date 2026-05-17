"use client";

// Automation Studio for one i-Case — node-based flow editor.
//
// Layout:
//   ┌─────────────────────────────────────────────────────────────────────┐
//   │ Header: ← Back · Title (rename inline) · stats · ✕ Delete           │
//   ├─────────────┬───────────────────────────────────┬───────────────────┤
//   │ Sources +   │ Flow canvas (drag-and-drop nodes, │ Inspector for the │
//   │ Tools tabs  │ click-to-connect with edges)      │ selected node     │
//   │ (drag from  │                                   │ + AI chat surface │
//   │  here)      │                                   │                   │
//   └─────────────┴───────────────────────────────────┴───────────────────┘
//
// State:
//   iCase.flow = { nodes: [...], edges: [...] } — persisted via onPatch.
//   Backward-compatible: any iCase missing `flow` gets an empty default.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  loadFavourites,
  loadFavoriteRecommendations,
} from "@/lib/agent/storage";
import { PROPERTIES } from "@/lib/agent/mockProperties";
import { loadUserProperties } from "@/lib/property/userProperties";
import { loadUserBusinesses } from "@/lib/business/userBusinesses";
import { emptyFlow, makeSourceNode, makeToolNode, canConnect, TOOL_NODES_BY_KIND } from "@/lib/agent/iCaseFlow";
import FlowSidebar from "./FlowSidebar";
import FlowCanvas from "./FlowCanvas";
import FlowInspector from "./FlowInspector";
import FlowZoneRibbon from "./FlowZoneRibbon";
import FlowAgent from "./FlowAgent";
import TranslateButtons from "@/components/TranslateButtons";

// Default persona used when posting AI requests through /api/agent-chat —
// the route requires a personaKey and falls back to a templated reply when
// the LLM is unreachable, so the workspace never feels broken offline.
const DEFAULT_AI_PERSONA = "buyer_marina";

export default function ICaseWorkspace({ iCase, zones, onPatch, onDelete, onBack }) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(iCase.name);
  const [descDraft, setDescDraft] = useState(iCase.description || "");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  // Ref to the FlowAgent so the header "🤖 AI Agent" button can open it.
  const agentRef = useRef(null);
  // Running state for the AI Compare tool — drives the node pulse animation
  // on the canvas + the "Running…" button state in the inspector.
  const [runningNodeId, setRunningNodeId] = useState(null);
  // Last-finished comparison report — shown in a portal modal when set.
  const [reportText, setReportText] = useState(null);
  const [reportMeta, setReportMeta] = useState(null);  // { items: [...], nodeId, finishedAt }

  // Sources fed into the sidebar + ribbon. We keep BOTH a "savedProperties"
  // list (just the agent's favourited pins — used by tools and the inspector)
  // AND a wider "allProperties" list (every pin built-in + user-added — used
  // by the zone ribbon's subcategory tray so it's never empty).
  const [savedProperties, setSavedProperties] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [favIds, setFavIds] = useState(() => new Set());
  const [savedRecsByZone, setSavedRecsByZone] = useState({});
  const [userBusinesses, setUserBusinesses] = useState([]);
  useEffect(() => {
    const fids = loadFavourites();
    const all = [...PROPERTIES, ...loadUserProperties()];
    setFavIds(fids);
    setAllProperties(all);
    setSavedProperties(all.filter((p) => fids.has(p.id)));
    setSavedRecsByZone(loadFavoriteRecommendations());
    setUserBusinesses(loadUserBusinesses());
  }, []);

  const flow = useMemo(() => {
    const f = iCase.flow || emptyFlow();
    return {
      nodes: Array.isArray(f.nodes) ? f.nodes : [],
      edges: Array.isArray(f.edges) ? f.edges : [],
    };
  }, [iCase.flow]);

  function commitName() {
    const next = nameDraft.trim() || iCase.name;
    onPatch({ name: next });
    setEditingName(false);
  }
  function commitDescription() {
    onPatch({ description: descDraft });
  }
  function handleFlowChange(nextFlow) {
    onPatch({ flow: nextFlow });
  }

  // Add / remove a zone from this i-Case (writes to iCase.zoneIds — same
  // field the dashboard reads to show "linked i-Cases" on each zone card).
  function addZoneToCase(zoneId) {
    const next = [...new Set([...(iCase.zoneIds || []), zoneId])];
    onPatch({ zoneIds: next });
  }
  function removeZoneFromCase(zoneId) {
    onPatch({ zoneIds: (iCase.zoneIds || []).filter((id) => id !== zoneId) });
  }

  // Compute a "next free spot" on the canvas so quick-adds + AI-spawned
  // nodes don't pile up on top of each other. Simple grid layout: start
  // at (120, 120) and step right then down.
  function nextSlot(existingNodes) {
    const COL = 220, ROW = 110;
    let i = existingNodes.length;
    return { x: 120 + (i % 4) * COL, y: 120 + Math.floor(i / 4) * ROW };
  }

  // Quick-add from the ribbon — drops a single source node at the next
  // available slot. The payload shape matches what FlowSidebar's drag
  // cards stash; we just bypass the drag-and-drop dance.
  function quickAddNode(payload) {
    if (!payload?.nodeKind) return;
    const pos = nextSlot(flow.nodes);
    let node = null;
    if (payload.nodeKind === "source") {
      node = makeSourceNode({
        kind: payload.sourceKind,
        refId: payload.refId,
        zoneId: payload.zoneId,
        label: payload.label,
        sub: payload.sub,
        color: payload.color,
      }, pos);
    } else if (payload.nodeKind === "tool") {
      node = makeToolNode(payload.toolKind, pos);
    }
    if (!node) return;
    handleFlowChange({ ...flow, nodes: [...flow.nodes, node] });
    setSelectedNodeId(node.id);
  }

  // ---- AI orchestrator action executor ----
  //
  // The /api/icase-agent endpoint returns a list of actions. We apply them
  // sequentially, tracking each new node's id by its index so subsequent
  // `connect` actions can reference earlier additions by zero-based slot.
  function executeAgentActions(actions) {
    if (!Array.isArray(actions) || actions.length === 0) return;
    const newOnes = [];           // indexes resolved to actual node ids
    let nextFlow = { ...flow, nodes: [...flow.nodes], edges: [...flow.edges] };
    let nextZoneIds = [...(iCase.zoneIds || [])];

    for (const a of actions) {
      const type = a?.type;
      if (!type) continue;

      if (type === "add_zone") {
        if (a.zoneId && !nextZoneIds.includes(a.zoneId)) nextZoneIds.push(a.zoneId);
        continue;
      }

      if (type === "add_zone_source") {
        const z = zones.find((zz) => zz.id === a.zoneId);
        if (!z) continue;
        const zoneIdx = zones.findIndex((zz) => zz.id === a.zoneId);
        const pos = nextSlot(nextFlow.nodes);
        const node = makeSourceNode({
          kind: "zone", refId: z.id, zoneId: z.id,
          label: `Zone ${zoneIdx + 1} · ${z.label}`,
          sub: "Whole zone",
          color: "#a855f7",
        }, pos);
        nextFlow.nodes.push(node);
        newOnes.push(node.id);
        if (!nextZoneIds.includes(z.id)) nextZoneIds.push(z.id);
        continue;
      }

      if (type === "add_source") {
        const sourceKind = a.sourceKind;
        if (sourceKind !== "property" && sourceKind !== "recommendation") continue;
        // Look up the referenced item so we can label it nicely.
        let label = a.refId, sub = "", color = "#f59e0b";
        if (sourceKind === "property") {
          const p = savedProperties.find((x) => x.id === a.refId);
          if (p) { label = p.title; sub = p.building || p.area || ""; color = "#f59e0b"; }
        } else {
          const list = savedRecsByZone[a.zoneId] || [];
          const r = list.find((x) => x.id === a.refId);
          if (r) { label = r.street; sub = `${r.tier?.toUpperCase()} · ${Math.round(r.score)}`; color = "#06b6d4"; }
        }
        const pos = nextSlot(nextFlow.nodes);
        const node = makeSourceNode({
          kind: sourceKind, refId: a.refId, zoneId: a.zoneId,
          label, sub, color,
        }, pos);
        nextFlow.nodes.push(node);
        newOnes.push(node.id);
        continue;
      }

      if (type === "add_tool") {
        const kind = a.toolKind;
        if (!TOOL_NODES_BY_KIND[kind]) continue;
        const pos = nextSlot(nextFlow.nodes);
        const node = makeToolNode(kind, pos);
        if (!node) continue;
        nextFlow.nodes.push(node);
        newOnes.push(node.id);
        continue;
      }

      if (type === "connect") {
        const fromId = newOnes[a.fromIdx];
        const toId = newOnes[a.toIdx];
        if (canConnect(nextFlow.nodes, nextFlow.edges, fromId, toId)) {
          nextFlow.edges.push({
            id: `e_${Date.now().toString(36)}_${nextFlow.edges.length}`,
            source: fromId, target: toId,
          });
        }
        continue;
      }

      // (run_compare is handled at the workspace level after the flow is
      // committed — see below.)
    }

    // Commit zone changes + flow in one onPatch so they persist together.
    if (nextZoneIds.length !== (iCase.zoneIds || []).length) {
      onPatch({ zoneIds: nextZoneIds, flow: nextFlow });
    } else {
      handleFlowChange(nextFlow);
    }

    // Process any post-commit run_compare actions.
    for (const a of actions) {
      if (a?.type !== "run_compare") continue;
      const id = newOnes[a.nodeIdx] || nextFlow.nodes[nextFlow.nodes.length - 1]?.id;
      const node = nextFlow.nodes.find((n) => n.id === id);
      if (!node || node.kind !== "ai_compare") continue;
      // Gather upstream context lines and fire.
      const upstreamIds = nextFlow.edges.filter((e) => e.target === id).map((e) => e.source);
      const upstream = upstreamIds.map((i) => nextFlow.nodes.find((n) => n.id === i)).filter(Boolean);
      const lines = buildContextLinesForCompare(upstream, savedProperties, savedRecsByZone, zones);
      if (lines.length >= 2) runCompare(id, lines);
    }
  }

  // ---- Generic tool runner ----
  //
  // Drives the per-node Re-run button on the canvas + the Run buttons in the
  // Inspector for the 4 non-Compare featured tools (Find Property, Analyse
  // Business, Suggest Business, Vending Finder). Each tool gets its own
  // prompt template; the response is stored on node.data.lastResult so the
  // expanded node body can show it inline, and the running state pulses the
  // node on the canvas while the request is in flight.
  async function runTool(nodeId) {
    const node = flow.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (node.kind === "ai_compare") {
      // Compare has its own multi-source path (with the report modal).
      const incoming = flow.edges.filter((e) => e.target === nodeId).map((e) => e.source);
      const upstream = incoming.map((id) => flow.nodes.find((n) => n.id === id)).filter(Boolean);
      const lines = buildContextLinesForCompare(upstream, savedProperties, savedRecsByZone, zones);
      if (lines.length < 2) return;
      return runCompare(nodeId, lines);
    }

    // Build a prompt + context lines for this tool kind.
    const incoming = flow.edges.filter((e) => e.target === nodeId).map((e) => e.source);
    const upstream = incoming.map((id) => flow.nodes.find((n) => n.id === id)).filter(Boolean);
    const contextLines = buildContextLinesForCompare(upstream, savedProperties, savedRecsByZone, zones);
    const promptByKind = {
      ai_find_property:
        `You are a senior real-estate advisor in Dubai. The agent's brief is below.\n` +
        `From the connected zone(s), rank up to 8 candidate properties that best match the brief.\n` +
        `For each, give a 1-line "why" and a confidence score 1-10. End with a short overall comment.\n\n` +
        `BRIEF:\n${(node.data?.brief || "(no brief — assume general comfort + value).").trim()}\n\n` +
        `CONNECTED ITEMS:\n${contextLines.join("\n") || "(none connected — say so and ask)"}\n`,
      ai_analyze_business:
        `You are a senior business-concept analyst. The agent has connected a business + location data below.\n` +
        `Write a tight analysis: (a) what the business currently is, (b) how it fits its location and zone character,\n` +
        `(c) likely customers, (d) main risks, (e) 3 concrete improvements that would lift revenue.\n\n` +
        `CONNECTED ITEMS:\n${contextLines.join("\n") || "(none connected)"}\n`,
      ai_suggest_business:
        `You are a Dubai retail-strategy consultant. For the connected zone(s), suggest the strongest business\n` +
        `concepts to open there. Use a statistical, evidence-backed style. Structure your reply as:\n` +
        `  1. Zone snapshot (footfall drivers, demographics, anchors).\n` +
        `  2. Top 5 business concepts ranked, each with rationale + ideal size/format + risk.\n` +
        `  3. Concepts to AVOID and why.\n\n` +
        `CONNECTED ITEMS:\n${contextLines.join("\n") || "(none connected)"}\n`,
      ai_vending_finder:
        `You are a vending-machine placement specialist. For the connected zone(s), output:\n` +
        `  1. The 5–8 best STREETS or specific spots inside the zone to place vending machines (with reasoning).\n` +
        `  2. For each spot, recommend a vending-machine MODEL category that fits (e.g. "hot drinks + snacks",\n` +
        `     "ice-cream / frozen", "PPE + over-the-counter pharmacy", "cold drinks", "fresh food"), justified.\n` +
        `Mention any spots to AVOID (low footfall, vandalism risk).\n\n` +
        `CONNECTED ITEMS:\n${contextLines.join("\n") || "(none connected)"}\n`,
      ai_analysis:
        `You are an analyst. Run an analysis on the connected items per the prompt below.\n\n` +
        `PROMPT: ${(node.data?.prompt || "Analyse the items and suggest the best next step.").trim()}\n\n` +
        `CONNECTED ITEMS:\n${contextLines.join("\n") || "(none connected)"}\n`,
    };
    const prompt = promptByKind[node.kind];
    if (!prompt) return; // Other tool kinds (triggers/conditions/notify) aren't runnable here.

    setRunningNodeId(nodeId);
    let resultText = null;
    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaKey: DEFAULT_AI_PERSONA,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      resultText = data?.text || "(No text response — try again or check your API key.)";
    } catch (e) {
      resultText = "Network error — please retry once your connection comes back.";
    }
    // Persist the result on the node so the expanded body + Inspector both show it.
    const next = {
      ...flow,
      nodes: flow.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, lastResult: resultText, lastRunAt: Date.now(), expanded: true } }
          : n,
      ),
    };
    onPatch({ flow: next });
    setRunningNodeId(null);
  }

  // Run the AI Compare tool: posts to /api/agent-chat with the connected
  // sources inlined as context, then shows the response in a modal. Drives
  // the pulse animation on the node throughout.
  async function runCompare(nodeId, contextLines) {
    if (!Array.isArray(contextLines) || contextLines.length < 2) return;
    setRunningNodeId(nodeId);
    setReportText(null);

    const prompt = [
      "You are a senior Dubai real-estate analyst.",
      "Write a PROFESSIONAL side-by-side comparison report of the items below.",
      "Structure the report with these clearly-labelled sections:",
      "  1. Overview",
      "  2. Quick-stats table (price / size / location / type — markdown table)",
      "  3. Pros & cons of each item (use bullet lists)",
      "  4. Ideal target buyer profile for each",
      "  5. Risk factors and unknowns",
      "  6. Final recommendation (rank them, explain why)",
      "",
      "Use clean markdown. Be specific. Quote numbers from the inputs.",
      "",
      "Items to compare:",
      ...contextLines,
    ].join("\n");

    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaKey: DEFAULT_AI_PERSONA,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data?.text || "(The AI returned no text. Try again — if it keeps happening, set OPENROUTER_API_KEY in .env.local.)";
      setReportText(text);
      setReportMeta({ items: contextLines, nodeId, finishedAt: Date.now() });

      // Persist lastRunAt on the node so the inspector can show "Last run …".
      const nextFlow = {
        ...flow,
        nodes: flow.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, lastRunAt: Date.now() } } : n,
        ),
      };
      onPatch({ flow: nextFlow });
    } catch (e) {
      setReportText(
        "Network error while contacting the AI. We'll wait for your connection to come back — please retry when it does.",
      );
      setReportMeta({ items: contextLines, nodeId, finishedAt: Date.now(), error: true });
    } finally {
      setRunningNodeId(null);
    }
  }

  const nodeCount = flow.nodes.length;
  const edgeCount = flow.edges.length;

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="px-5 py-3 border-b border-slate-800 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-slate-100 px-2 py-1 rounded hover:bg-slate-800 transition"
        >
          ← Agent Hub
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-amber-400 text-base">🤖</span>
          {editingName ? (
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") { setNameDraft(iCase.name); setEditingName(false); }
              }}
              autoFocus
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-sm font-semibold focus:outline-none focus:border-amber-500"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setNameDraft(iCase.name); setEditingName(true); }}
              className="text-sm font-semibold text-slate-100 hover:text-amber-300 transition truncate text-left"
              title="Click to rename"
            >
              {iCase.name}
            </button>
          )}
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">· Flow Studio</span>
        </div>

        <div className="text-[10.5px] text-slate-500 hidden md:flex items-center gap-3 tabular-nums">
          <span title="Nodes on canvas">🧩 {nodeCount}</span>
          <span title="Connections">🪢 {edgeCount}</span>
          <span className="text-emerald-400">✓ auto-saved</span>
        </div>

        {/* AI Agent header shortcut — same as the bottom-right launcher,
            for agents who skim the top bar first. */}
        <button
          type="button"
          onClick={() => agentRef.current?.open()}
          className="text-[11px] px-2.5 py-1.5 rounded border border-emerald-500/50 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 font-semibold transition flex items-center gap-1.5"
          title="Open the AI Flow Agent — it builds the flow for you by chat or voice"
        >
          <span>🤖</span>
          <span>AI Agent</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-[11px] px-2.5 py-1 rounded border border-red-700/50 bg-red-900/20 hover:bg-red-900/30 text-red-300 transition"
          title="Delete this i-Case"
        >
          ✕ Delete
        </button>
      </header>

      {/* One-line description */}
      <div className="px-5 py-2 border-b border-slate-800 bg-slate-900/30">
        <textarea
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          onBlur={commitDescription}
          placeholder="One-line description of what this i-Case is for…"
          rows={1}
          className="w-full bg-transparent text-[12.5px] text-slate-200 placeholder-slate-600 focus:outline-none resize-none"
        />
      </div>

      {/* 3-column body */}
      <div className="flex-1 flex min-h-0">
        {/* Tools palette only — zones moved to the top ribbon. */}
        <FlowSidebar />

        {/* Centre column: zone ribbon → canvas → floating AI agent */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          <FlowZoneRibbon
            zones={zones}
            allProperties={allProperties}
            favouriteIds={favIds}
            savedRecsByZone={savedRecsByZone}
            userBusinesses={userBusinesses}
            onAutoAddToCase={addZoneToCase}
          />
          <FlowCanvas
            flow={flow}
            selectedNodeId={selectedNodeId}
            runningNodeId={runningNodeId}
            onChange={handleFlowChange}
            onSelectNode={setSelectedNodeId}
            onRunNode={runTool}
          />
          {/* Floating AI agent (chat + voice). Renders inside the centre
              column so the launcher sits at the canvas's bottom-right. */}
          <FlowAgent
            ref={agentRef}
            iCase={iCase}
            flow={flow}
            zones={zones}
            savedProperties={savedProperties}
            savedRecsByZone={savedRecsByZone}
            onExecuteActions={executeAgentActions}
          />
        </div>

        <FlowInspector
          iCase={iCase}
          flow={flow}
          selectedNodeId={selectedNodeId}
          zones={zones}
          savedProperties={savedProperties}
          savedRecsByZone={savedRecsByZone}
          runningNodeId={runningNodeId}
          onChange={handleFlowChange}
          onSelectNode={setSelectedNodeId}
          onRunCompare={runCompare}
          onRunTool={runTool}
        />
      </div>

      {/* AI Compare report modal — shown once the comparison finishes. */}
      {reportText ? (
        <CompareReportModal
          text={reportText}
          meta={reportMeta}
          onClose={() => { setReportText(null); setReportMeta(null); }}
        />
      ) : null}
    </div>
  );
}

// Build comparison context lines for upstream nodes. Mirrors the
// FlowInspector helper but lives here so the AI-orchestrator path (which
// can fire run_compare immediately after wiring) doesn't need to round-trip
// through the inspector.
function buildContextLinesForCompare(upstream, savedProperties, savedRecsByZone, zones) {
  const lines = [];
  upstream.forEach((u) => {
    if (u.kind === "property") {
      const p = savedProperties.find((x) => x.id === u.refId);
      if (!p) { lines.push("[property missing]"); return; }
      lines.push(
        `PROPERTY "${p.title}" — ${p.building || ""}${p.area ? `, ${p.area}` : ""}. Type: ${p.type}. ${p.beds || "Studio"} BR / ${p.baths || 1} bath, ${Number(p.area_sqft || 0).toLocaleString()} ft². ${p.listing === "rent" ? `Rent AED ${Number(p.price).toLocaleString()}/year` : `Sale AED ${Number(p.price).toLocaleString()}`}.`,
      );
    } else if (u.kind === "recommendation") {
      const list = savedRecsByZone[u.data?.zoneId] || [];
      const r = list.find((x) => x.id === u.refId);
      const zIdx = zones.findIndex((z) => z.id === u.data?.zoneId);
      if (!r) { lines.push("[recommendation missing]"); return; }
      lines.push(`RECOMMENDATION "${r.street}" from Zone ${zIdx + 1} — tier ${r.tier?.toUpperCase()}, score ${Math.round(r.score)}.`);
    } else if (u.kind === "zone") {
      const z = zones.find((x) => x.id === u.refId);
      const zIdx = zones.findIndex((x) => x.id === u.refId);
      if (!z) { lines.push("[zone missing]"); return; }
      const propsInside = savedProperties.filter(
        (p) => typeof p.lat === "number" && typeof p.lng === "number"
          && (((p.lat - z.lat) ** 2 + (p.lng - z.lng) ** 2) ** 0.5 * 111000) <= z.radius,
      );
      const recs = savedRecsByZone[z.id] || [];
      lines.push(`ZONE "${z.label || `Zone ${zIdx + 1}`}" — whole-zone source. Items inside:`);
      propsInside.forEach((p) => lines.push(
        `  • Property "${p.title}" — ${p.type}, ${Number(p.area_sqft || 0).toLocaleString()} ft², ${p.listing === "rent" ? `AED ${Number(p.price).toLocaleString()}/yr` : `AED ${Number(p.price).toLocaleString()}`}`,
      ));
      recs.forEach((r) => lines.push(`  • Recommendation "${r.street}" — tier ${r.tier?.toUpperCase()}, score ${Math.round(r.score)}`));
    }
  });
  return lines.map((l, i) => `${i + 1}. ${l}`);
}

// Portal-mounted modal that renders the AI Compare report in a wide,
// readable card with Print + Close actions. Markdown is shown as-is —
// agents are usually comfortable scanning it; we save a rendering library
// for later.
function CompareReportModal({ text, meta, onClose }) {
  const [mounted, setMounted] = useState(false);
  // Translation surface — `shown` is the text currently rendered; defaults to
  // the English original. TranslateButtons swaps `shown` + `rtl` when the
  // user picks AR / FA, and reverts to the original on EN.
  const [shown, setShown] = useState(text);
  const [rtl, setRtl] = useState(false);
  useEffect(() => { setShown(text); setRtl(false); }, [text]);
  useEffect(() => {
    setMounted(true);
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  if (!mounted) return null;

  function handlePrint() { window.print(); }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Comparison report"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-3xl w-full max-h-[92vh] bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl overflow-hidden flex flex-col printable-modal"
      >
        <header className="px-5 py-3.5 border-b border-slate-800 flex items-start justify-between gap-3 bg-amber-500/10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-300 font-semibold">
              AI Compare · Professional report
            </div>
            <h2 className="text-base font-semibold text-amber-100 mt-0.5">
              Side-by-side analysis · {meta?.items?.length || 0} item{(meta?.items?.length || 0) === 1 ? "" : "s"}
            </h2>
            {meta?.finishedAt ? (
              <div className="text-[10.5px] text-amber-200/70 mt-0.5">
                Generated {new Date(meta.finishedAt).toLocaleString()}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <TranslateButtons
              text={text}
              onTranslated={(t, lang, isRtl) => { setShown(t); setRtl(isRtl); }}
              compact
            />
            <button
              type="button"
              onClick={handlePrint}
              className="text-[11px] px-2.5 py-1 rounded border border-amber-500/40 bg-slate-900 hover:bg-slate-800 text-amber-200 transition"
            >
              🖨 Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 text-lg w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </header>

        <div
          className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 text-[13px] leading-relaxed text-slate-200 whitespace-pre-wrap"
          dir={rtl ? "rtl" : "ltr"}
        >
          {shown}
        </div>

        {meta?.items?.length ? (
          <footer className="px-6 py-3 border-t border-slate-800 bg-slate-950 text-[10.5px] text-slate-500 leading-relaxed">
            <strong className="text-slate-300">Sources used:</strong>{" "}
            {meta.items.map((line, i) => (
              <span key={i}>
                {i > 0 ? " · " : ""}#{i + 1}
              </span>
            ))}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
