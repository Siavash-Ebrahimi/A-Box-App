// AI explanation engine.
// Tries (in order): OpenRouter, then a local Ollama instance, then a deterministic
// template fallback so the app always returns a useful explanation.

import { CATEGORY_LABELS } from "./overpass.js";
import { curatedFactorsFor, buildCityFactorsPrompt } from "./successFactors.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
// Free OpenRouter models. We try them in order — when one is rate-limited, the next
// one is tried automatically. Override with OPENROUTER_MODEL in .env.local to force one.
const OPENROUTER_MODEL_CHAIN = process.env.OPENROUTER_MODEL
  ? [process.env.OPENROUTER_MODEL]
  : [
      "openai/gpt-oss-120b:free",       // best quality
      "openai/gpt-oss-20b:free",        // fast fallback
      "minimax/minimax-m2.5:free",      // alternate provider
      "meta-llama/llama-3.3-70b-instruct:free", // last resort
    ];
const OPENROUTER_MODEL = OPENROUTER_MODEL_CHAIN[0];

function buildPrompt(category, street) {
  const label = CATEGORY_LABELS[category] || category;
  const { breakdown, tier } = street;
  const highway = breakdown.highway || "unknown class";

  return `You are a market analyst. In 3 short sentences, explain whether "${street.street}" is a good location for opening a ${label}.

Street data:
- Direct competitors on the street: ${breakdown.competitors}
- Total nearby commercial businesses: ${breakdown.density}
- Category diversity: ${breakdown.variety} distinct types
- Public transit stops within 300 m: ${breakdown.transit}
- Anchor POIs nearby (mall/school/hospital/hotel/mosque/park): ${breakdown.anchors}
- Residential buildings within 250 m: ${breakdown.residential}
- Road class: ${highway}
- Tier: ${tier.toUpperCase()}

Be concise, practical, and explain the reasoning behind the ${tier} classification using the actual numbers above.`;
}

async function tryOpenRouter(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  for (const model of OPENROUTER_MODEL_CHAIN) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 350,
        }),
      });
      if (res.status === 429 || res.status === 503) continue;       // try next model in chain
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch {
      // network or parse error — try next
    }
  }
  return null;
}

async function tryOllama(prompt) {
  if (process.env.DISABLE_OLLAMA === "1") return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.response || "").trim() || null;
  } catch {
    return null;
  }
}

function templateExplanation(category, street) {
  const label = CATEGORY_LABELS[category] || category;
  const { breakdown, tier } = street;
  const competitorPhrase =
    breakdown.competitors === 0
      ? "no direct competitors"
      : breakdown.competitors === 1
      ? "one direct competitor"
      : `${breakdown.competitors} direct competitors`;
  const highway = breakdown.highway || "unspecified";
  const visibility =
    /^(trunk|primary|pedestrian)/.test(highway) ? "excellent visibility (a major or pedestrian street)"
    : /^(secondary|tertiary)/.test(highway) ? "decent visibility"
    : highway === "residential" ? "limited visibility (residential street)"
    : "neutral visibility";

  const supportBits = [];
  if (breakdown.transit > 0) supportBits.push(`${breakdown.transit} transit stop${breakdown.transit === 1 ? "" : "s"} within 300 m`);
  if (breakdown.anchors > 0) supportBits.push(`${breakdown.anchors} anchor POI${breakdown.anchors === 1 ? "" : "s"} (mall/school/hospital/hotel/mosque/park) nearby`);
  if (breakdown.residential > 0) supportBits.push(`${breakdown.residential} residential building${breakdown.residential === 1 ? "" : "s"} in walking distance`);
  const support = supportBits.length ? supportBits.join(", ") : "no nearby footfall drivers detected in OSM";

  if (tier === "gold") {
    return `${street.street} is Gold for a ${label}: ${competitorPhrase}, ${breakdown.density} active commercial businesses on or near the street, and ${support}. Road class is ${highway} — ${visibility}. Recommendation: a high-opportunity street; prioritise it during your site visit.`;
  }
  if (tier === "silver") {
    return `${street.street} is Silver for a ${label}: ${competitorPhrase}, commercial density of ${breakdown.density}, and ${support}. Road class is ${highway} — ${visibility}. Viable backup if Gold streets are unaffordable, but expect tougher competition for attention.`;
  }
  return `${street.street} is Bronze for a ${label}: with ${competitorPhrase} and only ${breakdown.density} commercial businesses nearby, plus ${support}, the area is either too quiet or already saturated. Road class is ${highway} — ${visibility}. Deprioritise unless rent is well below market.`;
}

