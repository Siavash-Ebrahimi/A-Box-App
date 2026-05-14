// POST /api/enrich-details — PHASE 3 of the three-phase analysis flow.
//
// Per-item LLM content tied to specific streets / specific recommendation spots:
//   - per-street LLM paragraphs for the top 5 streets (replace the templates from Phase 1)
//   - "why this spot" reasoning for each of the top 3 recommendations
//
// Phase 3 runs in parallel with Phase 2 (/api/enrich-overview) from the frontend, so
// total user-visible time after Phase 1 is max(overview, details) ≈ 5–15 seconds.
// If either phase fails or times out, the other still delivers — the user keeps the
// AI content from whichever succeeded.

import { NextResponse } from "next/server";
import { explainStreet, generateRecommendationReasoning } from "@/lib/ai";

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
    topStreets = [],
    recommendations = [],
  } = body || {};

  if (!businessType || !Array.isArray(topStreets) || !Array.isArray(recommendations)) {
    return NextResponse.json(
      { error: "Required: businessType, topStreets[], recommendations[]" },
      { status: 400 },
    );
  }

  const TOP_N_EXPLAIN = Math.min(5, topStreets.length);
  const streetsToExplain = topStreets.slice(0, TOP_N_EXPLAIN);

  const [explanationsR, reasonsR] = await Promise.allSettled([
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
    explanations,    // [{ street, text, source }] — keyed by street name in the frontend
    recReasons,      // [{ text, source }] — index-aligned with recommendations[]
  });
}
