// POST /api/analyze — PHASE 1 of a two-phase analysis flow.
//
// This phase contains ONLY deterministic / non-LLM work (Overpass queries, scoring,
// street ranking, template explanations). It always completes inside Vercel's 60s
// serverless-function limit because no slow LLM calls are made here.
//
// PHASE 2 (LLM enrichment — executive report, competitor insights, property agency
// search, per-street paragraphs, recommendation reasoning) lives in /api/enrich and
// runs separately from the frontend after this endpoint returns. That way neither
// phase alone can ever exceed the timeout.

import { NextResponse } from "next/server";
import {
  fetchCompetitors,
  fetchCommercialActivity,
  fetchStreetGeometries,
  CATEGORY_TAGS,
} from "@/lib/overpass";
import { fetchEnrichment } from "@/lib/enrichment";
import { groupByStreet } from "@/lib/streets";
import { scoreStreet } from "@/lib/scoring";
import { weightsFor } from "@/lib/categoryWeights";
import {
  explainStreet,
  buildFinalRecommendation,
  aiProviderStatus,
} from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TRANSIT_RADIUS_M = 300;
const ANCHOR_RADIUS_M  = 250;
const RESIDENTIAL_RADIUS_M = 250;

// Tags worth surfacing in the click-popup. Most are sparse in OSM but valuable when present.
const POPUP_TAGS = [
  "phone", "contact:phone", "website", "contact:website",
  "opening_hours", "start_date",
  "brand", "brand:wikidata",
  "addr:street", "addr:housenumber", "addr:city",
  "cuisine", "wheelchair", "delivery", "takeaway",
];

function pickPopupTags(t) {
  if (!t) return {};
  const out = {};
  for (const k of POPUP_TAGS) if (t[k]) out[k] = t[k];
  return out;
}

