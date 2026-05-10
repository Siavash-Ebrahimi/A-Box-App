// Pull supporting OSM signals that the PRD's basic formula ignores:
//   - Public transit stops (bus / metro / tram / train) → footfall driver.
//   - "Anchor" POIs (mall, school, hospital, hotel, mosque, park) → crowd magnets.
//   - Residential buildings → catchment population proxy.
//
// Each result is { id, kind, lat, lon, tags } so the scoring layer can do
// distance-based attribution per street.

import { postOverpass } from "./overpass.js";

function classify(tags) {
  if (!tags) return null;
  if (tags["public_transport"] === "stop_position") return "transit";
  if (tags["highway"] === "bus_stop") return "transit";
  if (tags["railway"] && ["station", "halt", "tram_stop", "subway_entrance"].includes(tags.railway)) return "transit";
  if (tags["shop"] === "mall") return "anchor";
  if (tags["amenity"] === "school" || tags["amenity"] === "university" || tags["amenity"] === "college") return "anchor";
  if (tags["amenity"] === "hospital" || tags["amenity"] === "clinic") return "anchor";
  if (tags["amenity"] === "place_of_worship") return "anchor";
  if (tags["tourism"] === "hotel") return "anchor";
  if (tags["leisure"] === "park" || tags["leisure"] === "stadium" || tags["leisure"] === "sports_centre") return "anchor";
  if (tags["building"] && /^(residential|apartments|house|terrace|detached|semidetached_house|dormitory)$/.test(tags["building"])) return "residential";
  return null;
}

function pointOf(el) {
  if (el.type === "node") return { lat: el.lat, lon: el.lon };
  if (el.center) return { lat: el.center.lat, lon: el.center.lon };
  return null;
}

export async function fetchEnrichment(lat, lon, radius) {
  const r = radius;
  const query = `[out:json][timeout:30];
(
  node["public_transport"="stop_position"](around:${r},${lat},${lon});
  node["highway"="bus_stop"](around:${r},${lat},${lon});
  node["railway"~"^(station|halt|tram_stop|subway_entrance)$"](around:${r},${lat},${lon});
  node["amenity"~"^(school|university|college|hospital|clinic|place_of_worship)$"](around:${r},${lat},${lon});
  way["amenity"~"^(school|university|college|hospital)$"](around:${r},${lat},${lon});
  node["tourism"="hotel"](around:${r},${lat},${lon});
  way["tourism"="hotel"](around:${r},${lat},${lon});
  node["shop"="mall"](around:${r},${lat},${lon});
  way["shop"="mall"](around:${r},${lat},${lon});
  node["leisure"~"^(park|stadium|sports_centre)$"](around:${r},${lat},${lon});
  way["leisure"~"^(park|stadium|sports_centre)$"](around:${r},${lat},${lon});
  way["building"~"^(residential|apartments|house|terrace|detached|semidetached_house|dormitory)$"](around:${r},${lat},${lon});
);
out center tags;`;

  const data = await postOverpass(query);
  const transit = [];
  const anchors = [];
  const residential = [];
  for (const el of data.elements || []) {
    const kind = classify(el.tags);
    if (!kind) continue;
    const p = pointOf(el);
    if (!p) continue;
    const item = {
      id: `${el.type}/${el.id}`,
      kind,
      lat: p.lat,
      lon: p.lon,
      tags: el.tags || {},
    };
    if (kind === "transit") transit.push(item);
    else if (kind === "anchor") anchors.push(item);
    else if (kind === "residential") residential.push(item);
  }
  return { transit, anchors, residential };
}
