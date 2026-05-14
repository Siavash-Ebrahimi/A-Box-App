"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ICASE_TEMPLATE_LIST, ICASE_TEMPLATES } from "@/lib/agent/iCases";
import { AI_AGENT_LIST } from "@/lib/agent/aiAgents";
import { PERSONA_LIST } from "@/lib/agent/personas";

// Two-step builder for adding (or editing) an i-Case.
//   1. Pick a template
//   2. Name it, pick zones, assign AI agents + AI customers
// We keep it deliberately constrained — picking from templates is what makes the
// MVP feel "smart" without us having to build a real workflow engine yet.

export default function ICaseBuilder({ existing, zones, onClose, onSave }) {
  const editing = !!existing;
  const [step, setStep] = useState(editing ? "config" : "pick");
  const [templateKey, setTemplateKey] = useState(existing?.templateKey || null);
  const [name, setName] = useState(existing?.name || "");
  const [zoneIds, setZoneIds] = useState(new Set(existing?.zoneIds || []));
  const [agentKeys, setAgentKeys] = useState(new Set(existing?.agentKeys || []));
  const [customerKeys, setCustomerKeys] = useState(new Set(existing?.customerKeys || []));
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

  const template = templateKey ? ICASE_TEMPLATES[templateKey] : null;

  function pickTemplate(t) {
    setTemplateKey(t.key);
    // Pre-fill the name with the template name on first pick (user can change).
    if (!name) setName(t.name);
    setStep("config");
  }

  function toggle(set, setter, value) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  function handleSave() {
    if (!template || !name.trim()) return;
    onSave({
      ...(existing || {}),
      name: name.trim(),
      templateKey: template.key,
      zoneIds: [...zoneIds],
      agentKeys: [...agentKeys],
      customerKeys: [...customerKeys],
    });
    onClose();
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit i-Case" : "Create i-Case"}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full max-h-[92vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {editing ? "Edit i-Case" : step === "pick" ? "Pick an i-Case template" : "Configure i-Case"}
            </h2>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {step === "pick"
                ? "Each template is a recipe for a multi-step automation."
                : "Name it, pick the zones it watches, and assign your team."}
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

        {step === "pick" ? (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {ICASE_TEMPLATE_LIST.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => pickTemplate(t)}
                className="text-left p-3 rounded-lg border border-slate-700 bg-slate-950 hover:border-amber-500 hover:bg-slate-900 transition"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ background: `${t.color}25`, color: t.color }}
                  >
                    {t.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-100 truncate">{t.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">{t.category}</div>
                  </div>
                </div>
                <div className="text-[11.5px] text-slate-400 mt-2 leading-snug">{t.description}</div>
                <ol className="mt-2.5 space-y-1 text-[10.5px] text-slate-300 list-decimal list-inside">
                  {t.steps.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
                  {t.steps.length > 3 ? <li className="text-slate-500 list-none">+{t.steps.length - 3} more</li> : null}
                </ol>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-5">
            {/* Template preview */}
            {template ? (
              <section className="p-3 rounded-lg border border-slate-700 bg-slate-950">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${template.color}25`, color: template.color }}
                  >
                    {template.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] uppercase tracking-wider text-slate-500">Template</div>
                    <div className="text-[13px] font-semibold text-slate-100 truncate">{template.name}</div>
                  </div>
                  {!editing ? (
                    <button
                      type="button"
                      onClick={() => setStep("pick")}
                      className="text-[10px] text-slate-500 hover:text-slate-300"
                    >
                      change
                    </button>
                  ) : null}
                </div>
                <div className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  <strong className="text-slate-300">Trigger:</strong> {template.trigger}
                </div>
                <ol className="mt-2 space-y-1 text-[11px] text-slate-300 list-decimal list-inside">
                  {template.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </section>
            ) : null}

            {/* Name */}
            <section>
              <Label>Short name for this i-Case</Label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marina Welcome"
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </section>

            {/* Zones */}
            <section>
              <Label>Watch these working zones</Label>
              {zones.length === 0 ? (
                <div className="text-[11px] text-slate-500 italic">
                  No working zones yet — save at least one zone first.
                </div>
              ) : (
                <div className="space-y-1">
                  {zones.map((z) => (
                    <AssignRow
                      key={z.id}
                      avatar="📍"
                      color="#3b82f6"
                      name={z.label}
                      sub={z.addressLabel || `${z.lat.toFixed(3)}, ${z.lng.toFixed(3)}`}
                      checked={zoneIds.has(z.id)}
                      onToggle={() => toggle(zoneIds, setZoneIds, z.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Assigned agents */}
            <section>
              <Label>Loop in these AI Agents</Label>
              <div className="space-y-1">
                {AI_AGENT_LIST.map((a) => (
                  <AssignRow
                    key={a.key}
                    avatar={a.avatar}
                    color={a.color}
                    name={a.name}
                    sub={a.role}
                    checked={agentKeys.has(a.key)}
                    onToggle={() => toggle(agentKeys, setAgentKeys, a.key)}
                  />
                ))}
              </div>
            </section>

            {/* AI customers it watches */}
            <section>
              <Label>Watch these AI Customers (optional)</Label>
              <div className="space-y-1">
                {PERSONA_LIST.map((p) => (
                  <AssignRow
                    key={p.key}
                    avatar={p.avatar}
                    color={p.color}
                    name={p.name}
                    sub={p.label}
                    checked={customerKeys.has(p.key)}
                    onToggle={() => toggle(customerKeys, setCustomerKeys, p.key)}
                  />
                ))}
              </div>
            </section>

            <div className="text-[10.5px] text-slate-500 leading-relaxed">
              i-Cases are demonstrations — the MVP doesn't yet fire real automations, but every
              card shows exactly what the workflow would do and surfaces sample notifications
              you can approve or dismiss.
            </div>
          </div>
        )}

        {step === "config" ? (
          <footer className="px-5 py-3 border-t border-slate-800 flex gap-2 justify-end">
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
              disabled={!template || !name.trim()}
              className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editing ? "Save changes" : "Create i-Case"}
            </button>
          </footer>
        ) : null}
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
