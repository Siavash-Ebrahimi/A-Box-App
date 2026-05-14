"use client";

import { useState } from "react";

// Shown the first time the user enters Agent Hub (and again after a custom agent is
// deleted). Two choices:
//   1) Continue with Demo Agent  — no input required
//   2) Create a new local agent  — single name field, saved per-browser
//
// All data is local-only. Only ONE agent profile is stored at a time — there is no
// roster / team / sharing in this MVP.

export default function AgentBootstrap({ onDemo, onCustom }) {
  const [mode, setMode] = useState("intro"); // "intro" | "new"
  const [name, setName] = useState("");

  if (mode === "intro") {
    return (
      <Shell>
        <Header />
        <div className="text-sm text-slate-300 mb-5 leading-relaxed">
          How do you want to use the Agent Hub right now?
        </div>

        <Choice
          accent="cyan"
          title="Continue with Demo Agent"
          subtitle="Skip setup and explore the workspace using our pre-filled demo profile."
          cta="Continue as Demo"
          onClick={onDemo}
        />

        <Choice
          accent="amber"
          title="Create a new local agent"
          subtitle="Use your own name. Saved only in this browser — nothing leaves your device."
          cta="Set up new agent →"
          onClick={() => setMode("new")}
        />

        <Note />
      </Shell>
    );
  }

  // mode === "new"
  function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onCustom(name);
  }

  return (
    <Shell>
      <Header />
      <button
        type="button"
        onClick={() => setMode("intro")}
        className="text-[11px] text-slate-500 hover:text-slate-300 transition mb-3"
      >
        ← Back
      </button>

      <form onSubmit={handleSave}>
        <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
          Agent name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="e.g. Mariam Hosseini"
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
        />

        <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">
          Saved locally in this browser only. There's no signup, password, or server. You
          can delete this agent at any time from the sidebar.
        </div>

        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full mt-5 px-4 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save & enter Agent Hub
        </button>
      </form>

      <Note />
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-5">
      <a
        href="/"
        className="text-[11px] text-slate-500 hover:text-slate-300 transition inline-block mb-2"
      >
        ← Back to A-Box home
      </a>
      <h1 className="text-xl font-semibold tracking-tight">
        <span className="text-amber-400">A</span>-Box
        <span className="text-slate-500 mx-1">·</span>
        <span className="text-slate-100">Agent Hub</span>
      </h1>
    </div>
  );
}

function Choice({ title, subtitle, cta, accent, onClick }) {
  const a = accent === "cyan"
    ? "border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200"
    : "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200";
  const ctaColor = accent === "cyan" ? "text-cyan-300" : "text-amber-300";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full mb-3 p-4 rounded-lg border transition text-left ${a}`}
    >
      <div className="font-semibold text-[15px]">{title}</div>
      <div className="text-xs text-slate-300 mt-1 leading-relaxed">{subtitle}</div>
      <div className={`text-[11px] uppercase tracking-wider font-semibold mt-2 ${ctaColor}`}>
        {cta} →
      </div>
    </button>
  );
}

function Note() {
  return (
    <div className="mt-5 pt-4 border-t border-slate-800">
      <div className="text-[10.5px] text-slate-500 leading-relaxed">
        <strong className="text-slate-400">Demo workspace only.</strong> Agent Hub is a
        local prototype — only one agent is saved per browser at a time, profiles aren't
        shared between users, and there's no real CRM or payment behind any feature yet.
      </div>
    </div>
  );
}
