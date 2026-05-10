// Reverse geocoding via Nominatim. Limited usage — we batch and cache in-memory.

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const UA = "GeoIntelMVP/1.0 (educational use)";
const cache = new Map();

function key(lat, lon) {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}

export async function reverseGeocode(lat, lon) {
  const k = key(lat, lon);
  if (cache.has(k)) return cache.get(k);
  const url = `${ENDPOINT}?lat=${lat}&lon=${lon}&format=json&zoom=17&addressdetails=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
    if (!res.ok) {
      cache.set(k, null);
      return null;
    }
    const data = await res.json();
    cache.set(k, data);
    return data;
  } catch {
    cache.set(k, null);
    return null;
  }
}

// Polite throttling: at most ~1 req/sec to Nominatim.
export async function reverseGeocodeBatch(points) {
  const out = [];
  for (const p of points) {
    const data = await reverseGeocode(p.lat, p.lon);
    out.push({ ...p, geo: data });
    if (!cache.has(key(p.lat, p.lon))) {
      // already added; spacing only when actual network call happened
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return out;
}
