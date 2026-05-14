// i-Case templates — pre-built workflow recipes the agent can spawn into their
// dashboard. Each template carries a category icon, a trigger, a list of steps,
// and a colour. Users name their own instance, pick zones, and assign AI agents
// and AI customers. The actual execution is simulated for the MVP.

export const ICASE_TEMPLATES = {
  welcome_lead: {
    key: "welcome_lead",
    name: "Welcome New Leads",
    category: "Leads",
    icon: "👋",
    color: "#06b6d4",
    description:
      "When someone reaches one of your working zones, alert the team and warm them up automatically.",
    trigger: "A customer enters one of the assigned working zones",
    steps: [
      "Notify me + assigned AI agents",
      "Send a personalised welcome message",
      "Analyse the zone for matching properties",
      "Schedule a 24h follow-up reminder",
    ],
  },
  hot_lead_hunter: {
    key: "hot_lead_hunter",
    name: "Hot Lead Hunter",
    category: "Sales",
    icon: "🔥",
    color: "#f59e0b",
    description:
      "Spots high-intent customer chats and pushes them to your closer the moment the signal fires.",
    trigger: "An AI customer expresses high buying intent",
    steps: [
      "Score the conversation for intent",
      "Hand off to assigned Closer agent",
      "Suggest 3 best-fit properties from the zone",
      "Notify you for approval before sending",
    ],
  },
  market_pulse: {
    key: "market_pulse",
    name: "Daily Market Pulse",
    category: "Market",
    icon: "📊",
    color: "#a855f7",
    description:
      "Each morning, summarise what changed in your zones — new listings, price moves, demand signals.",
    trigger: "Daily at 09:00 local time",
    steps: [
      "Scan all assigned zones for new + updated listings",
      "Pull comp prices and inventory changes",
      "Generate a short brief in your inbox",
      "Highlight one opportunity worth a call today",
    ],
  },
  showing_followup: {
    key: "showing_followup",
    name: "Showing Follow-Up",
    category: "Follow-up",
    icon: "🔁",
    color: "#10b981",
    description:
      "Automatically thanks the prospect 24 h after a viewing and surfaces feedback questions you can act on.",
    trigger: "24 hours after a recorded property showing",
    steps: [
      "Send a personalised thank-you message",
      "Ask 3 calibrated feedback questions",
      "Score the response sentiment",
      "Notify you if a second viewing is likely",
    ],
  },
  rental_renewal: {
    key: "rental_renewal",
    name: "Rental Renewal Watch",
    category: "Rentals",
    icon: "📅",
    color: "#ec4899",
    description:
      "Tracks every rental in your zones approaching renewal and flags tenants likely to move.",
    trigger: "90 days before a tenancy end date",
    steps: [
      "Build a list of expiring tenancies in zone",
      "Check listing prices vs. current rent",
      "Draft an offer or re-listing email",
      "Notify you before any outreach goes out",
    ],
  },
};

export const ICASE_TEMPLATE_LIST = Object.values(ICASE_TEMPLATES);

// Friendly demo notifications generated when an i-Case is created, so the agent
// sees a populated card from the moment they save it. Real notifications would
// come from event triggers in a future release.
export function seedNotifications(template) {
  const now = Date.now();
  const samples = {
    welcome_lead: [
      "Maria Rodriguez entered Zone 1 — outreach sent, waiting on your approval.",
      "James Mitchell viewed 3 listings in Zone 2 — flagged as warm.",
    ],
    hot_lead_hunter: [
      "Sarah Khan asked about price 3 times in one chat — handing off to Sam.",
    ],
    market_pulse: [
      "Today's brief is ready — 4 new listings, 1 priced below comps.",
    ],
    showing_followup: [
      "24h passed since the Marina viewing — follow-up message drafted.",
    ],
    rental_renewal: [
      "3 tenancies in Zone 1 expire within 60 days — review pricing?",
    ],
  };
  const msgs = samples[template.key] || [
    "Sample event captured — open this case to see what would have happened.",
  ];
  return msgs.map((m, i) => ({
    id: `n_${now}_${i}`,
    message: m,
    ts: now - i * 60_000,
    approved: false,
  }));
}
