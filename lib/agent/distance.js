// Equirectangular distance — accurate enough for filtering properties by saved area.
export function metersBetween(aLat, aLon, bLat, bLon) {
  const R = 6371000;
  const x = ((bLon - aLon) * Math.PI) / 180 *
    Math.cos(((aLat + bLat) / 2) * Math.PI / 180);
  const y = ((bLat - aLat) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * R;
}

// Returns properties that fall inside any of the saved zones, with `distance` (meters)
// to the nearest matching zone attached. A property only "matches" a zone if at least
// one of the zone's selected activities (e.g. "rent", "office", "airbnb") is also one
// of the property's derived activities. Zones with no activities selected match all
// properties (treat as "any").
export function filterPropertiesByZones(properties, zones) {
  if (!zones || zones.length === 0) {
    return properties.map((p) => ({ ...p, distance: null, matchedZone: null }));
  }
  const out = [];
  for (const p of properties) {
    const propActs = p.activities || [];
    let best = null;
    for (const z of zones) {
      const d = metersBetween(p.lat, p.lng, z.lat, z.lng);
      if (d > z.radius) continue;
      const zoneActs = z.activities || [];
      // No activities on the zone = match anything in radius. Otherwise require intersection.
      if (zoneActs.length > 0) {
        const hasMatch = zoneActs.some((a) => propActs.includes(a));
        if (!hasMatch) continue;
      }
      if (!best || d < best.distance) {
        best = { distance: Math.round(d), matchedZone: z };
      }
    }
    if (best) out.push({ ...p, ...best });
  }
  return out.sort((a, b) => a.distance - b.distance);
}