// When `skipLLM` is true we go straight to the deterministic template (~0 ms) and
// never hit OpenRouter / Ollama. Used by the analyze route to keep total request
// time inside Vercel's 60-second serverless-function limit: only the top N streets
// get an LLM-written paragraph; the rest get the template (still informative,
// references the real numbers).
export async function explainStreet(category, street, { skipLLM = false } = {}) {
  if (skipLLM) {
    return { source: "template", text: templateExplanation(category, street) };
  }
  const prompt = buildPrompt(category, street);
  const fromRouter = await tryOpenRouter(prompt);
  if (fromRouter) return { source: "openrouter", text: fromRouter };
  const fromOllama = await tryOllama(prompt);
  if (fromOllama) return { source: "ollama", text: fromOllama };
  return { source: "template", text: templateExplanation(category, street) };
}

export async function generateCityFactors(category, cityHint) {
  const prompt = buildCityFactorsPrompt(category, cityHint);
  const fromRouter = await tryOpenRouter(prompt);
  if (fromRouter) return { source: "openrouter", text: fromRouter };
  const fromOllama = await tryOllama(prompt);
  if (fromOllama) return { source: "ollama", text: fromOllama };
  // Template fallback: 3 curated bullets, no paragraph.
  const bullets = curatedFactorsFor(category).slice(0, 3);
  return {
    source: "template",
    text: bullets.map((b) => `• ${b}`).join("\n"),
  };
}

// Overall executive-summary report shown in the right-side panel.
// Structured 4-section executive report.
// Output shape: { source, sections: [{ heading, body }, ...] }
//   1. Area Analysis        — character of the radius
//   2. Market Insights      — demand signals for THIS category in THIS city
//   3. Competitor Analysis  — saturation, key players, implications
//   4. Final Recommendation — top picks, trade-offs, what to verify
export async function generateOverallReport(category, ranked, cityHint, extras = {}) {
  const label = CATEGORY_LABELS[category] || category;
  const where = cityHint || "this area";
  if (!ranked || ranked.length === 0) {
    return {
      source: "template",
      sections: [
        { heading: "Area Analysis", body: `No suitable streets surfaced for a ${label} in ${where}. The radius may be too small or the area too residential.` },
        { heading: "Market Insights", body: "" },
        { heading: "Competitor Analysis", body: "" },
        { heading: "Final Recommendation", body: `Try a wider radius (1.5 km) or a different business category.` },
      ],
    };
  }

  const top5 = ranked.slice(0, 5);
  const streetLines = top5
    .map(
      (s, i) =>
        `${i + 1}. ${s.street} — ${s.tier.toUpperCase()} (score ${Math.round(s.score)}). competitors:${s.breakdown.competitors}, density:${s.breakdown.density}, variety:${s.breakdown.variety}, anchors:${s.breakdown.anchors}, transit:${s.breakdown.transit}, residential:${s.breakdown.residential}, road:${s.highway || "?"}`,
    )
    .join("\n");
  const topCompetitorNames = (extras.competitorSampleNames || []).slice(0, 8).join(", ") || "(no named competitors)";

  const prompt = `You are a senior retail location analyst at a Big-4 consulting firm, writing a professional Business Location Analysis for an entrepreneur considering opening a ${label} in ${where}. Reference contemporary international retail-marketing practice (catchment analysis, footfall capture, trade-area saturation, anchor adjacency, accessibility) where appropriate. Use ONLY the data below — do not invent facts. Be concrete, reference the actual numbers and named competitors, and write in a polished consulting tone.

DATA:
- Category: ${label}
- City: ${where}
- Total commercial businesses in radius: ${extras.totalCommercial ?? "?"}
- Total direct competitors of ${label}: ${extras.totalCompetitors ?? "?"}
- Transit stops in radius: ${extras.transitStops ?? "?"}
- Anchor POIs (mall/school/hospital/hotel/mosque/park): ${extras.anchors ?? "?"}
- Residential buildings in radius: ${extras.residentialBuildings ?? "?"}
- Sample competitor names: ${topCompetitorNames}

TOP 5 STREETS RANKED:
${streetLines}

Output EXACTLY four sections, each starting with a "## " heading. Each section is 4–6 sentences. Use **bold** sparingly for the most important numbers or street names. No bullet points unless absolutely necessary. Write at a level suitable for a printed PDF business report.

## Area Analysis
Describe the trade-area's commercial maturity, road hierarchy, and primary footfall generators in international retail terminology (e.g. "primary trade area", "anchor magnetism", "convenience footfall vs destination footfall"). Reference the actual numbers above.

## Market Insights
Demand signals for a ${label} specifically in ${where}. Cover catchment population proxy (residential density), accessibility (transit + road class), anchor adjacency, and any cultural/local nuance that shapes demand in this market. Mention international benchmarks where relevant (e.g. typical density thresholds for ${label}).

## Competitor Analysis
Map the competitive landscape for ${label} in this radius. Comment on saturation using the competitor count, name 1–2 of the actual competitors above where helpful, and discuss the implications for a new entrant (cluster effect vs. saturation, differentiation strategy).

## Final Recommendation
Specific, actionable advice. Name the top 1–2 streets to prioritise (use names from the data) and the explicit trade-offs. Then state 2 concrete pre-lease verifications: signage and frontage visibility, peak-hour foot traffic, lease terms, parking — pick the 2 most relevant.

Output ONLY the four sections. No preamble, no closing line.`;

  const text =
    (await tryOpenRouter(prompt)) || (await tryOllama(prompt)) || null;
  const source = text ? (process.env.OPENROUTER_API_KEY ? "openrouter" : "ollama") : "template";
  if (text) {
    const sections = parseSections(text);
    if (sections.length >= 4) return { source, sections };
  }
  return { source: "template", sections: templateReportSections(label, where, top5, extras) };
}

