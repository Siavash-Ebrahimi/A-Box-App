"use client";

// Local-only "Add Property" store. Properties the user adds via the "Add
// Property" flow are saved here per-browser. They appear alongside the
// built-in PROPERTIES dataset on the maps and in the sidebars.

const KEY = "abox.property.userAdded.v1";

function safeGet(fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function safeSet(value) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch {}
}

function activitiesFor(p) {
  const acts = [];
  if (p.type === "office") acts.push("office");
  if (p.type === "hotel") acts.push("hotel");
  if (p.type === "warehouse") acts.push("manufacturing");
  if (p.type === "retail") acts.push("retail");
  if (p.listing === "sale" && ["apartment","villa","townhouse","studio","penthouse"].includes(p.type)) acts.push("sell", "buy");
  if (p.listing === "rent" && ["apartment","villa","townhouse","studio","penthouse"].includes(p.type)) acts.push("rent");
  if (p.listing === "sale" && !acts.includes("sell")) acts.push("sell", "buy");
  if (p.listing === "rent" && !acts.includes("rent") && !["office","hotel","warehouse","retail"].includes(p.type)) acts.push("rent");
  return [...new Set(acts)];
}

export function loadUserProperties() {
  return safeGet([]);
}

export function addUserProperty(prop) {
  const next = [
    ...loadUserProperties(),
    {
      ...prop,
      id: prop.id || `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      _userAdded: true,
      agent: prop.agent || "You",
      agentPhone: prop.agentPhone || "—",
      image: prop.image || `https://picsum.photos/seed/user_${Date.now()}/600/360`,
      features: prop.features || ["User-added"],
      yearBuilt: prop.yearBuilt || new Date().getFullYear(),
      status: "available",
      activities: activitiesFor(prop),
    },
  ];
  safeSet(next);
  return next;
}

export function removeUserProperty(id) {
  const next = loadUserProperties().filter((p) => p.id !== id);
  safeSet(next);
  return next;
}
