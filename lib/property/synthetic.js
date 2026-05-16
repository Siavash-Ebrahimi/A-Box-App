// Synthetic property generator — used by both the Property and Agent Hub views
// to GUARANTEE a few demo properties appear inside any picked radius (500 m /
// 1 km / 1.5 km), even when the real mock dataset is sparse for that exact spot.
//
// Properties are placed uniformly at random within the circle, with realistic
// Dubai-shaped data (type, listing, price, beds, baths, sqft). Each carries a
// `_synthetic: true` flag so the popup can disclose it's a demo entry.
//
// Generation is deterministic per (seed, salt) so the same area + radius + filter
// set always produces the same synthetic IDs — no shuffling on re-render.

const RENT_PRICE = {
  apartment: [60000, 200000],
  studio:    [40000, 90000],
  villa:     [180000, 500000],
  townhouse: [120000, 260000],
  office:    [120000, 400000],
  retail:    [70000, 220000],
  warehouse: [80000, 320000],
  hotel:     [180000, 600000],
};
const SALE_PRICE = {
  apartment: [800000, 4500000],
  studio:    [400000, 950000],
  villa:     [3500000, 15000000],
  townhouse: [2200000, 5500000],
  penthouse: [6000000, 25000000],
  office:    [1500000, 6000000],
  retail:    [900000, 3500000],
  warehouse: [1500000, 8000000],
};

const BUILDING_SUFFIX = ["Tower", "Residence", "Heights", "Lofts", "Park View", "Garden", "Plaza"];

// ---- deterministic random ----
function rand(seed, salt) {
  let h = 2166136261;
  const s = String(seed) + "|" + String(salt);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h / 0x100000000;
}
function pick(seed, salt, arr) {
  return arr[Math.floor(rand(seed, salt) * arr.length)];
}
function inRange(seed, salt, [min, max]) {
  return Math.round(min + rand(seed, salt) * (max - min));
}

// Map a filter value → (type, listing, activities). Used so a generated property
// is guaranteed to satisfy whichever filter the user has ticked.
function shapeForFilter(filterValue, seed, salt) {
  switch (filterValue) {
    case "shop_rent":
      return { type: "retail", listing: "rent", activities: ["rent", "retail"] };
    case "shop_sell":
      return { type: "retail", listing: "sale", activities: ["sell", "buy", "retail"] };
    case "mfg_rent":
      return { type: "warehouse", listing: "rent", activities: ["rent", "manufacturing"] };
    case "mfg_sell":
      return { type: "warehouse", listing: "sale", activities: ["sell", "buy", "manufacturing"] };
    case "office_rent":
      return { type: "office", listing: "rent", activities: ["rent", "office"] };
    case "office_sell":
      return { type: "office", listing: "sale", activities: ["sell", "buy", "office"] };
    case "hotel":
      return { type: "hotel", listing: "rent", activities: ["hotel"] };
    case "airbnb":
    case "short_stay": {
      const type = pick(seed, salt + ".t", ["studio", "apartment"]);
      return { type, listing: "rent", activities: ["rent", "airbnb"] };
    }
    case "rent": {
      const type = pick(seed, salt + ".t", ["apartment", "studio", "townhouse"]);
      return { type, listing: "rent", activities: ["rent"] };
    }
    case "sell":
    default: {
      const type = pick(seed, salt + ".t", ["apartment", "villa", "townhouse", "studio"]);
      return { type, listing: "sale", activities: ["sell", "buy"] };
    }
  }
}

function generateOne({ center, radius, seed, salt, filterValue }) {
  // Uniform within circle: angle uniform, distance ∝ √u for uniform area.
  const angle = rand(seed, salt + ".a") * 2 * Math.PI;
  const dist = Math.sqrt(rand(seed, salt + ".d")) * radius * 0.85; // stay inside
  const earthR = 6378137;
  const dLat = ((dist * Math.cos(angle)) / earthR) * (180 / Math.PI);
  const dLng =
    ((dist * Math.sin(angle)) / earthR) *
    (180 / Math.PI) /
    Math.cos((center.lat * Math.PI) / 180);

  const { type, listing, activities } = shapeForFilter(filterValue, seed, salt);
  const priceRange = listing === "rent" ? RENT_PRICE[type] : SALE_PRICE[type];
  const price = inRange(seed, salt + ".p", priceRange || [800000, 3000000]);

  const isResidential = ["apartment", "studio", "villa", "townhouse", "penthouse"].includes(type);
  const beds = type === "studio" ? 0
    : !isResidential ? 0
    : type === "villa" ? inRange(seed, salt + ".b", [3, 5])
    : inRange(seed, salt + ".b", [1, 3]);
  const baths = beds === 0 ? 1 : Math.max(1, beds);
  const sqft = type === "studio" ? inRange(seed, salt + ".s", [380, 600])
    : type === "villa" ? inRange(seed, salt + ".s", [2800, 6000])
    : type === "warehouse" ? inRange(seed, salt + ".s", [2000, 8000])
    : type === "retail" ? inRange(seed, salt + ".s", [400, 1200])
    : type === "office" ? inRange(seed, salt + ".s", [800, 2500])
    : inRange(seed, salt + ".s", [750, 1800]);

  const labelType = type.charAt(0).toUpperCase() + type.slice(1);
  const bedLabel = type === "studio" ? "Studio" : beds ? `${beds}BR ` : "";
  const buildingName = `Demo ${pick(seed, salt + ".bld", BUILDING_SUFFIX)}`;

  return {
    id: `syn_${seed.replace(/[^A-Za-z0-9]/g, "").slice(0, 12)}_${salt}`,
    _synthetic: true,
    title: `${bedLabel}${labelType} — Demo`,
    type,
    listing,
    price,
    beds,
    baths,
    area_sqft: sqft,
    building: buildingName,
    area: "Demo Area",
    lat: center.lat + dLat,
    lng: center.lng + dLng,
    image: `https://picsum.photos/seed/syn_${salt}/600/360`,
    agent: "Eshel Properties",
    agentPhone: "+971 50 000 0000",
    features: ["Demo property", "Generated for this radius"],
    yearBuilt: 2022,
    status: "available",
    activities,
  };
}