// Parse "## Heading\nbody…\n\n## Heading\nbody…" into [{heading, body}].
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

function templateReportSections(label, where, top5, extras) {
  const top = top5[0];
  const backup = top5[1];
  return [
    {
      heading: "Area Analysis",
      body: `${where} shows ${extras.totalCommercial ?? "many"} commercial businesses across the analysed radius, with ${extras.transitStops ?? 0} transit stops and ${extras.anchors ?? 0} anchor POIs (malls, schools, hospitals, hotels, mosques, parks). The road network spans ${top5.length} named streets carrying enough activity to score, suggesting an active commercial corridor rather than a purely residential pocket.`,
    },
    {
      heading: "Market Insights",
      body: `Demand for a ${label} in this radius is supported by ${extras.totalCompetitors ?? 0} existing same-category players, indicating real consumer interest. Footfall drivers (transit + anchors + residential catchment) cluster on the higher-tier streets, which favours this category when paired with the right frontage. Cultural and habitual patterns specific to ${where} should also be verified locally.`,
    },
    {
      heading: "Competitor Analysis",
      body: `The radius contains ${extras.totalCompetitors ?? 0} direct ${label} competitor${extras.totalCompetitors === 1 ? "" : "s"}. ${top.street} carries ${top.breakdown.competitors} of them on-street, while the surrounding mix shows ${top.breakdown.variety} distinct commercial categories — a healthy retail diversity rather than a saturated mono-culture. A new entrant can compete by differentiating on positioning relative to the strongest anchor cluster.`,
    },
    {
      heading: "Final Recommendation",
      body: `Prioritise **${top.street}** (${top.tier.toUpperCase()}, score ${Math.round(top.score)}) — ${top.breakdown.competitors} direct competitor${top.breakdown.competitors === 1 ? "" : "s"}, ${top.breakdown.anchors} anchor POI${top.breakdown.anchors === 1 ? "" : "s"}, ${top.breakdown.transit} transit stop${top.breakdown.transit === 1 ? "" : "s"} nearby${top.highway ? `, ${top.highway} road class` : ""}.${backup ? ` Backup: **${backup.street}** (${backup.tier.toUpperCase()}, score ${Math.round(backup.score)}) — slightly weaker support signals but viable.` : ""} On a site visit, verify (1) actual signage visibility from the road and (2) the typical foot-traffic pattern at your target opening hour, plus lease terms and parking.`,
    },
  ];
}

