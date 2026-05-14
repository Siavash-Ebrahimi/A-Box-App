// AI Agent personas — the team-mate roster the agent assigns to working zones
// and i-Cases. Different from AI Customers (who are clients reaching out).
//
// In this MVP they appear as roster members in the sidebar and as assignable
// chips on zone cards and i-Cases. Real conversational interactions with AI
// agents (delegated tasks, hand-offs) are out of MVP scope.

export const AI_AGENTS = {
  closer_sam: {
    key: "closer_sam",
    name: "Sam Reyes",
    avatar: "S",
    color: "#10b981",
    role: "Senior Closer",
    specialty: "Closes high-value sales deals · 12 yrs Dubai market",
    style: "Direct, urgency-driven, great at handling objections",
  },
  qualifier_lyla: {
    key: "qualifier_lyla",
    name: "Lyla Adel",
    avatar: "L",
    color: "#06b6d4",
    role: "Lead Qualifier",
    specialty: "Filters and scores inbound enquiries before you call",
    style: "Friendly, thorough, asks the right questions early",
  },
  offplan_omar: {
    key: "offplan_omar",
    name: "Omar Hassan",
    avatar: "O",
    color: "#a855f7",
    role: "Off-Plan Specialist",
    specialty: "Developer projects, payment plans, post-handover",
    style: "Numbers-first, talks ROI and developer track records",
  },
  negotiator_noor: {
    key: "negotiator_noor",
    name: "Noor Khalifa",
    avatar: "N",
    color: "#f59e0b",
    role: "Negotiator",
    specialty: "Price negotiation, counter-offers, fast cash deals",
    style: "Calm, data-backed, never the first to blink",
  },
  analyst_karim: {
    key: "analyst_karim",
    name: "Karim Mansour",
    avatar: "K",
    color: "#ef4444",
    role: "Market Analyst",
    specialty: "Comps, ROI analysis, trend reports",
    style: "Analytical, citation-heavy, always with a chart",
  },
};

export const AI_AGENT_LIST = Object.values(AI_AGENTS);
