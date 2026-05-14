// POST /api/enrich-overview — PHASE 2 of the three-phase analysis flow.
//
// Big-picture LLM content that doesn't depend on individual streets:
//   - executive report (4 sections)
//   - competitor insights (summary + details)
//   - per-category success factors
//   - property agency search (Eshel partner injection for UAE)
//
// This phase typically completes in 5–10 seconds because all LLM calls run in parallel
// via Promise.allSettled. It can never exceed Vercel's 60-second function limit since
// no Overpass calls happen here.
//
// Phase 3 (per-street paragraphs + per-recommendation reasoning) lives in
// /api/enrich-details and runs in parallel with this endpoint from the frontend.

import { NextResponse } from "next/server";
import {
  generateCityFactors,
  generateOverallReport,
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
    meta = {},
  } = body || {};

  if (!businessType || !Array.isArray(topStreets)) {
    return NextResponse.json(
      { error: "Required: businessType, topStreets[]" },
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

  const [reportR, insightsR, factorsR, agenciesR] = await Promise.allSettled([
    generateOverallReport(businessType, topStreets, cityHint, reportExtras),
    generateCompetitorInsights(businessType, topStreets, cityHint, reportExtras),
    generateCityFactors(businessType, cityHint),
    findPropertyAgencies(businessType, cityHint, null, { lat: latitude, lon: longitude }),
  ]);

  return NextResponse.json({
    report: reportR.status === "fulfilled" ? reportR.value : null,
    competitorInsights: insightsR.status === "fulfilled" ? insightsR.value : null,
    successFactors: factorsR.status === "fulfilled" ? factorsR.value : null,
    agencies:
      agenciesR.status === "fulfilled"
        ? agenciesR.value
        : { source: "error", agencies: [] },
  });
}