function brandKeyOf(b) {
  const bw = b.tags?.["brand:wikidata"];
  if (bw) return `wd:${bw}`;
  const br = b.tags?.brand;
  if (br) return `br:${br.toLowerCase().trim()}`;
  const nm = (b.name || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (nm.length >= 3) return `nm:${nm}`;
  return null;
}

// Human-friendly label for an anchor POI (used in the recommendation popup).
function labelAnchor(a) {
  const t = a.tags || {};
  const name = t.name || t["name:en"];
  let kind = "";
  if (t.shop === "mall") kind = "mall";
  else if (t.amenity === "school" || t.amenity === "university" || t.amenity === "college") kind = "school";
  else if (t.amenity === "hospital" || t.amenity === "clinic") kind = "hospital";
  else if (t.amenity === "place_of_worship") kind = t.religion === "muslim" ? "mosque" : "place of worship";
  else if (t.tourism === "hotel") kind = "hotel";
  else if (t.leisure === "park") kind = "park";
  else if (t.leisure === "stadium") kind = "stadium";
  else if (t.leisure === "sports_centre") kind = "sports centre";
  if (name) return kind ? `${name} (${kind})` : name;
  return kind || "anchor POI";
}

function anchorKindOf(a) {
  const t = a.tags || {};
  if (t.shop === "mall") return "mall";
  if (t.amenity === "school" || t.amenity === "university" || t.amenity === "college") return "school";
  if (t.amenity === "hospital" || t.amenity === "clinic") return "hospital";
  if (t.amenity === "place_of_worship") return t.religion === "muslim" ? "mosque" : "place of worship";
  if (t.tourism === "hotel") return "hotel";
  if (t.leisure === "park") return "park";
  if (t.leisure === "stadium") return "stadium";
  if (t.leisure === "sports_centre") return "sports centre";
  return "anchor";
}

// Pick the best concrete point on a street to recommend opening at, weighted by the
// chosen business category (different categories value different anchors / less or more
// sensitive to competition).
function pickBestSpot(street, anchors, competitorPoints, weights) {
  const candidates = [];
  if (street.paths && street.paths.length > 0) {
    for (const path of street.paths) {
      // Sample every other point so we don't spend time evaluating dense polylines.
      for (let i = 0; i < path.length; i += 2) {
        candidates.push({ lat: path[i][0], lon: path[i][1] });
      }
    }
  }
  if (candidates.length === 0) {
    candidates.push({ lat: street.center.lat, lon: street.center.lon });
  }

  let best = null;
  for (const p of candidates) {
    let score = 0;
    const nearby = [];
    for (const a of anchors) {
      const d = metersBetween(p.lat, p.lon, a.lat, a.lon);
      if (d <= 250) {
        const kind = anchorKindOf(a);
        const w = weights.anchorWeights[kind] ?? 0.4;
        score += ((250 - d) / 25) * w;        // up to +10 × kind-weight per anchor at 0m
        nearby.push({ label: labelAnchor(a), distance: Math.round(d), kind });
      }
    }
    let nearestComp = Infinity;
    for (const c of competitorPoints) {
      const d = metersBetween(p.lat, p.lon, c.lat, c.lon);
      if (d < nearestComp) nearestComp = d;
    }
    // Penalty if too close to an existing competitor — scaled by category sensitivity.
    if (nearestComp < weights.minClearance) {
      score -= ((weights.minClearance - nearestComp) / 4) * weights.competitionPenalty;
    }

    if (!best || score > best.score) {
      nearby.sort((a, b) => a.distance - b.distance);
      best = {
        lat: p.lat,
        lon: p.lon,
        score,
        nearbyAnchors: nearby.slice(0, 5),
        nearestCompetitorM: Number.isFinite(nearestComp) ? Math.round(nearestComp) : null,
      };
    }
  }
  return best;
}

function lookupGeometry(geometries, streetName) {
  const base = streetName.toLowerCase().trim().replace(/\s+/g, " ");
  if (geometries.has(base)) return geometries.get(base);
  const stripped = base
    .replace(/\b(street|st|road|rd|avenue|ave|boulevard|blvd|lane|ln|drive|dr|way)\b\.?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped && geometries.has(stripped)) return geometries.get(stripped);
  return null;
}

// Equirectangular distance in meters.
function metersBetween(aLat, aLon, bLat, bLon) {
  const R = 6371000;
  const x = ((bLon - aLon) * Math.PI) / 180 * Math.cos(((aLat + bLat) / 2) * Math.PI / 180);
  const y = ((bLat - aLat) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * R;
}

function countWithin(items, lat, lon, radius) {
  let n = 0;
  for (const it of items) {
    if (metersBetween(lat, lon, it.lat, it.lon) <= radius) n++;
  }
  return n;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { latitude, longitude, radius, businessType, cityHint } = body || {};
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    typeof radius !== "number" ||
    typeof businessType !== "string"
  ) {
    return NextResponse.json(
      { error: "Required fields: latitude, longitude, radius (meters), businessType" },
      { status: 400 },
    );
  }
  if (!CATEGORY_TAGS[businessType]) {
    return NextResponse.json(
      { error: `Unknown businessType. Supported: ${Object.keys(CATEGORY_TAGS).join(", ")}` },
      { status: 400 },
    );
  }
  if (radius < 200 || radius > 8000) {
    return NextResponse.json({ error: "radius must be between 200 and 8000 meters" }, { status: 400 });
  }

  try {
    // Run the four Overpass queries + the LLM factors call in parallel, but use allSettled
    // so a flaky mirror or rate-limit on one optional query doesn't kill the whole analysis.
    // Critical queries: competitors + commercial. Optional: geometries + enrichment.
    const settled = await Promise.allSettled([
      fetchCompetitors(businessType, latitude, longitude, radius),
      fetchCommercialActivity(latitude, longitude, radius),
      fetchStreetGeometries(latitude, longitude, radius),
      fetchEnrichment(latitude, longitude, radius),
      generateCityFactors(businessType, cityHint),
    ]);
    const [compR, commR, geoR, enrR, facR] = settled;

    if (compR.status === "rejected" || commR.status === "rejected") {
      const reason = compR.status === "rejected" ? compR.reason?.message : commR.reason?.message;
      console.error("Critical Overpass query failed:", reason);
      return NextResponse.json(
        {
          error:
            "OpenStreetMap's free data service is busy right now. " +
            "Wait 30 seconds and try again, or reduce the search radius (smaller radius = lighter query).",
        },
        { status: 503 },
      );
    }

    const competitors = compR.value;
    const commercial = commR.value;
    const geometries = geoR.status === "fulfilled" ? geoR.value : new Map();
    const enrichment = enrR.status === "fulfilled" ? enrR.value : { transit: [], anchors: [], residential: [] };
    const factors = facR.status === "fulfilled"
      ? facR.value
      : { source: "template", text: "" };

    if (geoR.status === "rejected") console.warn("Street geometries unavailable:", geoR.reason?.message);
    if (enrR.status === "rejected") console.warn("Enrichment unavailable:", enrR.reason?.message);

    const competitorIds = new Set(competitors.map((c) => c.id));
    const streets = await groupByStreet(commercial, geometries);

    const ranked = streets
      .map((s) => {
        const competitorCount = s.items.filter((it) => competitorIds.has(it.id)).length;
        const geo = lookupGeometry(geometries, s.street);
        const transitNearby     = countWithin(enrichment.transit,     s.center.lat, s.center.lon, TRANSIT_RADIUS_M);
        const anchorsNearby     = countWithin(enrichment.anchors,     s.center.lat, s.center.lon, ANCHOR_RADIUS_M);
        const residentialNearby = countWithin(enrichment.residential, s.center.lat, s.center.lon, RESIDENTIAL_RADIUS_M);
        const { score, breakdown, tier } = scoreStreet({
          competitorCount,
          commercialItems: s.items,
          transitNearby,
          anchorsNearby,
          residentialNearby,
          highwayClass: geo?.highway || null,
        });
        return {
          street: s.street,
          center: s.center,
          score,
          tier,
          breakdown,
          paths: geo ? geo.paths : [],
          highway: geo?.highway || null,
          businesses: s.items.map((it) => ({
            id: it.id,
            name: it.name,
            lat: it.lat,
            lon: it.lon,
            category: it.category,
            isCompetitor: competitorIds.has(it.id),
            tags: pickPopupTags(it.tags),
          })),
        };
      })
      .filter((s) => s.businesses.length >= 2)
      .filter((s) => !/^Area \d/.test(s.street))
      .sort((a, b) => b.score - a.score);

    // Branch detection: group all surfaced businesses by brand-or-name across the dataset,
    // then attach the count + locations of siblings to each business.
    const brandIndex = new Map();
    for (const s of ranked) {
      for (const b of s.businesses) {
        const k = brandKeyOf(b);
        if (!k) continue;
        if (!brandIndex.has(k)) brandIndex.set(k, []);
        brandIndex.get(k).push({ id: b.id, lat: b.lat, lon: b.lon, street: s.street });
      }
    }
    for (const s of ranked) {
      for (const b of s.businesses) {
        const k = brandKeyOf(b);
        if (!k) continue;
        const all = brandIndex.get(k) || [];
        const others = all.filter((x) => x.id !== b.id);
        if (others.length > 0) {
          b.branches = others;
          b.brandKey = k;
        }
      }
    }

    // Sample competitor names — used by Phase 2 (enrich) for the LLM prompts.
    const competitorSampleNames = competitors
      .map((c) => c.name)
      .filter((n) => n && !n.startsWith("shop:") && !n.startsWith("amenity:"));

    // Template explanation for every street (instant, deterministic). Phase 2 will
    // upgrade the top streets with LLM-written paragraphs and merge them back in.
    const explanations = ranked.map((s) =>
      explainStreet(businessType, s, { skipLLM: true }),
    );
    // explainStreet with skipLLM is synchronous; resolve the promises:
    const resolvedExplanations = await Promise.all(explanations);
    resolvedExplanations.forEach((e, i) => {
      ranked[i].explanation = e.text;
      ranked[i].explanationSource = e.source;
    });

    const buckets = { gold: [], silver: [], bronze: [] };
    for (const s of ranked) buckets[s.tier].push(s);

    // Top 3 spots — picked logically, scored using category-specific weights so the
    // suggestion reflects the cultural/business nature (e.g. mosque adjacency for men's salons,
    // hospitals for pharmacies, malls for clothing). We also enforce ≥250 m separation between
    // picks so we never return three near-identical points.
    const competitorPoints = competitors.map((c) => ({ lat: c.lat, lon: c.lon }));
    const weights = weightsFor(businessType);
    const MIN_REC_SEPARATION_M = 250;

    const recommendationDrafts = [];
    for (const s of ranked) {
      if (recommendationDrafts.length >= 3) break;
      const spot = pickBestSpot(s, enrichment.anchors, competitorPoints, weights);
      const tooClose = recommendationDrafts.some(
        (r) => metersBetween(r.lat, r.lon, spot.lat, spot.lon) < MIN_REC_SEPARATION_M,
      );
      if (tooClose) continue;
      recommendationDrafts.push({
        lat: spot.lat,
        lon: spot.lon,
        street: s.street,
        tier: s.tier,
        score: Math.round(s.score),
        highway: s.highway || null,
        breakdown: s.breakdown,
        nearbyAnchors: spot.nearbyAnchors,
        nearestCompetitorM: spot.nearestCompetitorM,
        summary: [
          `${s.breakdown.competitors} direct competitor${s.breakdown.competitors === 1 ? "" : "s"} on this street`,
          spot.nearestCompetitorM != null
            ? `nearest competitor ${spot.nearestCompetitorM} m away`
            : null,
          `${spot.nearbyAnchors.length} anchor POI${spot.nearbyAnchors.length === 1 ? "" : "s"} within 250 m`,
          `${s.breakdown.transit} transit stop${s.breakdown.transit === 1 ? "" : "s"} within 300 m`,
        ].filter(Boolean).join(" · "),
      });
    }
    // If we still couldn't fill 3 (very sparse area), relax separation and refill.
    if (recommendationDrafts.length < 3) {
      for (const s of ranked) {
        if (recommendationDrafts.length >= 3) break;
        if (recommendationDrafts.some((r) => r.street === s.street)) continue;
        const spot = pickBestSpot(s, enrichment.anchors, competitorPoints, weights);
        recommendationDrafts.push({
          lat: spot.lat,
          lon: spot.lon,
          street: s.street,
          tier: s.tier,
          score: Math.round(s.score),
          highway: s.highway || null,
          breakdown: s.breakdown,
          nearbyAnchors: spot.nearbyAnchors,
          nearestCompetitorM: spot.nearestCompetitorM,
          summary: [
            `${s.breakdown.competitors} direct competitor${s.breakdown.competitors === 1 ? "" : "s"} on this street`,
            spot.nearestCompetitorM != null
              ? `nearest competitor ${spot.nearestCompetitorM} m away`
              : null,
            `${spot.nearbyAnchors.length} anchor POI${spot.nearbyAnchors.length === 1 ? "" : "s"} within 250 m`,
            `${s.breakdown.transit} transit stop${s.breakdown.transit === 1 ? "" : "s"} within 300 m`,
          ].filter(Boolean).join(" · "),
        });
      }
    }

    // Recommendation reasoning is an LLM call — it moves to Phase 2 (/api/enrich).
    // For now we ship the drafts without `reason`; the frontend will request enrich
    // and merge the reasoning when it arrives.
    const recommendations = recommendationDrafts;

    return NextResponse.json({
      ...buckets,
      recommendation: buildFinalRecommendation(businessType, ranked),
      recommendations,
      // These four fields are intentionally NOT populated here — they come from
      // Phase 2 (/api/enrich). The frontend treats their absence as "loading".
      successFactors: null,
      competitorInsights: null,
      report: null,
      agencies: null,
      // Phase-2 context: re-sent verbatim to /api/enrich so it has everything it needs
      // without re-running Overpass.
      enrichContext: {
        businessType,
        cityHint: cityHint || null,
        latitude,
        longitude,
        competitorSampleNames,
      },
      meta: {
        totalCommercial: commercial.length,
        totalCompetitors: competitors.length,
        transitStops: enrichment.transit.length,
        anchors: enrichment.anchors.length,
        residentialBuildings: enrichment.residential.length,
        streets: ranked.length,
        center: { latitude, longitude },
        radius,
        businessType,
        ai: aiProviderStatus(),
      },
    });
  } catch (err) {
    console.error("analyze failed", err);
    return NextResponse.json(
      {
        error:
          "Analysis failed: " + (err?.message || "unknown error") + ". " +
          "The free OpenStreetMap data service may be rate-limiting your IP. " +
          "Wait 30–60 seconds and try again, or reduce the radius.",
      },
      { status: 502 },
    );
  }
}