// One-paragraph reasoning for a SPECIFIC recommended spot. Different from the per-street
// explanation: this one is about why we picked THIS particular point, referencing the
// nearby anchors, distance to nearest competitor, and road class.
export async function generateRecommendationReasoning(category, rec, cityHint) {
  const label = CATEGORY_LABELS[category] || category;
  const where = cityHint || "this area";
  const anchorList = (rec.nearbyAnchors || []).length > 0
    ? rec.nearbyAnchors.map((a) => `${a.label} ~${a.distance}m`).join(", ")
    : "no anchor POIs detected within 250 m";
  const compLine = rec.nearestCompetitorM != null
    ? rec.nearestCompetitorM > 200
      ? `nearest direct competitor is ${rec.nearestCompetitorM} m away — comfortable separation`
      : `nearest direct competitor is ${rec.nearestCompetitorM} m away`
    : "no direct competitors of this category in the search radius";

  const prompt = `You are a local market analyst. Explain in ONE concise paragraph (3–4 sentences, max 80 words) WHY this exact spot was selected for opening a ${label} in ${where}, and why it is good for the entrepreneur.

Spot details:
- Street: ${rec.street} (${rec.tier.toUpperCase()}, score ${rec.score})
- Road class: ${rec.highway || "unspecified"}
- ${compLine}
- Anchor POIs nearby: ${anchorList}
- ${rec.breakdown?.transit ?? 0} transit stop(s) within 300 m
- ${rec.breakdown?.density ?? 0} commercial businesses on the street

Rules:
- Reference the specific data above (numbers, distances, anchor names).
- Speak directly to the entrepreneur ("you'll benefit from…").
- Do NOT use bullet points or markdown.
- Output the paragraph only.`;

  const fromRouter = await tryOpenRouter(prompt);
  if (fromRouter) return { source: "openrouter", text: fromRouter };
  const fromOllama = await tryOllama(prompt);
  if (fromOllama) return { source: "ollama", text: fromOllama };
  return { source: "template", text: templateRecommendationReason(label, rec, anchorList, compLine) };
}

function templateRecommendationReason(label, rec, anchorList, compLine) {
  const anchorPhrase =
    rec.nearbyAnchors && rec.nearbyAnchors.length > 0
      ? `Within 250 m you have ${anchorList}, which drive the kind of foot traffic a ${label} relies on.`
      : `No major anchor POIs are detected immediately around this spot, so footfall will depend more on the street's own commercial activity.`;
  return `This spot on ${rec.street} (${rec.tier.toUpperCase()}, score ${rec.score}) was chosen because the ${rec.highway || "road"} carries enough visibility and the ${compLine}. ${anchorPhrase} Combined with ${rec.breakdown?.transit ?? 0} transit stop${rec.breakdown?.transit === 1 ? "" : "s"} within 300 m and ${rec.breakdown?.density ?? 0} active businesses on the street, the location offers a viable opening for a ${label}. Visit in person to confirm visibility and signage opportunities at this exact frontage.`;
}

