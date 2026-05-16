"use client";

// LocalStorage-backed persistence for the Agent Hub MVP. No backend required —
// each agent's saved zones, favourites, and chat history live in their browser.
// All reads are SSR-safe (return defaults when window is undefined).

// Free-tier limit. The UI shows an upsell card and disables zone creation once
// the agent has saved this many zones. Bump (or remove) when paid tiers ship.
export const FREE_TIER_MAX_ZONES = 3;

const ZONES_KEY = "abox.agent.zones.v1";
const ZONE_LAYERS_KEY = "abox.agent.zoneLayers.v1";
const ZONE_BIZ_SUMMARY_KEY = "abox.agent.zoneBizSummary.v1";
const ZONE_FAV_RECS_KEY = "abox.agent.zoneFavRecs.v1";
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
  // Drop the orphaned layer state too so re-using the same id later doesn't
  // resurrect a stale "Property on" toggle.
  const layers = loadZoneLayers();
  if (layers[zoneId]) {
    const { [zoneId]: _dropL, ...restL } = layers;
    safeSet(ZONE_LAYERS_KEY, restL);
  }
  // Drop the cached business summary too — same reasoning.
  const summaries = safeGet(ZONE_BIZ_SUMMARY_KEY, {});
  if (summaries[zoneId]) {
    const { [zoneId]: _dropB, ...restB } = summaries;
    safeSet(ZONE_BIZ_SUMMARY_KEY, restB);
  }
  // Drop favourited recommendations for this zone too.
  const favRecs = safeGet(ZONE_FAV_RECS_KEY, {});
  if (favRecs[zoneId]) {
    const { [zoneId]: _dropF, ...restF } = favRecs;
    safeSet(ZONE_FAV_RECS_KEY, restF);
  }
  return next;
}

// --- Per-zone layer state ---
//
// Each saved zone has two togglable "layers" (Property + Business). The layer
// drawer in the sidebar persists which ones are active, whether the drawer is
// open, and per-layer settings (property-type filters, business category).

export const DEFAULT_ZONE_LAYER = {
  propertyOn: false,
  businessOn: false,
  expanded: true,
  propertyFilters: [],          // empty array = show all listing-types
  businessCategory: "mens_salon",
  // Independent of the layer-on checkbox, each layer also has its own
  // sub-drawer in the sidebar (the chevron on the right). Open by default
  // when the layer is on so the Add Property / Add Business buttons are
  // immediately reachable.
  propertyDrawerOpen: true,
  businessDrawerOpen: true,
  // Gate: until the agent has clicked at least one filter chip in the Property
  // ribbon, the map shows a hint banner and no property pins (per the user
  // spec — "do not show any property on the map until user toggles a chip").
  propertyTouched: false,
};

export function loadZoneLayers() {
  return safeGet(ZONE_LAYERS_KEY, {});
}

export function getZoneLayer(zoneId) {
  const all = loadZoneLayers();
  return { ...DEFAULT_ZONE_LAYER, ...(all[zoneId] || {}) };
}

export function updateZoneLayer(zoneId, patch) {
  const all = loadZoneLayers();
  const curr = { ...DEFAULT_ZONE_LAYER, ...(all[zoneId] || {}) };
  const next = { ...all, [zoneId]: { ...curr, ...patch } };
  safeSet(ZONE_LAYERS_KEY, next);
  return next;
}

// --- Per-zone business-analysis summaries ---
//
// The full business analysis result (gold/silver/bronze + paths + reports) is
// too heavy to persist on every render. Instead we save a slim summary so the
// Dashboard's "Your Working Zones" cards can show which zones have been
// analysed and what category was searched, without re-running the analysis.

export function loadZoneBusinessSummaries() {
  return safeGet(ZONE_BIZ_SUMMARY_KEY, {});
}

export function updateZoneBusinessSummary(zoneId, patch) {
  const all = loadZoneBusinessSummaries();
  const next = { ...all, [zoneId]: { ...(all[zoneId] || {}), ...patch } };
  safeSet(ZONE_BIZ_SUMMARY_KEY, next);
  return next;
}

export function clearZoneBusinessSummary(zoneId) {
  const all = loadZoneBusinessSummaries();
  if (!all[zoneId]) return all;
  const { [zoneId]: _drop, ...rest } = all;
  safeSet(ZONE_BIZ_SUMMARY_KEY, rest);
  return rest;
}

// --- Per-zone favourite business recommendations ---
//
// When the user clicks the ★ on a recommendation popup (the cyan numbered
// stars produced by the per-zone business analysis), we persist a small
// snapshot of that recommendation here so it survives navigation and shows
// up on the dashboard / i-Cases later.
//
// Shape: { [zoneId]: [{ id, street, tier, score, summary, reason, lat, lon, savedAt }, ...] }
//
// Stable id is computed from street + rounded coords so re-running the
// analysis on the same zone doesn't lose the favourite.

export function recommendationKey(rec) {
  if (!rec) return "";
  const lat = typeof rec.lat === "number" ? rec.lat.toFixed(5) : "?";
  const lon = typeof rec.lon === "number" ? rec.lon.toFixed(5) : "?";
  return `${rec.street || "?"}|${lat}|${lon}`;
}

export function loadFavoriteRecommendations() {
  return safeGet(ZONE_FAV_RECS_KEY, {});
}

export function isFavoriteRecommendation(zoneId, rec) {
  const all = loadFavoriteRecommendations();
  const list = all[zoneId] || [];
  const key = recommendationKey(rec);
  return list.some((r) => r.id === key);
}

export function toggleFavoriteRecommendation(zoneId, rec) {
  const all = loadFavoriteRecommendations();
  const list = all[zoneId] || [];
  const key = recommendationKey(rec);
  const exists = list.find((r) => r.id === key);
  const next = exists
    ? { ...all, [zoneId]: list.filter((r) => r.id !== key) }
    : {
      ...all,
      [zoneId]: [
        ...list,
        {
          id: key,
          street: rec.street,
          tier: rec.tier,
          score: rec.score,
          summary: rec.summary,
          reason: rec.reason || null,
          lat: rec.lat,
          lon: rec.lon,
          highway: rec.highway || null,
          savedAt: Date.now(),
        },
      ],
    };
  safeSet(ZONE_FAV_RECS_KEY, next);
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

// Patch a couple of fields on the active profile (name + company are the only
// editable ones today). Returns the updated profile object so callers can echo
// it into React state.
export function updateProfile(patch) {
  const curr = loadProfile();
  const next = {
    ...curr,
    ...patch,
    name: typeof patch.name === "string" && patch.name.trim()
      ? patch.name.trim()
      : curr.name,
    company: typeof patch.company === "string"
      ? (patch.company.trim() || curr.company)
      : curr.company,
  };
  saveProfile(next);
  return next;
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
