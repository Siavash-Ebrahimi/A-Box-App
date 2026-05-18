"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  onRenameAgent,
}) {
  const [renameOpen, setRenameOpen] = useState(false);
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
            <div className="text-[10px] text-slate-500 truncate">
              {profile?.company}
              {profile?.kind === "demo" ? <span className="ml-1 text-slate-600">· Demo</span> : null}
            </div>
          </div>
          {/* Pencil icon — opens an inline rename modal where the agent can
              re-brand their profile (name + company). Available for both demo
              and custom profiles. */}
          <button
            type="button"
            onClick={() => setRenameOpen(true)}
            className="text-slate-500 hover:text-amber-300 px-1.5 py-1 rounded hover:bg-slate-800 transition shrink-0"
            title="Rename agent profile"
            aria-label="Rename agent profile"
          >
            <PencilIcon />
          </button>
        </div>
        {/* Account actions — both buttons are visible regardless of profile
            kind, so the user can always either rename or remove the active
            account from one consistent place. */}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setRenameOpen(true)}
            className="text-[10px] uppercase tracking-wider text-slate-400 hover:text-amber-300 transition py-1 border border-slate-800 hover:border-amber-500/40 rounded"
            title="Edit your agent name and company"
          >
            ✎ Rename
          </button>
          <button
            type="button"
            onClick={onDeleteAgent}
            className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-red-400 transition py-1 border border-slate-800 hover:border-red-900/50 rounded"
            title="Remove this agent profile and return to the welcome screen"
          >
            ✕ Remove
          </button>
        </div>
      </header>

      {renameOpen ? (
        <RenameAgentModal
          profile={profile}
          onClose={() => setRenameOpen(false)}
          onSave={(payload) => {
            onRenameAgent?.(payload);
            setRenameOpen(false);
          }}
        />
      ) : null}

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
          icon={<InvestmentIcon />}
          label="Investment Hub"
          active={active === "investment-hub"}
          onClick={() => onSelect("investment-hub")}
        />
        <NavItem
          icon={<HomeIcon />}
          label="Real Estate News"
          badge={counts.properties}
          active={active === "properties"}
          onClick={() => onSelect("properties")}
        />
        <NavItem
          icon={<ProjectIcon />}
          label="Common Project"
          badge={counts.commonProjects}
          active={active === "common-projects"}
          onClick={() => onSelect("common-projects")}
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
// Briefcase + sparkle glyph for the new Investment Hub section.
function InvestmentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
      <path d="M12 11v4" />
    </svg>
  );
}
// Stacked-folders glyph for the new Common Project section.
function ProjectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M7 11h10" />
      <path d="M7 14h7" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

// Tiny portal-mounted modal for editing the agent's display name + company.
// Mirrors the Add Property form's modal style so the workspace feels cohesive.
function RenameAgentModal({ profile, onClose, onSave }) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(profile?.name || "");
  const [company, setCompany] = useState(profile?.company || "");

  useEffect(() => {
    setMounted(true);
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  if (!mounted) return null;

  const canSave = name.trim().length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSave) return;
    onSave({ name: name.trim(), company: company.trim() });
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rename agent profile"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Rename agent profile</h2>
            <div className="text-[11px] text-slate-500 mt-0.5">
              This is the name that shows in your sidebar and on shared zones.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-lg w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="px-5 py-4 space-y-3">
          <label className="block">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Display name *
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoFocus
              placeholder="e.g. Sara Hadid"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </label>
          <label className="block">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Company / brokerage
            </div>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              maxLength={80}
              placeholder="e.g. Eshel Properties"
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </label>
        </div>

        <footer className="px-5 py-3 border-t border-slate-800 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save changes
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
