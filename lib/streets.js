// Group businesses by street name. Resolution order:
//   1. The OSM addr:street tag on the business (cheapest, most accurate when present).
//   2. Spatial snap to the nearest known way geometry (no network calls).
//   3. Nominatim reverse-geocode (rate-limited; capped per request).
//   4. Coarse "Area lat,lon" grid bucket as a last resort.

import { reverseGeocode } from "./nominatim.js";

const RG_BUDGET_PER_REQUEST = 25;       // cap reverse-geocoding calls per analysis
const SNAP_THRESHOLD_METERS = 80;       // a business must be within this distance of a way to snap

function gridBucketName(lat, lon) {
  const a = lat.toFixed(3);
  const b = lon.toFixed(3);
  return `Area ${a},${b}`;
}

function centroid(items) {
  let sx = 0, sy = 0;
  for (const it of items) { sx += it.lat; sy += it.lon; }
  return { lat: sx / items.length, lon: sy / items.length };
}

// Equirectangular distance in meters — accurate enough at street scale.
function metersBetween(aLat, aLon, bLat, bLon) {
  const R = 6371000;
  const x = ((bLon - aLon) * Math.PI) / 180 * Math.cos(((aLat + bLat) / 2) * Math.PI / 180);
  const y = ((bLat - aLat) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * R;
}

// Distance from point to a path (polyline), checked vertex-by-vertex. Cheap and good enough.
function distanceToPath(lat, lon, path) {
  let min = Infinity;
  for (const [pLat, pLon] of path) {
    const d = metersBetween(lat, lon, pLat, pLon);
    if (d < min) min = d;
  }
  return min;
}

// Find the nearest street name in the geometry index. Returns { name, distance } or null.
function snapToStreet(lat, lon, geometries) {
  if (!geometries || geometries.size === 0) return null;
  let best = null;
  for (const entry of geometries.values()) {
    for (const path of entry.paths) {
      const d = distanceToPath(lat, lon, path);
      if (d < (best?.distance ?? Infinity)) best = { name: entry.name, distance: d };
    }
  }
  if (!best || best.distance > SNAP_THRESHOLD_METERS) return null;
  return best;
}

export async function groupByStreet(businesses, geometries) {
  const groups = new Map();
  const needsLookup = [];

  // Pass 1: addr:street tag.
  for (const b of businesses) {
    const street = b.tags?.["addr:street"] || b.street;
    if (street) {
      addToGroup(groups, street, b);
      continue;
    }
    needsLookup.push(b);
  }

  // Pass 2: spatial snap to nearest known way.
  const stillUnresolved = [];
  for (const b of needsLookup) {
    const snap = snapToStreet(b.lat, b.lon, geometries);
    if (snap) {
      addToGroup(groups, snap.name, b);
    } else {
      stillUnresolved.push(b);
    }
  }

  // Pass 3: Nominatim reverse geocode (capped).
  const lookups = stillUnresolved.slice(0, RG_BUDGET_PER_REQUEST);
  for (const b of lookups) {
    const geo = await reverseGeocode(b.lat, b.lon);
    const street = geo?.address?.road || geo?.address?.pedestrian || geo?.address?.footway;
    if (street) addToGroup(groups, street, b);
    else addToGroup(groups, gridBucketName(b.lat, b.lon), b);
    await new Promise((r) => setTimeout(r, 120));
  }

  // Pass 4: coarse grid bucket.
  for (const b of stillUnresolved.slice(RG_BUDGET_PER_REQUEST)) {
    addToGroup(groups, gridBucketName(b.lat, b.lon), b);
  }

  return Array.from(groups.entries()).map(([name, items]) => ({
    street: name,
    items,
    center: centroid(items),
  }));
}

function addToGroup(groups, key, item) {
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(item);
}
