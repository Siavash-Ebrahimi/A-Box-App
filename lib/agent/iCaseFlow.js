"use client";

// i-Case Flow — node-based automation builder data model.
//
// The flow lives on each iCase as `flow: { nodes, edges }`:
//
//   node  = { id, type, kind, position:{x,y}, data:{...}, refId? }
//   edge  = { id, source: nodeId, target: nodeId }
//
// `type` is the broad family: "source" | "trigger" | "action" | "ai" | "condition"
// `kind` is the specific tool key from TOOL_NODE_LIBRARY (or "property" / "recommendation"
// for source nodes that reference an external item).

export const NODE_FAMILY_META = {
  source:    { label: "Source",     color: "#f59e0b", icon: "🏠", description: "A saved property or recommendation that other nodes can reference." },
  trigger:   { label: "Trigger",    color: "#06b6d4", icon: "⚡", description: "Fires the flow when a condition becomes true." },
  action:    { label: "Action",     color: "#a855f7", icon: "🎬", description: "Does something — sends a message, generates a report, etc." },
  ai:        { label: "AI",         color: "#10b981", icon: "🤖", description: "AI-powered analysis, chat, or comparison." },
  condition: { label: "Condition",  color: "#fbbf24", icon: "🔀", description: "Routes the flow based on a check (if / else)." },
};

// All draggable tool nodes. Source nodes (Saved Property / Recommendation) are
// generated dynamically from the agent's favourites — see FlowSidebar.
export const TOOL_NODE_LIBRARY = [
  // ---- Featured (always first) ------------------------------------------
  // The 5 priority tools sit at the top in the order the agent asked for.
  {
    kind: "ai_compare",
    type: "ai",
    label: "AI Compare",
    icon: "⚖️",
    description:
      "Connect ANY zones, properties, or businesses → produces a professional side-by-side analysis report (overview, quick-stats, pros / cons, target buyer, risk, final recommendation).",
    inputs: ["sources"], outputs: ["next"],
    config: { lastRunAt: null, lastResult: null },
    featured: true,
  },
  {
    kind: "ai_find_property",
    type: "ai",
    label: "AI Find Property",
    icon: "🔎",
    description:
      "Connect a zone (or several) and describe what the buyer wants in plain words ('1-bed sea view, low floor, no construction noise, near bus stop'). The AI ranks matching properties from inside the zone.",
    inputs: ["zone"], outputs: ["matches"],
    config: { brief: "", lastRunAt: null, lastResult: null },
    featured: true,
  },
  {
    kind: "ai_analyze_business",
    type: "ai",
    label: "AI Analyse Business",
    icon: "🏪",
    description:
      "Connect a business pin (or whole zone) → the AI analyses it against its location, the zone's character, and known business models. Useful for concept validation.",
    inputs: ["business"], outputs: ["report"],
    config: { lastRunAt: null, lastResult: null },
    featured: true,
  },
  {
    kind: "ai_suggest_business",
    type: "ai",
    label: "AI Suggest Business for Zone",
    icon: "💡",
    description:
      "Connect a zone (or several) → the AI uses every signal in the zone (footfall, anchors, transit, demographics) to suggest the strongest business types to open there, with a statistical-style report.",
    inputs: ["zone"], outputs: ["report"],
    config: { lastRunAt: null, lastResult: null },
    featured: true,
  },
  {
    kind: "ai_vending_finder",
    type: "ai",
    label: "AI Vending-Spot Finder",
    icon: "🥤",
    description:
      "Connect a zone → the AI lists the best streets and shops to place vending machines in that zone, AND suggests which vending-machine models suit the zone's character (snacks vs hot drinks vs sundries vs PPE…).",
    inputs: ["zone"], outputs: ["spots"],
    config: { lastRunAt: null, lastResult: null, preferred: "auto" },
    featured: true,
  },

  // ---- Triggers ----
  {
    kind: "trigger_price_change",
    type: "trigger",
    label: "When price changes",
    icon: "💸",
    description: "Fires when a connected property's price moves up or down.",
    inputs: ["source"], outputs: ["next"],
    config: { direction: "any" /* "up" | "down" | "any" */, minDeltaPct: 2 },
  },
  {
    kind: "trigger_status_change",
    type: "trigger",
    label: "When status changes",
    icon: "🔔",
    description: "Fires when a property goes from Available → Sold/Rented or vice-versa.",
    inputs: ["source"], outputs: ["next"],
    config: {},
  },
  {
    kind: "trigger_new_match",
    type: "trigger",
    label: "When a new match appears",
    icon: "🆕",
    description: "Fires when a new listing inside the connected zone matches the saved criteria.",
    inputs: ["source"], outputs: ["next"],
    config: {},
  },
  {
    kind: "trigger_schedule",
    type: "trigger",
    label: "On a schedule",
    icon: "📅",
    description: "Fires at a recurring time (daily, weekly, …).",
    inputs: [], outputs: ["next"],
    config: { cadence: "daily", time: "09:00" },
  },

  // ---- Conditions ----
  {
    kind: "condition_compare",
    type: "condition",
    label: "Compare two sources",
    icon: "⚖️",
    description: "Branches based on a side-by-side comparison of two connected properties.",
    inputs: ["a", "b"], outputs: ["yes", "no"],
    config: { metric: "price", op: ">", value: 0 },
  },
  {
    kind: "condition_filter",
    type: "condition",
    label: "If / else filter",
    icon: "🔀",
    description: "Only proceeds along the 'yes' branch when the rule matches.",
    inputs: ["in"], outputs: ["yes", "no"],
    config: { field: "price", op: "<", value: 1000000 },
  },

  // ---- Actions ----
  {
    kind: "action_notify_me",
    type: "action",
    label: "Notify me",
    icon: "🔔",
    description: "Sends a push/email to you with the upstream context.",
    inputs: ["in"], outputs: [],
    config: { channel: "push" /* "push" | "email" | "sms" */ },
  },
  {
    kind: "action_notify_customer",
    type: "action",
    label: "Notify customer",
    icon: "📨",
    description: "Sends a tailored message to a saved AI customer/persona.",
    inputs: ["in"], outputs: [],
    config: { personaKey: null, template: "Hi {{name}}, your saved property…" },
  },
  {
    kind: "action_auto_update",
    type: "action",
    label: "Auto-update",
    icon: "🔄",
    description: "Refreshes the saved property data (price, status, etc.) from the source.",
    inputs: ["in"], outputs: ["next"],
    config: {},
  },
  {
    kind: "action_generate_report",
    type: "action",
    label: "Generate report (PDF)",
    icon: "📄",
    description: "Generates a PDF report of the upstream context and saves it to the i-Case.",
    inputs: ["in"], outputs: [],
    config: { title: "Market update" },
  },
  {
    kind: "action_create_task",
    type: "action",
    label: "Create follow-up task",
    icon: "✅",
    description: "Adds a to-do for you with a deadline.",
    inputs: ["in"], outputs: [],
    config: { dueInDays: 1 },
  },

  // ---- AI ----
  {
    kind: "ai_analysis",
    type: "ai",
    label: "AI Analysis",
    icon: "🧠",
    description: "Runs an analysis on the connected sources — market context, pros/cons, target buyer.",
    inputs: ["in"], outputs: ["next"],
    config: { prompt: "Analyse the connected properties and recommend the best one for a young couple." },
  },
  {
    kind: "ai_chat",
    type: "ai",
    label: "AI Chat",
    icon: "💬",
    description: "Opens an interactive chat scoped to the connected sources — ask any question.",
    inputs: ["context"], outputs: [],
    config: { seedQuestion: "" },
  },
];

