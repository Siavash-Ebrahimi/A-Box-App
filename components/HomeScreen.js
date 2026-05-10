"use client";

// Landing screen the user sees when they open the app.
//   - Prominent A-Box title + tagline
//   - "AI listening" orb (purely decorative — signals an AI agent is ready)
//   - Three top-level entry buttons: Property, Business, Agent Hub
//
// Only Business is wired up for now. Property and Agent Hub are placeholders that
// show a small "Coming soon" affordance so the user understands the app's scope.

export default function HomeScreen({ onChooseBusiness }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 overflow-hidden relative">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
            <span className="text-amber-400">A</span>
            <span className="text-slate-100">-Box</span>
          </h1>
          <p className="text-slate-400 mt-3 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Your AI agent for smarter location decisions. A-Box analyzes real-world data
            to help you make confident calls on property, business, and real-estate workflows.
          </p>
        </div>

        {/* AI listening orb — purely decorative */}
        <div className="flex flex-col items-center mb-10">
          <AiOrb />
          <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>A-Box is ready</span>
          </div>
        </div>

        {/* 3 main option buttons */}
        <div className="grid sm:grid-cols-3 gap-4">
          <OptionButton
            disabled
            icon={<HouseIcon />}
            title="Property"
            subtitle="Buy · Sell · Rent · Airbnb"
            note="Coming soon"
          />
          <OptionButton
            primary
            icon={<BusinessIcon />}
            title="Business"
            subtitle="Find the best street to open"
            onClick={onChooseBusiness}
          />
          <OptionButton
            disabled
            icon={<AgentIcon />}
            title="Agent Hub"
            subtitle="Tools for real-estate agents"
            note="Coming soon"
          />
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-8 leading-relaxed">
          A-Box uses AI and OpenStreetMap data — no fake listings, no hidden fees.
        </p>
      </div>
    </div>
  );
}

function OptionButton({ disabled, primary, icon, title, subtitle, note, onClick }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        "p-5 rounded-xl text-left border transition-all relative overflow-hidden",
        disabled
          ? "border-slate-800 bg-slate-900/40 cursor-not-allowed"
          : primary
            ? "border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400 hover:scale-[1.02] shadow-lg shadow-amber-500/10"
            : "border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900",
      ].join(" ")}
    >
      <div
        className={[
          "mb-3 w-10 h-10 rounded-lg flex items-center justify-center",
          disabled ? "bg-slate-800 text-slate-500" : primary ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-200",
        ].join(" ")}
      >
        {icon}
      </div>
      <div
        className={[
          "font-semibold text-base",
          disabled ? "text-slate-400" : primary ? "text-amber-200" : "text-slate-100",
        ].join(" ")}
      >
        {title}
      </div>
      <div
        className={[
          "text-xs mt-1",
          disabled ? "text-slate-600" : primary ? "text-amber-300/70" : "text-slate-400",
        ].join(" ")}
      >
        {subtitle}
      </div>
      {note ? (
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-2 italic">{note}</div>
      ) : primary ? (
        <div className="text-[10px] uppercase tracking-wider text-amber-300 mt-2 font-semibold">
          Start →
        </div>
      ) : null}
    </button>
  );
}

// Pulsing AI orb — concentric rings + soft inner glow. Pure CSS, no JS animation loop.
function AiOrb() {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <span
        className="absolute inset-0 rounded-full border border-amber-500/30 ai-orb-pulse"
        style={{ animationDelay: "0s" }}
      />
      <span
        className="absolute inset-3 rounded-full border border-cyan-500/30 ai-orb-pulse"
        style={{ animationDelay: "0.6s" }}
      />
      <span
        className="absolute inset-6 rounded-full border border-purple-500/30 ai-orb-pulse"
        style={{ animationDelay: "1.2s" }}
      />
      <span className="relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 via-cyan-400 to-purple-500 shadow-2xl shadow-cyan-500/30 ai-orb-shimmer">
        <span className="absolute inset-2 rounded-full bg-slate-950/40" />
        <span className="absolute inset-5 rounded-full bg-gradient-to-br from-amber-300 to-cyan-300 opacity-90 ai-orb-breathe" />
      </span>
    </div>
  );
}

/* ---- inline SVG icons ---- */

function HouseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function BusinessIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <circle cx="17" cy="9" r="2" />
      <path d="M21 19v-1a3 3 0 0 0-3-3" />
    </svg>
  );
}
