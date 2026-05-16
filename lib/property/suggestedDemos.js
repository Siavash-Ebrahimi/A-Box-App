// Pick 2–3 "demo-pre-picked" property IDs from the properties that fall inside
// an active radius. These appear on the map with a green ✓ check badge so the
// user immediately sees a handful of candidates to interact with for the other
// sections of the app (Send to AI, compare, drag into i-Case workspace, etc.).
//
// Two guarantees:
//   1) Deterministic — same area+radius always produces the same picks (no
//      reshuffling on re-render).
//   2) Spatially separated — picks are at least `minSep` metres apart so they
//      don't overlap or visually mask each other on the map. If the candidate
//      pool is too dense to fit the target count at the strict minSep, we
//      iteratively relax it until enough picks fit (or we run out of options).
//
// Target count by radius:
//   500 m  → 2 picks
//   1 km   → 3 picks
//   1.5 km → 3 picks
//   else   → 3 picks

import { metersBetween } from "@/lib/agent/distance";

export function pickDemoHighlights(properties, radiusMeters, seed = "") {
  if (!Array.isArray(properties) || properties.length === 0) return new Set();

  const target = radiusMeters <= 500 ? 2 : 3;
  if (properties.length <= target) return new Set(properties.map((p) => p.id));

  // Stable deterministic order via tiny string hash of id+seed.
  const ordered = properties
    .map((p) => ({ p, h: hash(p.id + "|" + seed) }))
    .sort((a, b) => a.h - b.h)
    .map((x) => x.p);

  // Start strict (~35% of radius), relax progressively if we can't fit target.
  const strictSep = radiusMeters * 0.35;
  const minFloor = 25; // never go below ~25m (avoids fully overlapping pins).
  const attempts = [strictSep, strictSep * 0.7, strictSep * 0.45, minFloor];

  for (const minSep of attempts) {
    const picks = [];
    for (const p of ordered) {
      if (picks.length >= target) break;
      const tooClose = picks.some(
        (q) => metersBetween(p.lat, p.lng, q.lat, q.lng) < minSep,
      );
      if (!tooClose) picks.push(p);
    }
    if (picks.length >= target) {
      return new Set(picks.map((p) => p.id));
    }
  }

  // Even at minimum separation we ran out — return whatever fit on the last pass.
  const fallback = [];
  for (const p of ordered) {
    const tooClose = fallback.some(
      (q) => metersBetween(p.lat, p.lng, q.lat, q.lng) < minFloor,
    );
    if (!tooClose) fallback.push(p);
    if (fallback.length >= target) break;
  }
  return new Set(fallback.map((p) => p.id));
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}
