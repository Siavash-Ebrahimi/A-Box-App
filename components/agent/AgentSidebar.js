"use client";

import { PERSONA_LIST } from "@/lib/agent/personas";
import { AI_AGENT_LIST } from "@/lib/agent/aiAgents";

// Left navigation rail for the Agent Hub.
// The bottom half (AI Customers + chat stat) lives here so the dashboard area can
// focus on the working zones + map cards.

export default function AgentSidebar({
  active,
  onSelect,
  profile,
  counts = {},
  chats = {},
  onSelectPersona,
  onDeleteAgent,
}) {
  const totalChatMessages = Object.values(chats).reduce(
    (n, arr) => n + (arr?.length || 0),
    0,
  );

  return (
    <aside className="w-[240px] shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
      <header className="px-4 py-4 border-b border-slate-800">
        <a
          href="/"
          className="text-sm font-semibold tracking-tight hover:opacity-80 transition flex items-center gap-1"
          title="Back to A-Box home"
        >
          <span className="text-amber-400">A</span>
          <span className="text-slate-100">-Box</span>
          <span className="text-slate-500 mx-1">·</span>
          <span className="text-slate-300">Agent Hub</span>
        </a>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-cyan-400 flex items-center justify-center text-slate-900 font-bold text-sm">
            {(profile?.name || "A").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-100 truncate">{profile?.name}</div>
            <div className="text-[10px] text-slate-500 truncate">{profile?.company}</div>
          </div>
        </div>
        {profile?.kind === "custom" ? (
          <button
            type="button"
            onClick={onDeleteAgent}
            className="mt-2 w-full text-[10px] uppercase tracking-wider text-slate-500 hover:text-red-400 transition py-1 border border-slate-800 hover:border-red-900/50 rounded"
            title="Delete this local agent profile"
          >
            ✕ Delete agent
          </button>
        ) : (
          <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-500 text-center py-1 border border-slate-800 rounded">
            Demo profile
          </div>
        )}
      </header>

      <nav className="px-2 py-3 space-y-1 border-b border-slate-800">
        <NavItem
          icon={<DashIcon />}
          label="Dashboard"
          active={active === "dashboard"}
          onClick={() => onSelect("dashboard")}
        />
        <NavItem
          icon={<MapIcon />}
          label="Working Areas"
          badge={counts.zones}
          active={active === "areas"}
          onClick={() => onSelect("areas")}
        />
        <NavItem
          icon={<HomeIcon />}
          label="Properties"
          badge={counts.properties}
          active={active === "properties"}
          onClick={() => onSelect("properties")}
        />
        {/* "AI Customers" nav item removed — agents enter a chat by clicking a
            specific persona in the roster section directly below. */}
      </nav>

      {/* AI Customers roster (moved here from the dashboard) */}
      <div className="px-3 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            AI Customers
          </div>
          <div className="text-[10px] text-cyan-300 tabular-nums">{totalChatMessages} msg</div>
        </div>
        <div className="space-y-1">
          {PERSONA_LIST.map((p) => {
            const count = chats[p.key]?.length || 0;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onSelectPersona?.(p.key)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-800 transition flex items-center gap-2"
                title={`${p.name} — ${p.label}`}
              >
                <span
                  className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-slate-900 font-bold text-[10px]"
                  style={{ background: p.color }}
                >
                  {p.avatar}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-slate-200 truncate">{p.name}</div>
                  <div className="text-[9.5px] text-slate-500 truncate">{p.label}</div>
                </div>
                {count > 0 ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold tabular-nums">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Agents — your team-mate roster you can assign to zones and i-Cases. */}
      <div className="px-3 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            AI Agents
          </div>
          <div className="text-[10px] text-amber-300 tabular-nums">{AI_AGENT_LIST.length}</div>
        </div>
        <div className="space-y-1">
          {AI_AGENT_LIST.map((a) => (
            <div
              key={a.key}
              className="px-2 py-1.5 rounded hover:bg-slate-800 transition flex items-center gap-2 cursor-default"
              title={`${a.name} — ${a.role}\n${a.specialty}`}
            >
              <span
                className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-slate-900 font-bold text-[10px]"
                style={{ background: a.color }}
              >
                {a.avatar}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-slate-200 truncate">{a.name}</div>
                <div className="text-[9.5px] text-slate-500 truncate">{a.role}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-[9.5px] text-slate-500 mt-2 leading-relaxed">
          Assign agents to working zones and i-Cases from the dashboard.
        </div>
      </div>

      <div className="flex-1" />

      <footer className="px-4 py-3 border-t border-slate-800 text-[10px] text-slate-500">
        Mock data · persisted in your browser
      </footer>
    </aside>
  );
}

function NavItem({ icon, label, badge, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full px-3 py-2 rounded text-left text-[13px] font-medium flex items-center gap-2.5 transition",
        active
          ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
          : "text-slate-300 hover:bg-slate-800 border border-transparent",
      ].join(" ")}
    >
      <span className={active ? "text-amber-300" : "text-slate-400"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {typeof badge === "number" && badge > 0 ? (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200 font-semibold tabular-nums">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function DashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}
function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
