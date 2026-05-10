// LLM-driven property agency lookup.
//
// Honest scope: we cannot scrape live shop-for-rent / shop-for-sale listings without
// either a paid API or a TOS-violating scraper. So instead we ask the LLM (which knows
// the major real-estate sites in major cities from its training data) to give us:
//   - The top 3-6 reputable property agencies / portals in the user's city
//   - For each one, a deep search URL that filters to commercial/retail listings in their area
//
// The user clicks → lands on the agency's real, current listings.
// We label everything clearly so the user knows these are AI-generated suggestions, not
// verified live inventory inside our app.

import { CATEGORY_LABELS } from "./overpass.js";

// We re-use the OpenRouter / Ollama / template chain from ai.js, but the response is JSON
// so we keep the call here instead of through the prose helpers.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL_CHAIN = process.env.OPENROUTER_MODEL
  ? [process.env.OPENROUTER_MODEL]
  : [
      "openai/gpt-oss-120b:free",
      "openai/gpt-oss-20b:free",
      "minimax/minimax-m2.5:free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ];

function buildPrompt(category, cityHint, area) {
  const label = CATEGORY_LABELS[category] || category;
  const where = cityHint || "the user's city";
  const areaClause = area ? ` (specifically the ${area} area)` : "";
  return `You are a local real-estate research assistant. The user wants to open a ${label} in ${where}${areaClause} and needs to find a shop space to rent or buy.

List the TOP 4 most reputable property portals or agencies that operate in ${where} and have commercial / retail / shop listings. For each, provide:
  - "name": the brand name
  - "kind": "portal" (aggregator like Property Finder, Zillow, Rightmove) or "agency" (a brokerage)
  - "homepage": the official URL (be accurate — only well-known sites)
  - "searchUrl": a deep link that pre-filters their listings to commercial / retail / shop properties in ${where}, for both rent AND sale where possible. If you are not sure of the exact filter parameters, fall back to the homepage.
  - "listingType": "rent" | "sale" | "both"
  - "note": one sentence (max 18 words) on why a ${label} owner would use this site

Output ONLY a valid JSON array of 4 objects. No markdown, no explanation, no preamble.

Example shape:
[
  {"name":"...","kind":"portal","homepage":"https://...","searchUrl":"https://...","listingType":"both","note":"..."},
  ...
]`;
}

async function callLLM(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  for (const model of OPENROUTER_MODEL_CHAIN) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 700,
          temperature: 0.2,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status === 503) continue;
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch {
      // try next model
    }
  }
  return null;
}

function tryParseJsonArray(text) {
  if (!text) return null;
  // Strip markdown fences if the model wrapped its output.
  let s = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start === -1 || end === -1) return null;
  try {
    const arr = JSON.parse(s.slice(start, end + 1));
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

function isHttpUrl(u) {
  if (!u || typeof u !== "string") return false;
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitize(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const it of arr) {
    if (!it || typeof it !== "object") continue;
    const homepage = isHttpUrl(it.homepage) ? it.homepage : null;
    if (!homepage) continue;
    const host = new URL(homepage).host.replace(/^www\./, "");
    if (seen.has(host)) continue;
    seen.add(host);
    out.push({
      name: String(it.name || host).slice(0, 80),
      kind: it.kind === "agency" ? "agency" : "portal",
      homepage,
      searchUrl: isHttpUrl(it.searchUrl) ? it.searchUrl : homepage,
      listingType: ["rent", "sale", "both"].includes(it.listingType) ? it.listingType : "both",
      note: String(it.note || "").slice(0, 200),
    });
    if (out.length >= 6) break;
  }
  return out;
}

// Detect whether the analysed location sits inside the UAE — used to prepend our
// hand-picked partner agency (Eshel Properties) before whatever the LLM returns.
const UAE_HINTS = /\b(uae|united\s+arab\s+emirates|dubai|abu\s+dhabi|sharjah|ajman|ras\s+al\s+khaimah|fujairah|umm\s+al\s+quwain)\b/i;
function isInUAEBbox(lat, lon) {
  if (typeof lat !== "number" || typeof lon !== "number") return false;
  return lat >= 22.5 && lat <= 26.1 && lon >= 51.0 && lon <= 56.5;
}
function isUAE({ cityHint, lat, lon }) {
  if (cityHint && UAE_HINTS.test(cityHint)) return true;
  if (isInUAEBbox(lat, lon)) return true;
  return false;
}

const ESHEL_ENTRY = {
  name: "Eshel Properties",
  kind: "agency",
  homepage: "https://www.eshelproperties.com/",
  searchUrl: "https://www.eshelproperties.com/",
  listingType: "both",
  note: "UAE-based agency offering commercial and residential listings — A-Box partner.",
};

function withUAEPartners(agencies, ctx) {
  if (!isUAE(ctx)) return agencies;
  // Don't duplicate if the LLM already returned Eshel.
  if (agencies.some((a) => /eshel/i.test(a.homepage || "") || /eshel/i.test(a.name || ""))) {
    return agencies;
  }
  return [ESHEL_ENTRY, ...agencies];
}

export async function findPropertyAgencies(category, cityHint, area, coords = {}) {
  const ctx = { cityHint, lat: coords.lat, lon: coords.lon };
  // For UAE locations we always have at least Eshel even without an LLM key.
  if (!cityHint && !isInUAEBbox(coords.lat, coords.lon)) {
    return { source: "skipped", agencies: [] };
  }
  const prompt = buildPrompt(category, cityHint || "the UAE", area);
  const text = await callLLM(prompt);
  const parsed = tryParseJsonArray(text);
  const agencies = withUAEPartners(sanitize(parsed), ctx);
  if (agencies.length > 0) {
    return { source: agencies === parsed ? "openrouter" : "openrouter+partner", agencies };
  }
  // Even without LLM output, surface Eshel for UAE users.
  if (isUAE(ctx)) {
    return { source: "partner", agencies: [ESHEL_ENTRY] };
  }
  return { source: "template", agencies: [] };
}
