"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PERSONA_LIST, PERSONAS } from "@/lib/agent/personas";
import { formatPrice } from "@/lib/agent/mockProperties";

export default function ChatView({
  selectedPersonaKey,
  onSelectPersona,
  chats,           // { [personaKey]: messages[] }
  onAppendMessage,
  onClearChat,
  pendingShare,    // property to share inline (one-shot)
  onClearPendingShare,
}) {
  const persona = PERSONAS[selectedPersonaKey] || PERSONA_LIST[0];
  const messages = chats[persona.key] || [];
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollerRef = useRef(null);

  // Auto-scroll to the bottom whenever messages change.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, sending]);

  // Personas are *clients reaching out to the agent*. Whenever the agent opens a
  // fresh chat (no messages yet) with a persona, automatically post the persona's
  // opener as an assistant bubble — that's the customer's incoming enquiry. The
  // agent then replies. We skip the auto-opener if the agent arrived via
  // "Send to AI" from a property card (that share is itself the opening turn).
  const currentLength = (chats[persona.key] || []).length;
  useEffect(() => {
    if (!persona || pendingShare) return;
    if (currentLength === 0 && persona.opener) {
      onAppendMessage(persona.key, {
        role: "assistant",
        content: persona.opener,
        ts: Date.now(),
        source: "opener",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona?.key, currentLength, pendingShare]);

  // Auto-send a "shared property" message from PropertiesView when the agent
  // clicked "Send to AI" on a card.
  useEffect(() => {
    if (!pendingShare) return;
    const opening =
      `I have a property that might fit. Take a look:\n\n` +
      `**${pendingShare.title}** — ${pendingShare.building}, ${pendingShare.area}\n` +
      `${formatPrice(pendingShare)} · ${pendingShare.beds || "Studio"} BR · ${pendingShare.baths} bath · ${pendingShare.area_sqft.toLocaleString()} ft²\n` +
      (pendingShare.features?.length ? `Features: ${pendingShare.features.join(", ")}` : "");
    sendMessage(opening, pendingShare);
    onClearPendingShare?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingShare]);

  async function sendMessage(text, sharedProperty = null) {
    if (!text.trim() && !sharedProperty) return;
    setError(null);
    const userMsg = {
      role: "user",
      content: text,
      ts: Date.now(),
      sharedProperty,
    };
    const nextHistory = [...messages, userMsg];
    onAppendMessage(persona.key, userMsg);
    setDraft("");
    setSending(true);
    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaKey: persona.key,
          messages: nextHistory.map((m) => ({ role: m.role, content: m.content })),
          sharedProperty,
        }),
      });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { /* ignore */ }
      if (!res.ok) throw new Error(data?.error || `Chat failed (HTTP ${res.status})`);
      onAppendMessage(persona.key, {
        role: "assistant",
        content: data.text,
        ts: Date.now(),
        source: data.source,
        model: data.model,
      });
    } catch (e) {
      setError(e.message || "Couldn't reach the AI customer right now.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    sendMessage(draft);
  }

  return (
    <div className="flex h-full">
      {/* Persona list */}
      <div className="w-[260px] shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            AI Customers
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Pick a persona and start practicing.
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-1">
          {PERSONA_LIST.map((p) => {
            const count = chats[p.key]?.length || 0;
            const active = p.key === persona.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onSelectPersona(p.key)}
                className={`w-full text-left p-2.5 rounded border transition flex gap-2.5 ${
                  active
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
                }`}
              >
                <span
                  className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-slate-900 font-bold text-sm"
                  style={{ background: p.color }}
                >
                  {p.avatar}
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-slate-100 truncate">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{p.label}</div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.summary}</div>
                  {count > 0 ? (
                    <div className="text-[9px] text-cyan-300 mt-0.5">{count} messages</div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat thread */}
      <div className="flex-1 flex flex-col bg-slate-950">
        <header className="px-5 py-3 border-b border-slate-800 flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-900 font-bold"
            style={{ background: persona.color }}
          >
            {persona.avatar}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-100">{persona.name}</div>
            <div className="text-[11px] text-slate-400 truncate">{persona.role}</div>
          </div>
          <button
            type="button"
            onClick={() => onClearChat(persona.key)}
            className="text-[11px] px-2.5 py-1 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 transition"
            title="Clear conversation"
          >
            Reset chat
          </button>
        </header>

        <div ref={scrollerRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
          {messages.length === 0 ? (
            <EmptyChatHint persona={persona} />
          ) : (
            <>
              <IncomingNotice persona={persona} />
              {messages.map((m, i) => (
                <Message key={i} persona={persona} message={m} />
              ))}
            </>
          )}
          {sending ? <TypingDots persona={persona} /> : null}
          {error ? (
            <div className="text-[11px] text-red-300 bg-red-900/30 border border-red-700/50 rounded p-2.5 max-w-[80%]">
              {error}
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-3 border-t border-slate-800 bg-slate-950">
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Reply as agent to ${persona.name}…`}
              disabled={sending}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 leading-snug">
            Tip: from the Properties tab, hit <span className="text-cyan-300">Send to AI</span> on
            any card to share it inline — the persona will react in character.
          </div>
        </form>
      </div>
    </div>
  );
}

function Message({ persona, message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <span
          className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-slate-900 font-bold text-xs"
          style={{ background: persona.color }}
        >
          {persona.avatar}
        </span>
      ) : null}
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-3.5 py-2 text-[12.5px] leading-relaxed whitespace-pre-line ${
            isUser
              ? "bg-amber-500 text-slate-900 rounded-br-sm"
              : "bg-slate-800 text-slate-100 rounded-bl-sm"
          }`}
        >
          {renderInlineBold(message.content)}
        </div>
        {message.source && message.source !== "openrouter" && !isUser ? (
          <div className="text-[9px] text-slate-500 mt-0.5">via {message.source}</div>
        ) : null}
      </div>
      {isUser ? (
        <span className="w-7 h-7 rounded-full shrink-0 bg-slate-700 text-slate-100 flex items-center justify-center text-xs font-bold">
          A
        </span>
      ) : null}
    </div>
  );
}

function TypingDots({ persona }) {
  return (
    <div className="flex gap-2 justify-start">
      <span
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-slate-900 font-bold text-xs"
        style={{ background: persona.color }}
      >
        {persona.avatar}
      </span>
      <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0s" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0.15s" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}

// Brief "incoming message" notice shown above the first persona bubble — frames
// the chat as a customer who has reached out to the agent (not the other way round).
function IncomingNotice({ persona }) {
  return (
    <div className="text-center pb-2">
      <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-300 font-semibold px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/5">
        New enquiry from {persona.name}
      </span>
    </div>
  );
}

// Fallback (rare) — shown briefly while the opener is being auto-appended.
function EmptyChatHint({ persona }) {
  return (
    <div className="text-center max-w-md mx-auto py-12">
      <span
        className="inline-flex w-14 h-14 rounded-full items-center justify-center text-slate-900 font-bold text-xl mb-3"
        style={{ background: persona.color }}
      >
        {persona.avatar}
      </span>
      <div className="text-sm text-slate-200 font-semibold">{persona.name}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{persona.role}</div>
      <div className="text-[11px] text-slate-500 mt-4">
        {persona.name} is reaching out…
      </div>
    </div>
  );
}

function renderInlineBold(text) {
  if (!text) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
