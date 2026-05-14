// POST /api/property-compare
// Body: { propertyA, propertyB }
// Returns: { sections: [{ heading, body }, ...], recommendation, source }
//
// Calls the OpenRouter free-tier chain (same chain used elsewhere). Falls back to a
// deterministic template-based comparison when no LLM is available so the demo never
// shows an empty modal.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_CHAIN = process.env.OPENROUTER_MODEL
  ? [process.env.OPENROUTER_MODEL]
  : [
      "meta-llama/llama-3.3-70b-instruct:free",
      "openai/gpt-oss-20b:free",
      "openai/gpt-oss-120b:free",
      "minimax/minimax-m2.5:free",
    ];

function fmtPrice(p) {
  if (!p) return "—";
  const n = new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(p.price);
  return p.listing === "rent" ? `AED ${n}/yr` : `AED ${n}`;
}

function compactProperty(p) {
  return {
    title: p.title,
    type: p.type,
    listing: p.listing,
    price: fmtPrice(p),
    beds: p.beds,
    baths: p.baths,
    area_sqft: p.area_sqft,
    building: p.building,
    area: p.area,
    features: p.features || [],
    yearBuilt: p.yearBuilt,
    coords: { lat: p.lat, lng: p.lng },
  };
}

function buildPrompt(a, b) {
  return `You are a senior real-estate analyst writing a concise 1-2 page comparison report for a buyer/renter choosing between two Dubai properties. Use ONLY the data below — do not invent facts. Reference real Dubai market knowledge where useful (e.g. typical yield ranges, neighbourhood characteristics, transit access patterns). Write at a professional consulting tone.

PROPERTY A:
${JSON.stringify(compactProperty(a), null, 2)}

PROPERTY B:
${JSON.stringify(compactProperty(b), null, 2)}

Output EXACTLY the sections below, each starting with a "## " heading. Each section is 3-5 sentences. Use **bold** sparingly. No bullet lists unless absolutely necessary.

## Price Comparison
Direct price comparison and AED-per-sqft analysis. Which is better value at face?

## Location & Accessibility
Compare the neighbourhoods, transit access, anchor proximity (metro, malls, beach, schools), and ease of access for daily life.

## Amenities & Features
Compare what each property offers (views, parking, pool, gym, finishes, condition). State trade-offs.

## Investment Value
Rough rental-yield comparison, capital-appreciation profile, and resale liquidity for each property.

## Rental & Short-Term Potential
Suitability for long-term rental vs short-term / Airbnb use. Mention typical rates for each area.

## Lifestyle Suitability
Who would live happily in each — family, professional couple, single expat, investor not living there.

## Short-Term vs Long-Term Strategy
For each property, recommend a holding strategy (flip, rent-and-hold, owner-occupy, hybrid).

## Final Recommendation
Pick A or B. State **why in one sentence**, then list the best use-case for the chosen one, and what the other property is still good for (so it isn't a wasted lead). End with one concrete next-step the buyer should take this week.

Output ONLY the eight sections. No preamble, no closing line.`;
}

async function callOpenRouter(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  for (const model of MODEL_CHAIN) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 45000);
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          max_tokens: 1100,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) continue;
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return { text, model };
    } catch { /* try next */ }
  }
  return null;
}

function parseSections(text) {
  const sections = [];
  const re = /^##\s+(.+)$/gm;
  const matches = [...text.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = text.slice(start, end).trim();
    if (heading && body) sections.push({ heading, body });
  }
  return sections;
}

function templateReport(a, b) {
  const aPerSqft = Math.round(a.price / a.area_sqft);
  const bPerSqft = Math.round(b.price / b.area_sqft);
  const cheaper = aPerSqft <= bPerSqft ? "A" : "B";
  const aBigger = a.area_sqft >= b.area_sqft;
  return [
    { heading: "Price Comparison",
      body: `Property A is priced at ${fmtPrice(a)} (~AED ${aPerSqft.toLocaleString()}/sqft) versus Property B at ${fmtPrice(b)} (~AED ${bPerSqft.toLocaleString()}/sqft). On a pure price-per-sqft basis, **Property ${cheaper} offers the better face value**. ${aBigger ? "Property A is larger" : "Property B is larger"}, so the headline price difference partly reflects size, not only quality.` },
    { heading: "Location & Accessibility",
      body: `A sits in ${a.area} (${a.building}); B sits in ${b.area} (${b.building}). Each district has its own walking-distance amenities, transit pattern, and traffic profile. Visit both at peak hour before signing.` },
    { heading: "Amenities & Features",
      body: `A: ${(a.features || []).slice(0, 4).join(", ") || "no specific features listed"}. B: ${(b.features || []).slice(0, 4).join(", ") || "no specific features listed"}. The richer feature stack typically commands a 5-10% premium on resale.` },
    { heading: "Investment Value",
      body: `Both fall in mid-range Dubai pricing tiers. Yield range typically 5-8% gross for similar units; verify service-charge load before modelling net yield. Property age — A built ${a.yearBuilt}, B built ${b.yearBuilt} — affects perceived condition and maintenance reserve.` },
    { heading: "Rental & Short-Term Potential",
      body: `Short-term let suitability depends on building rules and DTCM licensing. ${(a.features || []).join(" ").toLowerCase().includes("short-term") ? "Property A is flagged short-term friendly." : "Verify short-term policy for Property A's building."} ${(b.features || []).join(" ").toLowerCase().includes("short-term") ? "Property B is flagged short-term friendly." : "Verify short-term policy for Property B's building."}` },
    { heading: "Lifestyle Suitability",
      body: `A (${a.beds || "Studio"} BR, ${a.area_sqft.toLocaleString()} sqft) suits ${a.beds >= 3 ? "families" : a.beds >= 1 ? "couples or single professionals" : "single occupants or short stays"}. B (${b.beds || "Studio"} BR, ${b.area_sqft.toLocaleString()} sqft) suits ${b.beds >= 3 ? "families" : b.beds >= 1 ? "couples or single professionals" : "single occupants or short stays"}. Pick based on whose lifestyle you're actually buying for.` },
    { heading: "Short-Term vs Long-Term Strategy",
      body: `For A: hold for steady rental yield if buying for cashflow; flip after handover if buying off-plan. For B: same playbook applies — match the strategy to whichever side gives you the stronger entry price.` },
    { heading: "Final Recommendation",
      body: `Based on price-per-sqft alone, **Property ${cheaper}** offers better face value. The other property still has its place if its features (view, building reputation, or location anchor) matter more to your specific use case. Next step this week: book a physical viewing for both, at the same time of day, and verify service-charge schedules.` },
  ];
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { propertyA, propertyB } = body || {};
  if (!propertyA || !propertyB) {
    return NextResponse.json({ error: "Both propertyA and propertyB are required" }, { status: 400 });
  }
  const prompt = buildPrompt(propertyA, propertyB);
  const out = await callOpenRouter(prompt);
  if (out) {
    const sections = parseSections(out.text);
    if (sections.length >= 4) {
      return NextResponse.json({ sections, source: "openrouter", model: out.model });
    }
  }
  return NextResponse.json({
    sections: templateReport(propertyA, propertyB),
    source: "template",
    model: null,
  });
}