export const TOOL_NODES_BY_KIND = Object.fromEntries(
  TOOL_NODE_LIBRARY.map((t) => [t.kind, t]),
);

// Helpers ------------------------------------------------------------------

export function emptyFlow() {
  return { nodes: [], edges: [] };
}

export function makeId(prefix = "n") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// Build a node from a tool kind, positioned at the given canvas point.
export function makeToolNode(kind, position) {
  const tool = TOOL_NODES_BY_KIND[kind];
  if (!tool) return null;
  return {
    id: makeId(),
    type: tool.type,
    kind,
    position: position || { x: 80, y: 80 },
    data: { ...(tool.config || {}) },
  };
}

// Build a SOURCE node referencing an external saved item.
// payload = { kind: "property"|"recommendation"|"zone", refId, label, sub, color }
//
// A "zone" source represents the WHOLE zone — every saved property + every
// saved business recommendation inside it. Tools (AI Compare, AI Analysis,
// Notify, etc.) consume it as if every item were connected at once.
export function makeSourceNode(payload, position) {
  const idPrefix =
    payload.kind === "recommendation" ? "rec" :
    payload.kind === "zone" ? "zone" : "prop";
  const defaultColor =
    payload.kind === "recommendation" ? "#06b6d4" :
    payload.kind === "zone" ? "#a855f7" : "#f59e0b";
  return {
    id: makeId(idPrefix),
    type: "source",
    kind: payload.kind,           // "property" | "recommendation" | "zone"
    refId: payload.refId,
    position: position || { x: 80, y: 80 },
    data: {
      label: payload.label,
      sub: payload.sub || "",
      color: payload.color || defaultColor,
      zoneId: payload.zoneId || null,
    },
  };
}

// Used by edge handlers to ensure we don't create duplicate edges or self-loops.
export function canConnect(nodes, edges, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return false;
  const exists = edges.some((e) => e.source === sourceId && e.target === targetId);
  return !exists;
}