// Top up the property list with synthetic dummies until we hit `target`.
// Cycles through `activeFilters` so each picked filter gets at least one
// synthetic when supplementation is needed.
export function fillWithSynthetics({
  properties,
  center,
  radius,
  target = 3,
  seed,
  activeFilters,
}) {
  if (!center || typeof center.lat !== "number" || typeof center.lng !== "number") return properties;
  if (!Array.isArray(properties)) properties = [];
  if (properties.length >= target) return properties;

  const need = target - properties.length;
  const filters = (activeFilters && activeFilters.length > 0) ? activeFilters : ["rent", "sell"];

  const synthetics = [];
  for (let i = 0; i < need; i++) {
    const filterValue = filters[i % filters.length];
    synthetics.push(
      generateOne({ center, radius, seed: String(seed), salt: `${i}_${filterValue}`, filterValue }),
    );
  }
  return [...properties, ...synthetics];
}

// ---------------------------------------------------------------------------
// Per-filter top-up. For EACH active filter, ensures at least `targetPerFilter`
// matching properties exist inside the circle (real + synthetic). Avoids
// overlap with a minimum-separation pass that re-generates a synthetic up to
// `maxRetries` times if it lands within `minSeparationM` metres of any other
// pin already placed.
//
// Returned list is the union of all properties matching any active filter,
// deduped by id, ordered as: real first, then synthetics.
// ---------------------------------------------------------------------------

function metres(lat1, lng1, lat2, lng2) {
  const R = 6378137;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Pick a sensible minimum-separation distance based on the zone radius. We
// want pins visually distinct without forcing impossible placement in tight
// 500 m circles.
function minSeparationFor(radius) {
  if (radius <= 500) return 70;
  if (radius <= 1000) return 110;
  return 160;
}

export function fillPerFilterSynthetics({
  realProperties,           // already-matching real properties (any filter)
  matchesFilter,            // (property, filterValue) => bool — usually using PROPERTY_FILTERS
  center,
  radius,
  activeFilters = [],
  targetPerFilter = 3,
  seed,
}) {
  if (!center || typeof center.lat !== "number" || typeof center.lng !== "number") return [];
  if (!Array.isArray(realProperties)) realProperties = [];
  if (activeFilters.length === 0) return [];

  const minSep = minSeparationFor(radius);
  const placed = []; // running list of {lat, lng} we've committed to render
  const byId = new Map();

  // Helper: try to register a property at the given coords. Returns true if
  // it cleared the separation check.
  function tryPlace(p) {
    if (byId.has(p.id)) return false;
    for (const q of placed) {
      if (metres(p.lat, p.lng, q.lat, q.lng) < minSep) return false;
    }
    placed.push({ lat: p.lat, lng: p.lng });
    byId.set(p.id, p);
    return true;
  }

  // 1) Per filter, collect up to `targetPerFilter` REAL matches first.
  const used = new Set();
  const perFilterReal = new Map();
  for (const f of activeFilters) {
    const matches = realProperties
      .filter((p) => !used.has(p.id) && matchesFilter(p, f));
    // Take up to target, with separation pass
    const taken = [];
    for (const p of matches) {
      if (taken.length >= targetPerFilter) break;
      if (tryPlace(p)) { taken.push(p); used.add(p.id); }
    }
    perFilterReal.set(f, taken);
  }

  // 2) Top up each filter to `targetPerFilter` with synthetics. Each
  // synthetic is generated up to MAX_TRIES times to clear the separation
  // check; if it can't, we accept the last attempt.
  const MAX_TRIES = 8;
  for (const f of activeFilters) {
    const have = perFilterReal.get(f).length;
    const need = Math.max(0, targetPerFilter - have);
    for (let i = 0; i < need; i++) {
      let placedOk = false;
      let last = null;
      for (let attempt = 0; attempt < MAX_TRIES && !placedOk; attempt++) {
        const candidate = generateOne({
          center,
          radius,
          seed: String(seed),
          salt: `${f}_${i}_${attempt}`,
          filterValue: f,
        });
        last = candidate;
        if (tryPlace(candidate)) placedOk = true;
      }
      if (!placedOk && last) {
        // Couldn't clear the separation — accept anyway so user always sees
        // their requested 3 pins, even in extremely tight radii.
        placed.push({ lat: last.lat, lng: last.lng });
        byId.set(last.id, last);
      }
    }
  }

  return [...byId.values()];
}