// "Competitor Success Stories" — explains why competitors of this category in THIS area
// are likely successful. Returns short prose + an optional longer "more details" body
// for the modal. Falls back to a deterministic template when no LLM is available.
export async function generateCompetitorInsights(category, ranked, cityHint, extras = {}) {
  const label = CATEGORY_LABELS[category] || category;
  const where = cityHint || "this area";
  const competitorNames = (extras.competitorSampleNames || []).slice(0, 8);
  const totalCompetitors = extras.totalCompetitors ?? 0;
  const top3 = (ranked || []).slice(0, 3);

  if (totalCompetitors === 0) {
    return {
      source: "template",
      summary: `No existing ${label} businesses are visible in this radius — meaning you'd be a first mover. That's an opportunity (no direct competition) but also a warning (demand may be untested in this micro-area).`,
      details: `With zero direct competitors detected within the search radius, the demand signal is uncertain. Either the area is genuinely under-served — which is the opportunity — or the category simply doesn't work here. Verify by walking the area at peak hours and checking whether residents/workers travel further to find a ${label}.`,
    };
  }

  const top3Lines = top3
    .map(
      (s) =>
        `- ${s.street}: ${s.breakdown.competitors} on-street competitor${s.breakdown.competitors === 1 ? "" : "s"}, ${s.breakdown.anchors} anchor${s.breakdown.anchors === 1 ? "" : "s"}, ${s.breakdown.transit} transit, ${s.breakdown.residential} residential nearby`,
    )
    .join("\n");

  const prompt = `You are a local business consultant. There are ${totalCompetitors} existing ${label} business${totalCompetitors === 1 ? "" : "es"} in the searched area of ${where}.

Sample competitor names: ${competitorNames.join(", ") || "(unnamed)"}
Top 3 streets in this area:
${top3Lines}

Write TWO outputs separated by a "===" line.

OUTPUT 1 (short summary): 2 short sentences explaining why competitors of this category are succeeding in this area. Reference local culture, foot traffic, demographic alignment, or category fit.

OUTPUT 2 (detailed analysis for a modal): 5–7 sentences expanding on the same point. Cover:
- Local culture or habits that favour ${label} here
- Anchor / foot-traffic alignment
- Demographic and catchment alignment
- Why this micro-area suits ${label} specifically
- What a new entrant should learn from these existing players

Be concrete. No bullets. Plain paragraphs.`;

  const text = (await tryOpenRouter(prompt)) || (await tryOllama(prompt)) || null;
  if (text) {
    const [summary, details] = text.split(/^===+$/m).map((s) => s.trim());
    if (summary && details) {
      return {
        source: process.env.OPENROUTER_API_KEY ? "openrouter" : "ollama",
        summary,
        details,
      };
    }
    if (summary) {
      return {
        source: process.env.OPENROUTER_API_KEY ? "openrouter" : "ollama",
        summary,
        details: summary,
      };
    }
  }
  return {
    source: "template",
    summary: `${totalCompetitors} ${label} business${totalCompetitors === 1 ? "" : "es"} are already operating in this radius. Their presence — clustered around the area's anchor POIs and transit lines — suggests genuine, repeating demand from the local catchment.`,
    details: `The ${totalCompetitors} ${label} business${totalCompetitors === 1 ? "" : "es"} mapped in this radius cluster on streets with the strongest footfall drivers: anchors (malls, schools, hospitals, hotels, mosques, parks) and transit access. Their persistence on these streets implies a stable customer base and a category that fits local habits in ${where}. Most operators chose visibility over rent — frontages on busier roads consistently outperform side-street locations. A new entrant should learn from where they cluster and where they avoid; gaps usually reflect either weak demand or saturated rent. Replicate their adjacency to anchors but differentiate on positioning, hours, or a niche the existing players underserve.`,
  };
}

export function aiProviderStatus() {
  if (process.env.OPENROUTER_API_KEY) return { provider: "openrouter", model: OPENROUTER_MODEL_CHAIN.join(" → ") };
  if (process.env.DISABLE_OLLAMA !== "1") return { provider: "ollama-or-template", model: OLLAMA_MODEL };
  return { provider: "template", model: null };
}

export function buildFinalRecommendation(category, ranked) {
  const label = CATEGORY_LABELS[category] || category;
  const top = ranked[0];
  if (!top) return `No streets were found near you for opening a ${label}. Try widening the radius.`;
  if (top.tier === "gold") {
    return `Top pick for a ${label}: ${top.street} (Gold, score ${Math.round(top.score)}). Strong commercial activity with manageable competition.`;
  }
  if (top.tier === "silver") {
    return `Best available option for a ${label}: ${top.street} (Silver, score ${Math.round(top.score)}). No Gold streets in this radius — consider widening the search.`;
  }
  return `No strong opportunities for a ${label} in this radius. Best of what's available: ${top.street} (Bronze, score ${Math.round(top.score)}). Try a different area or category.`;
}
