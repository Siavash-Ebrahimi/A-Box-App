// POST /api/translate
// Body: { text: string, targetLang: "ar" | "fa" | "en" }
// Returns: { translated: string, source: string }
//
// Lightweight wrapper around OpenRouter's free model chain used to translate
// any A-Box report / analysis text. The endpoint preserves Markdown markers
// and number formatting; it just swaps the natural-language content. When
// the LLM is unreachable it returns the original text with a tag prefix so
// the UI stays usable offline.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_CHAIN = process.env.OPENROUTER_MODEL
  ? [process.env.OPENROUTER_MODEL]
  : [
      "openai/gpt-oss-120b:free",
      "openai/gpt-oss-20b:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "minimax/minimax-m2.5:free",
    ];

const LANG_LABEL = {
  ar: "Arabic (Modern Standard Arabic)",
  fa: "Persian / Farsi",
  en: "English",
};

async function callOpenRouter(messages, { maxTokens = 1200 } = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  for (const model of MODEL_CHAIN) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,         // translation should be deterministic
          max_tokens: maxTokens,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) continue;
      if (!res.ok) continue;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return { text, model };
    } catch {
      /* try next model */
    }
  }
  return null;
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Bad JSON body" }, { status: 400 });
  }
  const { text, targetLang } = body || {};
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing `text`" }, { status: 400 });
  }
  const lang = (targetLang || "en").toLowerCase();
  if (!LANG_LABEL[lang]) {
    return NextResponse.json({ error: `Unknown targetLang: ${targetLang}` }, { status: 400 });
  }
  // If asked for English and the input is already plain English, just bounce
  // it back so we don't burn quota on a no-op.
  if (lang === "en") {
    return NextResponse.json({ translated: text, source: "passthrough" });
  }

  const system = [
    "You are a professional real-estate translator for the A-Box app.",
    `Translate the user's text into ${LANG_LABEL[lang]}.`,
    "Preserve Markdown structure (headings, bullets, bold, tables) and any numbers / prices / unit labels exactly.",
    "Return ONLY the translated text — no preface, no explanation, no quotes.",
  ].join(" ");

  const llm = await callOpenRouter(
    [
      { role: "system", content: system },
      { role: "user",   content: text.slice(0, 8000) },
    ],
    { maxTokens: 1500 },
  );
  if (!llm) {
    // Graceful offline fallback so the UI doesn't error.
    return NextResponse.json({
      translated: `[${lang.toUpperCase()} — offline] ${text}`,
      source: "offline-fallback",
    });
  }
  return NextResponse.json({ translated: llm.text, source: llm.model });
}
