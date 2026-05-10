// Overpass API client + business category → OSM tag mapping.
// Returns normalized business records: { id, name, lat, lon, category, tags }

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// Map our friendly business categories to OSM tag selectors.
// Each entry produces one Overpass query line per OSM tag.
export const CATEGORY_TAGS = {
  mens_salon: [["shop", "hairdresser"], ["shop", "beauty"]],
  bakery: [["shop", "bakery"]],
  coffee_shop: [["amenity", "cafe"]],
  clothing_store: [["shop", "clothes"]],
  barber_shop: [["shop", "hairdresser"]],
  restaurant: [["amenity", "restaurant"], ["amenity", "fast_food"]],
  grocery_store: [["shop", "supermarket"], ["shop", "convenience"], ["shop", "grocery"]],
  pharmacy: [["amenity", "pharmacy"], ["shop", "chemist"]],
};

export const CATEGORY_LABELS = {
  mens_salon: "Men's Salon",
  bakery: "Bakery",
  coffee_shop: "Coffee Shop",
  clothing_store: "Clothing Store",
  barber_shop: "Barber Shop",
  restaurant: "Restaurant",
  grocery_store: "Grocery Store",
  pharmacy: "Pharmacy",
};

function buildCompetitorQuery(category, lat, lon, radius) {
  const selectors = CATEGORY_TAGS[category] || [["shop", category]];
  const lines = selectors
    .map(([k, v]) => `node["${k}"="${v}"](around:${radius},${lat},${lon});`)
    .join("\n  ");
  return `[out:json][timeout:25];\n(\n  ${lines}\n);\nout center tags;`;
}

// Broad commercial activity query — anything tagged shop=* or common amenities.
function buildCommercialQuery(lat, lon, radius) {
  return `[out:json][timeout:25];
(
  node["shop"](around:${radius},${lat},${lon});
  node["amenity"~"^(cafe|restaurant|fast_food|pharmacy|bank|bar|pub|fuel)$"](around:${radius},${lat},${lon});
);
out center tags;`;
}

// Exported so other lib modules (e.g. enrichment.js) share the same retry/mirror logic.
export async function postOverpass(query, { maxAttempts = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    for (const endpoint of OVERPASS_ENDPOINTS) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 50000);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "GeoIntelMVP/1.0",
          },
          body: "data=" + encodeURIComponent(query),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        // 429 = rate-limited, 5xx = server-side issue; both warrant trying another mirror.
        if (res.status === 429 || res.status >= 500) {
          lastErr = new Error(`Overpass ${endpoint} HTTP ${res.status}`);
          console.warn(`${lastErr.message} (attempt ${attempt})`);
          continue;
        }
        if (!res.ok) {
          lastErr = new Error(`Overpass ${endpoint} HTTP ${res.status}`);
          continue;
        }
        return await res.json();
      } catch (err) {
        clearTimeout(timer);
        console.warn(`Overpass ${endpoint} failed (attempt ${attempt}):`, err?.cause?.code || err?.message || err);
        lastErr = err;
      }
    }
    // Every mirror failed on this pass. Back off before retrying.
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr || new Error("Overpass request failed after retries");
}

function normalizeElement(el) {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;
  let category = "unknown";
  if (tags.shop) category = `shop:${tags.shop}`;
  else if (tags.amenity) category = `amenity:${tags.amenity}`;
  return {
    id: `${el.type}/${el.id}`,
    name: tags.name || tags["name:en"] || category,
    lat,
    lon,
    category,
    street: tags["addr:street"] || null,
    tags,
  };
}

export async function fetchCompetitors(category, lat, lon, radius) {
  const query = buildCompetitorQuery(category, lat, lon, radius);
  const data = await postOverpass(query);
  const els = data.elements || [];
  return els.map(normalizeElement).filter(Boolean);
}

export async function fetchCommercialActivity(lat, lon, radius) {
  const query = buildCommercialQuery(lat, lon, radius);
  const data = await postOverpass(query);
  const els = data.elements || [];
  return els.map(normalizeElement).filter(Boolean);
}

// Fetch named street geometries within radius. Returns Map<lowercaseName, {name, paths: [[lat,lon]...]}>.
// Each way is indexed under every name variant it carries (name, name:en, name:ar, alt_name, etc.)
// so a business tagged in English can still resolve to a way named in Arabic, and vice versa.
export async function fetchStreetGeometries(lat, lon, radius) {
  const query = `[out:json][timeout:30];
(
  way["highway"~"^(primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|unclassified|service|living_street|pedestrian|footway|cycleway|trunk|trunk_link)$"]["name"](around:${radius},${lat},${lon});
);
out geom;`;
  const data = await postOverpass(query);
  const ways = data.elements || [];
  const map = new Map();

  for (const w of ways) {
    if (w.type !== "way" || !Array.isArray(w.geometry)) continue;
    const tags = w.tags || {};
    const variants = [
      tags.name,
      tags["name:en"],
      tags["name:ar"],
      tags.int_name,
      tags.alt_name,
      tags.official_name,
      tags.short_name,
    ].filter(Boolean);
    if (variants.length === 0) continue;
    const path = w.geometry.map((p) => [p.lat, p.lon]);
    const canonical = tags["name:en"] || tags.name;
    const highway = tags.highway || null;
    for (const v of variants) {
      for (const key of normalizeKeys(v)) {
        if (!map.has(key)) map.set(key, { name: canonical, paths: [], highways: new Set() });
        const entry = map.get(key);
        entry.paths.push(path);
        if (highway) entry.highways.add(highway);
      }
    }
  }
  // Pick a single representative highway class per street (the most "important" one).
  const classRank = ["trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street", "pedestrian", "footway", "service", "cycleway"];
  for (const entry of map.values()) {
    let best = null, bestRank = Infinity;
    for (const h of entry.highways) {
      const base = h.replace(/_link$/, "");
      const r = classRank.indexOf(base);
      if (r !== -1 && r < bestRank) { bestRank = r; best = base; }
    }
    entry.highway = best || [...entry.highways][0] || null;
    delete entry.highways;
  }
  return map;
}

// Produce a few normalized lookup keys for a street name so we can match across
// minor differences ("Al Wasl Road" vs "al wasl rd" vs "Al Wasl St").
function normalizeKeys(name) {
  const base = name.toLowerCase().trim().replace(/\s+/g, " ");
  const stripped = base
    .replace(/\b(street|st|road|rd|avenue|ave|boulevard|blvd|lane|ln|drive|dr|way)\b\.?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const keys = new Set([base, stripped]);
  return [...keys].filter(Boolean);
}
