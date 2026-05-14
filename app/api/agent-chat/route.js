// POST /api/agent-chat
// Body: { personaKey, messages: [{ role, content }, ...], sharedProperty? }
// Returns: { text, model, source }
//
// Uses OpenRouter's free-tier model chain. The persona's system prompt is prepended
// server-side so the persona definition is never exposed to the frontend.

import { NextResponse } from "next/server";
import { PERSONAS, buildSystemPrompt } from "@/lib/agent/personas";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_CHAIN = process.env.OPENROUTER_MODEL
  ? [process.env.OPENROUTER_MODEL]
  : [
      "meta-llama/llama-3.3-70b-instruct:free",
      "openai/gpt-oss-20b:free",
      "openai/gpt-oss-120b:free",
      "minimax/minimax-m2.5:free",
    ];

async function callOpenRouter(messages) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  for (const model of MODEL_CHAIN) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 350,
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

// Deterministic fallback when no LLM is available (no key, all models down).
// Produces a short in-character line so the demo never feels broken.
function templateReply(persona, lastUserMessage) {
  const fragments = [
    `That sounds interesting — tell me more about ${persona.preferences[0]}.`,
    "Can you share a few options that match what I described?",
    "Got it. What would my next step be?",
    "Hmm, that's not quite what I'm looking for. Anything closer to my brief?",
  ];
  const pick = fragments[(lastUserMessage?.length || 0) % fragments.length];
  return { text: pick, model: "template" };
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { personaKey, messages = [], sharedProperty = null } = body || {};
  const persona = PERSONAS[personaKey];
  if (!persona) {
    return NextResponse.json(
      { error: `Unknown personaKey. Supported: ${Object.keys(PERSONAS).join(", ")}` },
      { status: 400 },
    );
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages[] is required (at least one user turn)" },
      { status: 400 },
    );
  }

  const systemPrompt = buildSystemPrompt(persona, { sharedProperty });
  // Keep the conversation context bounded — last 16 turns is plenty for an MVP demo.
  const history = messages.slice(-16).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, 4000),
  }));
  const apiMessages = [{ role: "system", content: systemPrompt }, ...history];

  const out = await callOpenRouter(apiMessages);
  if (out) {
    return NextResponse.json({
      text: out.text,
      model: out.model,
      source: "openrouter",
    });
  }
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const fallback = templateReply(persona, lastUser?.content || "");
  return NextResponse.json({
    text: fallback.text,
    model: fallback.model,
    source: "template",
  });
}
