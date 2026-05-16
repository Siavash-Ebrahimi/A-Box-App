"use client";

// LocalStorage-backed persistence for the Agent Hub MVP. No backend required —
// each agent's saved zones, favourites, and chat history live in their browser.
// All reads are SSR-safe (return defaults when window is undefined).

// Free-tier limit. The UI shows an upsell card and disables zone creation once
// the agent has saved this many zones. Bump (or remove) when paid tiers ship.
export const FREE_TIER_MAX_ZONES = 3;

const ZONES_KEY = "abox.agent.zones.v1";
const FAVS_KEY = "abox.agent.favourites.v1";
const CHATS_KEY = "abox.agent.chats.v1";
const PROFILE_KEY = "abox.agent.profile.v1";
const BOOTSTRAP_KEY = "abox.agent.bootstrapped.v1";
const ICASES_KEY = "abox.agent.icases.v1";

// Free-tier limits — agents see the upsell pattern instead of being silently capped.
export const FREE_TIER_MAX_ICASES = 2;

function safeGet(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota, private-mode etc — silently ignore */
  }
}

// --- Working areas / zones ---
//
// Zones gained extra fields over time (addressLabel, assignedAgents,
// assignedCustomers). loadZones() applies safe defaults so legacy entries
// from earlier MVP versions still render correctly.

function hydrateZone(z) {
  return {
    activities: [],
    addressLabel: null,
    assignedAgents: [],
    assignedCustomers: [],
    ...z,
  };
}

export function loadZones() {
  return safeGet(ZONES_KEY, []).map(hydrateZone);
}

export function saveZones(zones) {
  safeSet(ZONES_KEY, zones);
}

export function addZone(zone) {
  const zones = loadZones();
  const next = [...zones, hydrateZone({ ...zone, id: `zone_${Date.now()}` })];
  saveZones(next);
  return next;
}

export function updateZone(zoneId, patch) {
  const next = loadZones().map((z) => (z.id === zoneId ? { ...z, ...patch } : z));
  saveZones(next);
  return next;
}

export function removeZone(zoneId) {
  const next = loadZones().filter((z) => z.id !== zoneId);
  saveZones(next);
  return next;
}

// --- Favourites ---

export function loadFavourites() {
  return new Set(safeGet(FAVS_KEY, []));
}

export function toggleFavourite(propertyId) {
  const favs = loadFavourites();
  if (favs.has(propertyId)) favs.delete(propertyId);
  else favs.add(propertyId);
  safeSet(FAVS_KEY, [...favs]);
  return favs;
}

// --- Chat history (per persona) ---
//   shape: { [personaKey]: [{ role, content, ts, sharedProperty? }, ...] }

export function loadChats() {
  return safeGet(CHATS_KEY, {});
}

export function saveChats(chats) {
  safeSet(CHATS_KEY, chats);
}

export function clearChat(personaKey) {
  const all = loadChats();
  delete all[personaKey];
  saveChats(all);
  return all;
}

// --- Agent profile (mock — no auth) ---
//
// Only ONE agent profile is saved at a time. The bootstrap flag controls whether
// the welcome screen is shown:
//   undefined  → first visit, show AgentBootstrap
//   "demo"     → user picked Demo Agent
//   "custom"   → user created their own (saved in PROFILE_KEY with kind: "custom")
//
// Custom agents can be deleted via deleteCustomAgent(), which resets the bootstrap
// flag so the welcome screen shows again on next visit.

export const DEFAULT_PROFILE = {
  kind: "demo",
  name: "Demo Agent",
  email: "agent@eshelproperties.com",
  company: "Eshel Properties",
  membership: "MVP Preview",
};

export function loadProfile() {
  return safeGet(PROFILE_KEY, DEFAULT_PROFILE);
}

export function saveProfile(profile) {
  safeSet(PROFILE_KEY, profile);
}

export function loadBootstrap() {
  return safeGet(BOOTSTRAP_KEY, null);
}

export function bootstrapAsDemo() {
  safeSet(BOOTSTRAP_KEY, "demo");
  saveProfile(DEFAULT_PROFILE);
}

export function bootstrapAsCustom(name) {
  const cleanName = (name || "").trim() || "My Agent";
  safeSet(BOOTSTRAP_KEY, "custom");
  saveProfile({
    kind: "custom",
    name: cleanName,
    email: "",
    company: "Independent",
    membership: "Local demo",
  });
}

// Remove a custom agent and reset bootstrap so the welcome screen appears again.
// Zones / favourites / chats are intentionally kept — they live in the browser, not
// in the agent profile, so the same workspace stays useful after switching identities.
export function deleteCustomAgent() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(BOOTSTRAP_KEY);
    localStorage.removeItem(PROFILE_KEY);
  } catch { /* ignore */ }
}

// --- i-Cases (workflow assistances) ---
//
// Shape: {
//   id, name, templateKey, zoneIds[], agentKeys[], customerKeys[],
//   status: "active" | "paused",
//   notifications: [{ id, message, ts, approved? }],
//   createdAt
// }
// The actual workflow execution is simulated for the MVP — i-Cases are visual
// cards demonstrating what an automation would do, not a real cron/event engine.

function hydrateICase(c) {
  return {
    name: "",
    description: "",
    templateKey: "custom",
    zoneIds: [],
    agentKeys: [],
    customerKeys: [],
    selectedPropertyIds: [],
    rules: [],          // workspace rule list: [{ id, toolKey, recipient?, note? }]
    workspaceNotes: "", // free-form scenario notes
    status: "active",
    notifications: [],
    createdAt: 0,
    ...c,
  };
}

export function loadICases() {
  return safeGet(ICASES_KEY, []).map(hydrateICase);
}

export function saveICases(arr) {
  safeSet(ICASES_KEY, arr);
}

export function addICase(c) {
  const next = [
    ...loadICases(),
    hydrateICase({ ...c, id: `case_${Date.now()}`, createdAt: Date.now() }),
  ];
  saveICases(next);
  return next;
}

export function updateICase(id, patch) {
  const next = loadICases().map((c) => (c.id === id ? { ...c, ...patch } : c));
  saveICases(next);
  return next;
}

export function removeICase(id) {
  const next = loadICases().filter((c) => c.id !== id);
  saveICases(next);
  return next;
}
