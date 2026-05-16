// Compute 2–3 "suggested locations" inside a search radius — small hotspots where
// properties cluster naturally. Pure JS (no Leaflet, no UI), safe to call from
// server or client.
//
// The output is intentionally filter-agnostic: we always look at every property
// in the radius regardless of the user's selected Sell/Rent/Airbnb/etc. filters
// so that the suggestions don't shift around as the user tweaks checkboxes.
// Each suggestion carries metadata the UI can use in a popup:
//   { rank, lat, lng, count, variety, listings: {sale, rent, ...},
//     priceRange: "AED 850K – 2.1M", sampleTitles: [...] }

import { metersBetween } from "@/lib/agent/distance";

export function computeAreaSuggestions(center, radius, properties, maxSuggestions = 3) {
  if (!center || !Array.isArray(properties) || properties.length === 0) return [];
  if (typeof center.lat !== "number" || typeof center.lng !== "number") return [];

  // Filter to properties inside the radius.
  const inRadius = properties.filter(
    (p) => metersBetween(p.lat, p.lng, center.lat, center.lng) <= radius,
  );
  if (inRadius.length === 0) return [];

  const k = Math.min(maxSuggestions, inRadius.length);

  // k-means++ style seeding (deterministic — pick the first, then the property
  // farthest from the current centroid set, repeat).
  let centroids = seedCentroids(inRadius, k);

  // 12 iterations is plenty for a small in-radius dataset.
  let clusters = Array.from({ length: k }, () => []);
  for (let iter = 0; iter < 12; iter++) {
    const next = Array.from({ length: k }, () => []);
    for (const p of inRadius) {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < k; i++) {
        const d = metersBetween(p.lat, p.lng, centroids[i].lat, centroids[i].lng);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      next[best].push(p);
    }
    clusters = next;
    // Recompute centroids.
    centroids = clusters.map((c, i) => {
      if (c.length === 0) return centroids[i];
      const lat = c.reduce((s, p) => s + p.lat, 0) / c.length;
      const lng = c.reduce((s, p) => s + p.lng, 0) / c.length;
      return { lat, lng };
    });
  }

  // Build suggestion objects.
  const suggestions = centroids
    .map((c, i) => {
      const props = clusters[i];
      if (props.length === 0) return null;
      const variety = new Set(props.map((p) => p.type)).size;
      const listings = props.reduce((acc, p) => {
        acc[p.listing] = (acc[p.listing] || 0) + 1;
        return acc;
      }, {});
      const prices = props.map((p) => p.price).filter((n) => typeof n === "number");
      const minP = prices.length ? Math.min(...prices) : null;
      const maxP = prices.length ? Math.max(...prices) : null;
      return {
        lat: c.lat,
        lng: c.lng,
        count: props.length,
        variety,
        listings,
        priceRange: minP != null && maxP != null ? `${short(minP)} – ${short(maxP)}` : null,
        sampleTitles: props.slice(0, 3).map((p) => p.title),
      };
    })
    .filter(Boolean);

  // Sort by cluster size (largest first), assign rank, return top N.
  suggestions.sort((a, b) => b.count - a.count);
  return suggestions.slice(0, maxSuggestions).map((s, i) => ({ ...s, rank: i + 1 }));
}

function seedCentroids(properties, k) {
  if (properties.length <= k) return properties.map((p) => ({ lat: p.lat, lng: p.lng }));
  const centroids = [{ lat: properties[0].lat, lng: properties[0].lng }];
  while (centroids.length < k) {
    let farthest = null;
    let farthestDist = -1;
    for (const p of properties) {
      let minDist = Infinity;
      for (const c of centroids) {
        const d = metersBetween(p.lat, p.lng, c.lat, c.lng);
        if (d < minDist) minDist = d;
      }
      if (minDist > farthestDist) { farthestDist = minDist; farthest = p; }
    }
    if (farthest) centroids.push({ lat: farthest.lat, lng: farthest.lng });
  }
  return centroids;
}

function short(price) {
  if (price >= 1_000_000) return `AED ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `AED ${Math.round(price / 1_000)}K`;
  return `AED ${price}`;
}
