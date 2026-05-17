"use client";

// Floating AI orchestrator panel for the i-Case workspace.
//
// Two modes the user can toggle between:
//   - Chat   → text in, text out
//   - Voice  → microphone in (Web Speech API recognition), speaker out
//              (SpeechSynthesis API). Both are browser-native — no extra deps,
//              no extra API keys. Falls back gracefully when a browser doesn't
//              support them (Safari can be patchy).
//
// Each user turn POSTs to /api/icase-agent with the current workspace context
// (zones, added zones, saved items, current nodes). The endpoint returns
// { reply, actions[] }. We render the reply in chat, optionally speak it,
// and call the parent's onExecuteActions callback to mutate the flow.

import { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from "react";
import { metersBetween } from "@/lib/agent/distance";
import { TOOL_NODE_LIBRARY } from "@/lib/agent/iCaseFlow";

const FlowAgent = forwardRef(function FlowAgent({
  iCase,
  flow,
  zones = [],
  savedProperties = [],
  savedRecsByZone = {},
  onExecuteActions,           // (actions[]) => void — parent applies them to the flow
}, ref) {
  const [open, setOpen] = useState(false);
  // Imperative handle so the workspace header's "AI Agent" button can open
  // the panel from outside this component.
  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    toggle: () => setOpen((v) => !v),
    isOpen: () => open,
  }), [open]);
  const [mode, setMode] = useState("chat");  // "chat" | "voice"
  const [history, setHistory] = useState([]); // [{ role: "user"|"assistant", text }]
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState({ rec: false, tts: false });
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const scrollRef = useRef(null);

  // Feature-detect on mount — only enable the Voice button when both APIs
  // are present in this browser.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const tts = typeof window.speechSynthesis !== "undefined";
    setVoiceSupported({ rec: !!SR, tts });
  }, []);

  // Auto-scroll the transcript when new turns arrive.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history.length, busy]);

  // Build the workspace context the agent endpoint needs. We strip down to
  // just ids + labels + key attributes so the prompt stays small.
  const context = useMemo(() => buildContext({
    iCase, flow, zones, savedProperties, savedRecsByZone,
  }), [iCase, flow, zones, savedProperties, savedRecsByZone]);

  function speak(text) {
    if (mode !== "voice" || !voiceSupported.tts || !text) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {/* ignore */}
  }

  async function sendMessage(text) {
    const t = (text || "").trim();
    if (!t || busy) return;
    setHistory((h) => [...h, { role: "user", text: t }]);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/icase-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: t,
          history: history.map((m) => ({ role: m.role, content: m.text })),
          context,
        }),
      });
      const data = await res.json();
      const reply = data?.reply || "(Empty reply.)";
      const actions = Array.isArray(data?.actions) ? data.actions : [];
      setHistory((h) => [...h, { role: "assistant", text: reply }]);
      speak(reply);
      if (actions.length > 0) onExecuteActions?.(actions);
    } catch (e) {
      const msg = "Network error — I'll wait for your connection and you can retry.";
      setHistory((h) => [...h, { role: "assistant", text: msg }]);
      speak(msg);
    } finally {
      setBusy(false);
    }
  }

  function startListening() {
    if (!voiceSupported.rec || listening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript;
      if (transcript) sendMessage(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }
  function stopListening() {
    try { recRef.current?.stop(); } catch {/* ignore */}
    setListening(false);
  }

  // Floating launcher when collapsed — prominent, pulsing, hard to miss so
  // the agent knows the AI orchestrator is here.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-5 right-5 z-[400] flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold shadow-2xl transition icase-agent-pulse"
        title="Open the AI Flow Agent — it can build the flow for you by chat or voice"
      >
        <span className="text-xl leading-none">🤖</span>
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[13px]">AI Flow Agent</span>
          <span className="text-[10px] font-semibold opacity-80">Chat or speak — I'll build it</span>
        </span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-[400] w-[360px] max-h-[70vh] flex flex-col rounded-xl border border-emerald-500/40 bg-slate-950/95 backdrop-blur shadow-2xl">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2">
        <span className="text-base">🤖</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] font-semibold text-slate-100">AI Flow Agent</div>
          <div className="text-[9.5px] text-slate-500 truncate">
            Tell me what to build — I'll wire the nodes for you.
          </div>
        </div>
        {/* Mode toggle */}
        <div className="flex bg-slate-900 rounded-md border border-slate-700 overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode("chat"); stopListening(); }}
            className={`text-[10px] px-2 py-1 transition ${mode === "chat" ? "bg-emerald-500/25 text-emerald-200" : "text-slate-400 hover:text-slate-100"}`}
            title="Chat (text)"
          >
            💬 Chat
          </button>
          <button
            type="button"
            onClick={() => setMode("voice")}
            disabled={!voiceSupported.rec && !voiceSupported.tts}
            className={`text-[10px] px-2 py-1 transition disabled:opacity-50 disabled:cursor-not-allowed ${mode === "voice" ? "bg-emerald-500/25 text-emerald-200" : "text-slate-400 hover:text-slate-100"}`}
            title={(!voiceSupported.rec && !voiceSupported.tts) ? "Voice not supported in this browser" : "Voice (mic in / speaker out)"}
          >
            🎙 Voice
          </button>
        </div>
        <button
          type="button"
          onClick={() => { stopListening(); setOpen(false); }}
          className="text-slate-400 hover:text-slate-100 text-[14px] px-1.5"
          title="Minimize"
        >
          ✕
        </button>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2 min-h-[160px] max-h-[40vh]">
        {history.length === 0 ? (
          <Examples onPick={(t) => sendMessage(t)} hasZones={(iCase.zoneIds || []).length > 0} />
        ) : (
          history.map((m, i) => (
            <div key={i} className={`text-[11.5px] leading-relaxed ${m.role === "user" ? "text-slate-100" : "text-emerald-200"}`}>
              <span className="text-[9.5px] uppercase tracking-wider opacity-60 mr-1">{m.role === "user" ? "You" : "AI"}:</span>
              {m.text}
            </div>
          ))
        )}
        {busy ? (
          <div className="text-[11px] text-emerald-300/80 italic">AI is composing your flow…</div>
        ) : null}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-800 bg-slate-950 p-2">
        {mode === "chat" ? (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(draft); } }}
              placeholder="Try: compare my two saved Marina apartments…"
              disabled={busy}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-[11.5px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => sendMessage(draft)}
              disabled={busy || !draft.trim()}
              className="text-[11px] px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {voiceSupported.rec ? (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={busy}
                className={`w-full text-[12px] font-semibold px-3 py-2 rounded transition ${
                  listening
                    ? "bg-red-500/25 border border-red-500/50 text-red-200 animate-pulse"
                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {listening ? "🎙 Listening… tap to stop" : "🎙 Hold and speak"}
              </button>
            ) : (
              <div className="text-[11px] text-amber-300 italic">
                Voice recognition isn't available in this browser. Switch to Chat mode.
              </div>
            )}
            {!voiceSupported.tts ? (
              <div className="text-[10px] text-slate-500 italic">
                Speech output isn't available — replies will be text-only.
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

);

export default FlowAgent;

// ---- Helpers ------------------------------------------------------------

function Examples({ onPick, hasZones }) {
  const list = hasZones
    ? [
        "Compare my saved properties in Zone 1",
        "Alert me if any saved property's price changes",
        "Find a 1-bed apartment with sea view, low floor, 2 baths in Zone 1",
        "Run an AI analysis on all saved items in Zone 2",
      ]
    : [
        "What can you do?",
        "Help me set up a comparison flow",
        "Which of my zones should I start with?",
      ];
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] text-slate-400 leading-relaxed">
        Ask me to build a flow. I'll add the nodes and connect them — you can still drag
        anything yourself afterwards.
      </div>
      <div className="grid gap-1.5">
        {list.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onPick(ex)}
            className="text-left text-[10.5px] text-emerald-200 hover:text-emerald-100 border border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10 rounded px-2 py-1.5 transition"
          >
            “{ex}”
          </button>
        ))}
      </div>
    </div>
  );
}

// Slim context payload — only what the LLM needs to reason. Keep ids EXACT
// (no rewriting) so referenced refIds round-trip correctly back to our flow.
function buildContext({ iCase, flow, zones, savedProperties, savedRecsByZone }) {
  return {
    addedZoneIds: iCase?.zoneIds || [],
    zones: zones.map((z) => ({
      id: z.id,
      label: z.label || null,
      addressLabel: z.addressLabel || null,
      radius: z.radius,
    })),
    savedProperties: savedProperties.map((p) => ({
      id: p.id,
      title: p.title,
      type: p.type,
      beds: p.beds || 0,
      baths: p.baths || 0,
      area_sqft: p.area_sqft || 0,
      price: p.price || 0,
      listing: p.listing,
      zoneIds: zones
        .filter((z) => typeof p.lat === "number" && typeof p.lng === "number"
          && metersBetween(p.lat, p.lng, z.lat, z.lng) <= z.radius)
        .map((z) => z.id),
    })),
    savedRecsByZone: Object.fromEntries(
      Object.entries(savedRecsByZone).map(([zid, list]) => [
        zid,
        list.map((r) => ({ id: r.id, street: r.street, tier: r.tier, score: r.score })),
      ]),
    ),
    nodes: flow.nodes.map((n) => ({
      id: n.id, type: n.type, kind: n.kind,
      label: n.data?.label || n.kind,
    })),
    tools: TOOL_NODE_LIBRARY.map((t) => ({
      kind: t.kind, label: t.label, type: t.type, description: t.description,
    })),
  };
}
