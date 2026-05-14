"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ACTIVITY_TYPES } from "@/lib/agent/mockProperties";
import { AI_AGENT_LIST } from "@/lib/agent/aiAgents";
import { PERSONA_LIST } from "@/lib/agent/personas";

// Single modal for the three zone-settings actions:
//   - Modify chosen activities (which properties show inside this zone)
//   - Assign / unassign AI Agents + AI Customers
//   - Remove the zone
// Editing the geographic location is intentionally out of scope here — the
// agent removes + re-pins on the Working Areas map for that, which keeps the
// click-on-map UX as the single source of truth for coordinates.

export default function ZoneSettingsModal({ zone, onClose, onUpdate, onRemove }) {
  const [label, setLabel] = useState(zone.label || "");
  const [activities, setActivities] = useState(new Set(zone.activities || []));
  const [agents, setAgents] = useState(new Set(zone.assignedAgents || []));
  const [customers, setCustomers] = useState(new Set(zone.assignedCustomers || []));
  const [mounted, setMounted] = useState(false);

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

  function toggle(set, setter, value) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  function handleSave() {
    onUpdate(zone.id, {
      label: label.trim() || zone.label,
      activities: [...activities],
      assignedAgents: [...agents],
      assignedCustomers: [...customers],
    });
    onClose();
  }

  function handleRemove() {
    if (!confirm(`Remove "${zone.label}"? This can't be undone.`)) return;
    onRemove(zone.id);
    onClose();
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zone settings"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Zone settings</h2>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
              {zone.addressLabel || `${zone.lat.toFixed(4)}, ${zone.lng.toFixed(4)}`}
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

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-5">
          {/* Label */}
          <section>
            <Label>Zone label</Label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={zone.label}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </section>

          {/* Activities */}
          <section>
            <Label>Property activities shown in this zone</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {ACTIVITY_TYPES.map((a) => {
                const active = activities.has(a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => toggle(activities, setActivities, a.value)}
                    className={`text-[11.5px] text-left px-2.5 py-1.5 rounded border transition ${
                      active
                        ? `${a.color} border-current font-semibold`
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {a.icon} {a.label}
                  </button>
                );
              })}
            </div>
            <div className="text-[10.5px] text-slate-500 mt-1.5">
              {activities.size === 0
                ? "Nothing selected — the zone will not match any properties."
                : `${activities.size} activity type${activities.size === 1 ? "" : "s"} selected.`}
            </div>
          </section>

          {/* Assigned AI Agents */}
          <section>
            <Label>Assign AI Agents</Label>
            <div className="space-y-1">
              {AI_AGENT_LIST.map((a) => {
                const checked = agents.has(a.key);
                return (
                  <AssignRow
                    key={a.key}
                    avatar={a.avatar}
                    color={a.color}
                    name={a.name}
                    sub={a.role}
                    checked={checked}
                    onToggle={() => toggle(agents, setAgents, a.key)}
                  />
                );
              })}
            </div>
          </section>

          {/* Assigned AI Customers */}
          <section>
            <Label>Assign AI Customers</Label>
            <div className="space-y-1">
              {PERSONA_LIST.map((p) => {
                const checked = customers.has(p.key);
                return (
                  <AssignRow
                    key={p.key}
                    avatar={p.avatar}
                    color={p.color}
                    name={p.name}
                    sub={p.label}
                    checked={checked}
                    onToggle={() => toggle(customers, setCustomers, p.key)}
                  />
                );
              })}
            </div>
          </section>

          <div className="text-[10.5px] text-slate-500 leading-relaxed">
            <strong className="text-slate-400">Tip:</strong> to move this zone to a different
            spot, remove it and drop a new pin on the Working Areas map. Coordinates always
            come from a real map click — never typed in.
          </div>
        </div>

        <footer className="px-5 py-3 border-t border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={handleRemove}
            className="px-3 py-2 rounded border border-red-700/50 bg-red-900/20 hover:bg-red-900/30 text-red-300 text-xs font-semibold transition"
          >
            ✕ Remove zone
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold transition"
          >
            Save changes
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Label({ children }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
      {children}
    </div>
  );
}

function AssignRow({ avatar, color, name, sub, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded border transition text-left ${
        checked
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-slate-700 bg-slate-950 hover:border-slate-500"
      }`}
    >
      <span
        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-slate-900 font-bold text-[10px]"
        style={{ background: color }}
      >
        {avatar}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-slate-100 truncate">{name}</div>
        <div className="text-[10px] text-slate-500 truncate">{sub}</div>
      </div>
      <span
        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-[10px] font-bold ${
          checked
            ? "bg-amber-500 border-amber-500 text-slate-900"
            : "border-slate-600 text-transparent"
        }`}
      >
        ✓
      </span>
    </button>
  );
}
