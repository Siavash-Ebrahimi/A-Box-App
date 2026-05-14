// POST /api/enrich — PHASE 2 of the analysis.
//
// Receives the Phase-1 analysis result and runs all LLM-driven work in parallel:
//   - executive report (4 sections)
//   - competitor insights (summary + details for the "Read More" modal)
//   - per-category success factors
//   - property agency search (Eshel partner injection for UAE)
//   - per-street explanations for top 5 streets
//   - "why this spot" reasoning for top 3 recommendations
//
// No Overpass calls happen here — that work is already done by Phase 1. As a result
// this endpoint reliably completes inside Vercel's 60s limit even on slow LLM days,
// because every call runs in parallel and the slowest one determines total time.
//
// If any individual LLM call fails or times out, we just omit that field from the
// response — the frontend treats absent fields as "fell back to template / unavailable"
// and the rest of the UI is unaffected.

import { NextResponse } from "next/server";
import {
  explainStreet,
  generateCityFactors,
  generateOverallReport,
  generateRecommendationReasoning,
  generateCompetitorInsights,
} from "@/lib/ai";
import { findPropertyAgencies } from "@/lib/propertySearch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    businessType,
    cityHint,
    latitude,
    longitude,
    competitorSampleNames = [],
    topStreets = [],
    recommendations = [],
    meta = {},
  } = body || {};

  if (!businessType || !Array.isArray(topStreets) || !Array.isArray(recommendations)) {
    return NextResponse.json(
      { error: "Required: businessType, topStreets[], recommendations[]" },
      { status: 400 },
    );
  }

  const reportExtras = {
    totalCommercial: meta.totalCommercial,
    totalCompetitors: meta.totalCompetitors,
    transitStops: meta.transitStops,
    anchors: meta.anchors,
    residentialBuildings: meta.residentialBuildings,
    competitorSampleNames,
  };

  // Cap per-street LLM explanations to the top 5 (more than enough — the recommended
  // spots are always within the top 3, and the click-to-expand UI rarely goes deeper).
  const TOP_N_EXPLAIN = Math.min(5, topStreets.length);
  const streetsToExplain = topStreets.slice(0, TOP_N_EXPLAIN);

  // Everything runs in parallel. allSettled so a partial failure doesn't drop the rest.
  const [
    reportR,
    insightsR,
    factorsR,
    agenciesR,
    explanationsR,
    reasonsR,
  ] = await Promise.allSettled([
    generateOverallReport(businessType, topStreets, cityHint, reportExtras),
    generateCompetitorInsights(businessType, topStreets, cityHint, reportExtras),
    generateCityFactors(businessType, cityHint),
    findPropertyAgencies(businessType, cityHint, null, { lat: latitude, lon: longitude }),
    Promise.all(streetsToExplain.map((s) => explainStreet(businessType, s))),
    Promise.all(
      recommendations
        .slice(0, 3)
        .map((r) => generateRecommendationReasoning(businessType, r, cityHint)),
    ),
  ]);

  const explanations =
    explanationsR.status === "fulfilled"
      ? explanationsR.value.map((e, i) => ({
          street: streetsToExplain[i].street,
          text: e.text,
          source: e.source,
        }))
      : [];

  const recReasons =
    reasonsR.status === "fulfilled"
      ? reasonsR.value.map((r) => ({ text: r.text, source: r.source }))
      : [];

  return NextResponse.json({
    report: reportR.status === "fulfilled" ? reportR.value : null,
    competitorInsights: insightsR.status === "fulfilled" ? insightsR.value : null,
    successFactors: factorsR.status === "fulfilled" ? factorsR.value : null,
    agencies:
      agenciesR.status === "fulfilled"
        ? agenciesR.value
        : { source: "error", agencies: [] },
    explanations,    // [{ street, text, source }] for top N streets
    recReasons,      // [{ text, source }] indexed to recommendations[]
  });
}
