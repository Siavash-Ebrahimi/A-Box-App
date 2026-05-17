// POST /api/icase-agent
// Body: {
//   message: string,             // the user's latest turn
//   history?: [{ role, content }],
//   context: {
//     zones: [{ id, label, addressLabel, radius }],
//     addedZoneIds: [zoneId, ...],
//     savedProperties: [{ id, title, type, beds, baths, area_sqft, price, listing, zoneIds: [...] }],
//     savedRecsByZone: { [zoneId]: [{ id, street, tier, score }] },
//     nodes: [{ id, type, kind, label }],
//     tools: [{ kind, label, type, description }],
//   },
// }
// Returns: { reply: string, actions: [...] }
//
// This is the AI ORCHESTRATOR used by the i-Case workspace's chat / voice
// agent. The LLM receives the live workspace state + a strict JSON schema
// and replies with a friendly message plus a list of actions to mutate the
// flow (add a zone, drop a source node, drop a tool, connect, run compare).
//
// Free-tier model chain identical to /api/agent-chat. Falls back to a small
// rule-based reply when the LLM is unreachable — so the agent never goes
// silent during a network blip.

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

const SYSTEM_PROMPT = `
You are the A-Box i-Case Agent, an automation orchestrator for real-estate agents in Dubai.
The user is talking to you to BUILD an automation flow on a canvas — instead of dragging
tools themselves, you place nodes and connect them based on what they say.

You MUST reply with VALID JSON ONLY, no prose around it, matching this exact schema:
{
  "reply": "<a short friendly conversational reply (1-3 sentences) that will be shown and read aloud to the user>",
  "actions": [
    { "type": "add_zone", "zoneId": "<zoneId from context>" },
    { "type": "add_zone_source", "zoneId": "<zoneId>" },
    { "type": "add_source", "sourceKind": "property"|"recommendation", "zoneId": "<zoneId>", "refId": "<id>" },
    { "type": "add_tool", "toolKind": "<one of the tool kinds from context>" },
    { "type": "connect", "fromIdx": <int>, "toIdx": <int> },
    { "type": "run_compare", "nodeIdx": <int> }
  ]
}

CONNECT INDEXES: \`fromIdx\` and \`toIdx\` are zero-based positions into the new nodes
created EARLIER in this same actions array. The first node added is index 0, the next is 1,
and so on. To connect a source to a tool, list the source first, then the tool, then connect.

WORKFLOW RULES:
- If the user hasn't added any zones yet and they refer to "a zone", first ask which zone.
  List zone options briefly. Don't add any actions yet.
- If they want to compare items: drop the AI Compare tool (kind: ai_compare), drop the
  sources, then connect each source to the compare tool. Optionally end with run_compare.
- If they describe filtering ("1-bed apartment with sea view"): use the AI Analysis tool
  (kind: ai_analysis) with the criteria in its prompt, connected from a whole-zone source.
- If they want notifications, use action_notify_me or action_notify_customer.
- If they want a schedule, use trigger_schedule.
- Keep flows MINIMAL — 2 to 5 nodes max per turn. Build incrementally.

If the user is just asking a question (not asking you to build something), return an empty
actions array and just answer in the reply.

The user's workspace context is provided in the next message as JSON. Use the exact ids
you see there.
`.trim();

async function callOpenRouter(messages) {
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
          temperature: 0.4,    // we want structured JSON, not creative prose
          max_tokens: 600,
          response_format: { type: "json_object" },
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

// Loose JSON extractor — some models wrap the JSON in code fences or add
// chatter. We pull out the first {...} block we can find.
function safeExtractJSON(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  // Try fenced ```json blocks
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  // Greedy first {...} block
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  return null;
}

// Deterministic fallback so the agent always says SOMETHING useful even if
// the LLM is unreachable. Tiny intent triage: greeting / compare / notify /
// generic prompt to add a zone first.
function fallbackReply(message, context) {
  const m = (message || "").toLowerCase();
  const zonesAdded = (context?.addedZoneIds || []).length;
  if (zonesAdded === 0) {
    const zoneList = (context?.zones || [])
      .slice(0, 5)
      .map((z, i) => `${i + 1}. ${z.label || z.id}`)
      .join("\n");
    return {
      reply: `Let's pick a zone to work in. You have these saved:\n${zoneList || "(none — add one in Working Areas first)"}\nWhich one?`,
      actions: [],
    };
  }
  if (m.includes("compare")) {
    return {
      reply: "I'll set up an AI Compare tool. Drag any saved properties or recommendations onto its left port (or tell me which ones).",
      actions: [{ type: "add_tool", toolKind: "ai_compare" }],
    };
  }
  if (m.includes("notify") || m.includes("alert")) {
    return {
      reply: "Adding a 'Notify me' action. Wire a source or a trigger into it.",
      actions: [{ type: "add_tool", toolKind: "action_notify_me" }],
    };
  }
  if (m.includes("bedroom") || m.includes("bed") || m.includes("apartment") || m.includes("villa") || m.includes("studio")) {
    return {
      reply: "I'll add an AI Analysis tool tuned to your criteria — wire a whole-zone source into it and run it.",
      actions: [{ type: "add_tool", toolKind: "ai_analysis" }],
    };
  }
  return {
    reply: "Tell me what you'd like to do — for example: \"compare two saved properties\", \"alert me when prices change\", or \"find a 1-bed apartment with sea view in Zone 1\".",
    actions: [],
  };
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Bad JSON body" }, { status: 400 });
  }
  const { message, history = [], context = {} } = body || {};
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Missing `message`" }, { status: 400 });
  }

  // Build the OpenRouter messages: system + history + context-as-system + user.
  const llmMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: `Workspace context (JSON):\n${JSON.stringify(context).slice(0, 12000)}` },
    ...history.filter((h) => h?.role && h?.content).slice(-8),
    { role: "user", content: message },
  ];

  const llm = await callOpenRouter(llmMessages);
  if (!llm) {
    const fb = fallbackReply(message, context);
    return NextResponse.json({ ...fb, source: "fallback" });
  }
  const parsed = safeExtractJSON(llm.text);
  if (!parsed || typeof parsed.reply !== "string") {
    // Try one fallback if parse failed
    const fb = fallbackReply(message, context);
    return NextResponse.json({ ...fb, source: `parse-fallback (${llm.model})` });
  }
  // Clamp actions to a sane shape.
  const actions = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 12) : [];
  return NextResponse.json({
    reply: parsed.reply,
    actions,
    source: llm.model,
  });
}
