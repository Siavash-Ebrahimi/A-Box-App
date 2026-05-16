// Rule library for the i-Case workspace.
//
// Rules are grouped into four categories matching the workspace toolbar:
//   - trigger      (when X happens)
//   - action       (do Y)
//   - notification (notify Z)
//   - condition    (only if W)
//
// Each rule is stored on the i-Case as:
//   { id, toolKey, recipient?: "me"|"agent"|"client", note?: string }
// Targets (zones / properties) are NOT per-rule — they live at the i-Case level
// under selectedZoneIds / selectedPropertyIds so all rules operate on the same
// declared scope. This keeps the demo MVP simple while still expressive enough
// for every example the user described.

export const RULE_CATEGORIES = [
  { key: "trigger",      label: "Triggers · when…",      color: "#06b6d4" },
  { key: "action",       label: "Actions · do…",         color: "#a855f7" },
  { key: "notification", label: "Notifications · notify…", color: "#f59e0b" },
  { key: "condition",    label: "Conditions · only if…", color: "#10b981" },
];

export const RULES = {
  // ----- Triggers -----
  customer_enters_zone: {
    key: "customer_enters_zone",
    category: "trigger",
    icon: "🚪",
    label: "Customer enters a zone",
    summary: "Fire when a tracked customer steps into any of the scoped zones.",
  },
  new_property_listed: {
    key: "new_property_listed",
    category: "trigger",
    icon: "🆕",
    label: "New property listed",
    summary: "Fire whenever a new matching listing appears in scope.",
  },
  daily_schedule: {
    key: "daily_schedule",
    category: "trigger",
    icon: "📅",
    label: "Daily at scheduled time",
    summary: "Run this i-Case once a day on a fixed schedule.",
  },
  price_drop: {
    key: "price_drop",
    category: "trigger",
    icon: "💰",
    label: "Price drops on a tracked property",
    summary: "Fire when any selected property's price falls.",
  },
  status_change: {
    key: "status_change",
    category: "trigger",
    icon: "🔄",
    label: "Property status changes",
    summary: "Fire when sale / rent / under-offer status flips.",
  },
  client_question: {
    key: "client_question",
    category: "trigger",
    icon: "💬",
    label: "Client sends a question",
    summary: "Fire when a selected AI customer messages you.",
  },

  // ----- Actions -----
  find_relationships: {
    key: "find_relationships",
    category: "action",
    icon: "🔍",
    label: "Find relationships across zones",
    summary: "Match properties between Zone 1 and Zone 2 by price band, size, type.",
  },
  generate_analysis: {
    key: "generate_analysis",
    category: "action",
    icon: "📊",
    label: "Generate area analysis",
    summary: "Produce an AI report on the scoped area.",
  },
  send_welcome: {
    key: "send_welcome",
    category: "action",
    icon: "✉️",
    label: "Send a welcome message",
    summary: "Auto-send a personalised intro when the trigger fires.",
  },
  send_daily_report: {
    key: "send_daily_report",
    category: "action",
    icon: "📋",
    label: "Send a daily report",
    summary: "Compile and dispatch a daily digest of scoped updates.",
  },
  schedule_viewing: {
    key: "schedule_viewing",
    category: "action",
    icon: "🤝",
    label: "Schedule a viewing",
    summary: "Offer the client a viewing slot for a selected property.",
  },
  compare_zones: {
    key: "compare_zones",
    category: "action",
    icon: "🆚",
    label: "Compare two zones",
    summary: "Run a side-by-side comparison between scoped zones.",
  },

  // ----- Notifications -----
  notify_me: {
    key: "notify_me",
    category: "notification",
    icon: "👤",
    label: "Notify me",
    summary: "Send the update straight to the agent (you).",
    recipientDefault: "me",
  },
  notify_agent: {
    key: "notify_agent",
    category: "notification",
    icon: "👥",
    label: "Notify assigned agent",
    summary: "Loop in one of the AI Agents assigned to this i-Case.",
    recipientDefault: "agent",
  },
  notify_client: {
    key: "notify_client",
    category: "notification",
    icon: "🧑‍💼",
    label: "Notify client",
    summary: "Message the assigned client with the update.",
    recipientDefault: "client",
  },

  // ----- Conditions -----
  price_below: {
    key: "price_below",
    category: "condition",
    icon: "💲",
    label: "Only if price is below…",
    summary: "Gate the workflow on a price threshold.",
  },
  type_matches: {
    key: "type_matches",
    category: "condition",
    icon: "🏘️",
    label: "Only if property type matches",
    summary: "Restrict to apartments, villas, offices, etc.",
  },
  in_specific_zone: {
    key: "in_specific_zone",
    category: "condition",
    icon: "📍",
    label: "Only if in a specific zone",
    summary: "Restrict to one of the scoped zones.",
  },
};

export const RULE_LIST = Object.values(RULES);

export function rulesByCategory() {
  return RULE_CATEGORIES.map((cat) => ({
    ...cat,
    rules: RULE_LIST.filter((r) => r.category === cat.key),
  }));
}
