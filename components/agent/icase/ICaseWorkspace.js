"use client";

// "Automation Studio" — the i-Case workspace.
//
// Layout:
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ Header: ← Back · Title (rename inline) · Save indicator · Delete    │
//   ├──────────────┬────────────────────────────────────┬────────────────────┤
//   │ Tool library │ Canvas (rule cards stack)          │ Scope picker       │
//   │ (categorised │                                    │ (zones + props)    │
//   │ buttons)     │                                    │                    │
//   ├──────────────┴────────────────────────────────────┴────────────────────┤
//   │ Footer: free-form scenario notes textarea                            │
//   └──────────────────────────────────────────────────────────────────────┘
//
// All changes auto-save via onPatch. Drag-and-drop is intentionally skipped —
// click-to-add is faster, leaner, and equally expressive for the MVP demo.

import { useMemo, useState } from "react";
import { PROPERTIES } from "@/lib/agent/mockProperties";
import { metersBetween } from "@/lib/agent/distance";
import { RULES, rulesByCategory } from "@/lib/agent/iCaseRules";
import { AI_AGENT_LIST } from "@/lib/agent/aiAgents";
import { PERSONA_LIST } from "@/lib/agent/personas";

export default function ICaseWorkspace({ iCase, zones, scopedProperties, onPatch, onDelete, onBack }) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(iCase.name);
  const [descDraft, setDescDraft] = useState(iCase.description || "");

  const scopedZoneIds = new Set(iCase.zoneIds || []);
  const allZonesScoped = scopedZoneIds.size === zones.length && zones.length > 0;
  const selectedPropIds = new Set(iCase.selectedPropertyIds || []);

  // Properties that live inside ANY scoped zone — the "add to scope" list on the right.
  const availableProperties = useMemo(() => {
    if (!zones || zones.length === 0) return [];
    const targetZones = allZonesScoped || scopedZoneIds.size === 0
      ? zones
      : zones.filter((z) => scopedZoneIds.has(z.id));
    if (targetZones.length === 0) return [];
    const out = [];
    const seen = new Set();
    for (const z of targetZones) {
      for (const p of PROPERTIES) {
        if (seen.has(p.id)) continue;
        if (metersBetween(p.lat, p.lng, z.lat, z.lng) > z.radius) continue;
        const zoneActs = z.activities || [];
        if (zoneActs.length > 0) {
          const acts = p.activities || [];
          if (!zoneActs.some((a) => acts.includes(a))) continue;
        }
        seen.add(p.id);
        out.push(p);
      }
    }
    return out;
  }, [zones, allZonesScoped, [...scopedZoneIds].join(",")]);

  // ---- handlers ----
  function commitName() {
    const next = nameDraft.trim() || iCase.name;
    onPatch({ name: next });
    setEditingName(false);
  }
  function commitDescription() {
    onPatch({ description: descDraft });
  }

  function toggleZone(zoneId) {
    const next = new Set(scopedZoneIds);
    if (next.has(zoneId)) next.delete(zoneId);
    else next.add(zoneId);
    onPatch({ zoneIds: [...next] });
  }
  function selectAllZones() { onPatch({ zoneIds: zones.map((z) => z.id) }); }
  function clearZones()     { onPatch({ zoneIds: [] }); }

  function toggleProperty(propId) {
    const next = new Set(selectedPropIds);
    if (next.has(propId)) next.delete(propId);
    else next.add(propId);
    onPatch({ selectedPropertyIds: [...next] });
  }

  function addRule(toolKey) {
    const tool = RULES[toolKey];
    if (!tool) return;
    const newRule = {
      id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      toolKey,
      recipient: tool.recipientDefault || null,
      note: "",
    };
    onPatch({ rules: [...(iCase.rules || []), newRule] });
  }
  function updateRule(ruleId, patch) {
    onPatch({
      rules: (iCase.rules || []).map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
    });
  }
  function removeRule(ruleId) {
    onPatch({ rules: (iCase.rules || []).filter((r) => r.id !== ruleId) });
  }
  function moveRule(ruleId, dir) {
    const arr = [...(iCase.rules || [])];
    const idx = arr.findIndex((r) => r.id === ruleId);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    onPatch({ rules: arr });
  }

  function commitNotes(value) { onPatch({ workspaceNotes: value }); }

  const ruleCount = iCase.rules?.length || 0;
  const propCount = selectedPropIds.size;
  const zoneCount = scopedZoneIds.size;

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* ---------- Header ---------- */}
      <header className="px-5 py-3 border-b border-slate-800 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-slate-100 px-2 py-1 rounded hover:bg-slate-800 transition"
        >
          ← Agent Hub
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-amber-400 text-base">🤖</span>
          {editingName ? (
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameDraft(iCase.name); setEditingName(false); } }}
              autoFocus
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-sm font-semibold focus:outline-none focus:border-amber-500"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setNameDraft(iCase.name); setEditingName(true); }}
              className="text-sm font-semibold text-slate-100 hover:text-amber-300 transition truncate text-left"
              title="Click to rename"
            >
              {iCase.name}
            </button>
          )}
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">· i-Case Workspace</span>
        </div>

        <div className="text-[10.5px] text-slate-500 hidden md:flex items-center gap-3 tabular-nums">
          <span>📍 {zoneCount}{allZonesScoped ? " (all)" : ""}</span>
          <span>🏠 {propCount}</span>
          <span>⚡ {ruleCount} rule{ruleCount === 1 ? "" : "s"}</span>
          <span className="text-emerald-400">✓ auto-saved</span>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="text-[11px] px-2.5 py-1 rounded border border-red-700/50 bg-red-900/20 hover:bg-red-900/30 text-red-300 transition"
          title="Delete this i-Case"
        >
          ✕ Delete
        </button>
      </header>

      {/* ---------- Description strip ---------- */}
      <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-900/30">
        <textarea
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          onBlur={commitDescription}
          placeholder="One-line description of what this i-Case is for…"
          rows={1}
          className="w-full bg-transparent text-[12.5px] text-slate-200 placeholder-slate-600 focus:outline-none resize-none"
        />
      </div>

      {/* ---------- 3-column body ---------- */}
      <div className="flex-1 flex min-h-0">
        {/* Left: tool library */}
        <ToolLibrary onAddRule={addRule} />

        {/* Center: canvas */}
        <Canvas
          iCase={iCase}
          zones={zones}
          scopedProperties={scopedProperties}
          onRemoveRule={removeRule}
          onUpdateRule={updateRule}
          onMoveRule={moveRule}
          onAddRule={addRule}
        />

        {/* Right: scope picker */}
        <ScopePicker
          zones={zones}
          scopedZoneIds={scopedZoneIds}
          allZonesScoped={allZonesScoped}
          availableProperties={availableProperties}
          selectedPropIds={selectedPropIds}
          onToggleZone={toggleZone}
          onSelectAllZones={selectAllZones}
          onClearZones={clearZones}
          onToggleProperty={toggleProperty}
        />
      </div>

      {/* ---------- Footer notes ---------- */}
      <footer className="border-t border-slate-800 bg-slate-950 px-5 py-2.5">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
          Scenario notes (free-form)
        </div>
        <textarea
          defaultValue={iCase.workspaceNotes || ""}
          onBlur={(e) => commitNotes(e.target.value)}
          placeholder='e.g. "Run this every weekday morning; escalate to Sam if no client response by 2pm…"'
          rows={2}
          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-[12.5px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
        />
      </footer>
    </div>
  );
}

// ============================================================================
// Tool library (left column)
// ============================================================================
function ToolLibrary({ onAddRule }) {
  const groups = rulesByCategory();
  return (
    <aside className="w-[240px] shrink-0 border-r border-slate-800 bg-slate-950 overflow-y-auto scrollbar-thin">
      <div className="px-3 py-3 border-b border-slate-800">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Tool library
        </div>
        <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
          Click any tool to drop a rule onto the canvas.
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.key} className="px-3 py-3 border-b border-slate-800 space-y-1">
          <div className="text-[9.5px] uppercase tracking-[0.15em] font-semibold mb-1.5"
               style={{ color: g.color }}>
            {g.label}
          </div>
          {g.rules.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onAddRule(r.key)}
              className="w-full text-left px-2 py-1.5 rounded border border-slate-800 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900 transition group"
              title={r.summary}
            >
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0">{r.icon}</span>
                <span className="text-[11.5px] font-medium text-slate-100 leading-tight">{r.label}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                {r.summary}
              </div>
            </button>
          ))}
        </section>
      ))}
    </aside>
  );
}

// ============================================================================
// Canvas (center column)
// ============================================================================
function Canvas({ iCase, zones, scopedProperties, onAddRule, onRemoveRule, onUpdateRule, onMoveRule }) {
  const rules = iCase.rules || [];

  return (
    <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin px-6 py-5">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-slate-300 font-semibold">
            Scenario · {rules.length} rule{rules.length === 1 ? "" : "s"}
          </h2>
          <div className="text-[10.5px] text-slate-500">
            Order matters — top to bottom.
          </div>
        </div>

        {rules.length === 0 ? (
          <EmptyCanvas onQuickAdd={onAddRule} />
        ) : (
          <div className="space-y-2.5">
            {rules.map((rule, i) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                index={i}
                total={rules.length}
                iCase={iCase}
                zones={zones}
                scopedProperties={scopedProperties}
                onRemove={() => onRemoveRule(rule.id)}
                onUpdate={(patch) => onUpdateRule(rule.id, patch)}
                onMoveUp={() => onMoveRule(rule.id, -1)}
                onMoveDown={() => onMoveRule(rule.id, +1)}
              />
            ))}
            <div className="text-[10.5px] text-slate-500 mt-4 leading-relaxed text-center">
              Demo MVP: rules are saved per i-Case in your browser. Execution is simulated —
              no real automations fire yet.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyCanvas({ onQuickAdd }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
      <div className="text-4xl mb-2">⚡</div>
      <div className="text-sm font-semibold text-slate-200">No rules yet</div>
      <div className="text-[12px] text-slate-400 mt-1.5 leading-relaxed max-w-md mx-auto">
        Pick a tool from the library on the left to add your first rule. Common starts:
      </div>
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        <button
          type="button"
          onClick={() => onQuickAdd("customer_enters_zone")}
          className="text-[11px] px-2.5 py-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 transition"
        >
          🚪 When customer enters a zone
        </button>
        <button
          type="button"
          onClick={() => onQuickAdd("daily_schedule")}
          className="text-[11px] px-2.5 py-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 transition"
        >
          📅 Daily at scheduled time
        </button>
        <button
          type="button"
          onClick={() => onQuickAdd("notify_me")}
          className="text-[11px] px-2.5 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 transition"
        >
          👤 Notify me
        </button>
        <button
          type="button"
          onClick={() => onQuickAdd("find_relationships")}
          className="text-[11px] px-2.5 py-1.5 rounded border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 transition"
        >
          🔍 Find cross-zone matches
        </button>
      </div>
    </div>
  );
}

function RuleCard({ rule, index, total, iCase, zones, scopedProperties, onRemove, onUpdate, onMoveUp, onMoveDown }) {
  const tool = RULES[rule.toolKey];
  if (!tool) {
    return (
      <div className="p-2.5 rounded border border-red-700/40 bg-red-900/20 text-red-300 text-[11px]">
        Unknown rule type: {rule.toolKey}
        <button onClick={onRemove} className="ml-2 underline">remove</button>
      </div>
    );
  }
  const catColor = {
    trigger: "#06b6d4", action: "#a855f7", notification: "#f59e0b", condition: "#10b981",
  }[tool.category] || "#64748b";

  const scopedZoneNames = (iCase.zoneIds || [])
    .map((id) => zones.find((z) => z.id === id)?.label)
    .filter(Boolean);
  const allZonesScoped = (iCase.zoneIds || []).length === zones.length && zones.length > 0;

  return (
    <div
      className="rounded-lg border bg-slate-900/40 overflow-hidden"
      style={{ borderColor: `${catColor}55` }}
    >
      <div className="px-3 py-2 flex items-center gap-2.5" style={{ background: `${catColor}15` }}>
        <span className="text-[10px] tabular-nums text-slate-400 w-5 text-right">{index + 1}.</span>
        <span className="text-lg shrink-0">{tool.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold text-slate-100 truncate">{tool.label}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">{tool.category}</div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-slate-800 text-[11px]"
            title="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed px-1.5 py-0.5 rounded hover:bg-slate-800 text-[11px]"
            title="Move down"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-400 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-slate-800 text-[12px]"
            title="Remove rule"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2 text-[12px]">
        <div className="text-slate-300 leading-snug">{tool.summary}</div>

        {/* Recipient selector for notification rules */}
        {tool.category === "notification" ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Recipient
            </span>
            <RecipientPicker
              value={rule.recipient || tool.recipientDefault || "me"}
              onChange={(r) => onUpdate({ recipient: r })}
              iCase={iCase}
            />
          </div>
        ) : null}

        {/* Scope summary */}
        <div className="text-[10.5px] text-slate-400 leading-relaxed pt-1.5 border-t border-slate-800">
          <strong className="text-slate-300">Applies to: </strong>
          {allZonesScoped
            ? "all zones"
            : scopedZoneNames.length > 0
              ? scopedZoneNames.join(", ")
              : <em className="text-slate-500">no zones picked yet</em>}
          {scopedProperties.length > 0 ? (
            <span className="text-slate-500"> · {scopedProperties.length} pinned propert{scopedProperties.length === 1 ? "y" : "ies"}</span>
          ) : null}
        </div>

        {/* Per-rule free-form note */}
        <input
          type="text"
          defaultValue={rule.note || ""}
          onBlur={(e) => onUpdate({ note: e.target.value })}
          placeholder="Optional: any extra detail for this rule…"
          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11.5px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>
  );
}

function RecipientPicker({ value, onChange, iCase }) {
  const options = [
    { value: "me", label: "Me (the agent)", color: "#fbbf24" },
    { value: "agent", label: `AI Agent${iCase.agentKeys?.length ? "" : " (none assigned)"}`, color: "#10b981" },
    { value: "client", label: `Client${iCase.customerKeys?.length ? "" : " (none assigned)"}`, color: "#06b6d4" },
  ];
  return (
    <div className="flex gap-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`text-[10.5px] px-2 py-0.5 rounded border transition ${
              active
                ? "border-current font-semibold"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
            }`}
            style={active ? { color: o.color, background: `${o.color}18`, borderColor: `${o.color}55` } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Scope picker (right column)
// ============================================================================
function ScopePicker({
  zones, scopedZoneIds, allZonesScoped, availableProperties,
  selectedPropIds, onToggleZone, onSelectAllZones, onClearZones, onToggleProperty,
}) {
  return (
    <aside className="w-[280px] shrink-0 border-l border-slate-800 bg-slate-950 overflow-y-auto scrollbar-thin">
      {/* Zones */}
      <section className="px-3 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Zones in scope · {scopedZoneIds.size}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onSelectAllZones}
              disabled={zones.length === 0}
              className="text-[9.5px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200 disabled:opacity-30"
            >
              All
            </button>
            <span className="text-slate-700 text-[9.5px]">·</span>
            <button
              type="button"
              onClick={onClearZones}
              disabled={scopedZoneIds.size === 0}
              className="text-[9.5px] uppercase tracking-wider text-slate-500 hover:text-slate-300 disabled:opacity-30"
            >
              None
            </button>
          </div>
        </div>
        {zones.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic">
            No working zones saved yet. Add one in the Agent Hub before scoping this i-Case.
          </div>
        ) : (
          <div className="space-y-1">
            {zones.map((z) => (
              <ScopeRow
                key={z.id}
                icon="📍"
                color="#3b82f6"
                name={z.label}
                sub={z.addressLabel || `${z.lat.toFixed(3)}, ${z.lng.toFixed(3)} · ${(z.radius / 1000).toFixed(1)} km`}
                checked={scopedZoneIds.has(z.id)}
                onToggle={() => onToggleZone(z.id)}
              />
            ))}
          </div>
        )}
        {allZonesScoped ? (
          <div className="text-[10px] text-cyan-300 mt-2 leading-relaxed">
            ✓ All zones selected — rules apply across your entire working coverage.
          </div>
        ) : null}
      </section>

      {/* Properties */}
      <section className="px-3 py-3 border-b border-slate-800">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
          Properties · {selectedPropIds.size} pinned
        </div>
        <div className="text-[10.5px] text-slate-500 leading-relaxed mb-2">
          Tap a property to pin it into this i-Case. Only properties inside the scoped zones
          appear here.
        </div>
        {availableProperties.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic">
            {zones.length === 0
              ? "Save a zone first."
              : scopedZoneIds.size === 0
                ? "Pick at least one zone to see its properties."
                : "No properties inside the scoped zones."}
          </div>
        ) : (
          <div className="space-y-1">
            {availableProperties.slice(0, 50).map((p) => (
              <ScopeRow
                key={p.id}
                icon="🏠"
                color="#facc15"
                name={p.title}
                sub={`${p.building} · ${p.area} · ${
                  p.listing === "rent"
                    ? `AED ${Math.round(p.price/1000)}K/y`
                    : `AED ${(p.price/1_000_000).toFixed(1)}M`
                }`}
                checked={selectedPropIds.has(p.id)}
                onToggle={() => onToggleProperty(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Assignments mirror — read-only summary */}
      <section className="px-3 py-3 border-b border-slate-800">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
          Assigned (from create step)
        </div>
        <Mirror label="AI Agents" keys={[]} _todo />
        <div className="text-[10.5px] text-slate-500 leading-relaxed">
          To assign AI Agents or AI Customers to this i-Case, configure recipient on each
          notification rule above.
        </div>
      </section>
    </aside>
  );
}

function ScopeRow({ icon, color, name, sub, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded border transition text-left ${
        checked
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-slate-800 bg-slate-950 hover:border-slate-600"
      }`}
    >
      <span
        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-slate-900 font-bold text-[10px]"
        style={{ background: color }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[11.5px] font-medium text-slate-100 truncate">{name}</div>
        <div className="text-[9.5px] text-slate-500 truncate">{sub}</div>
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

function Mirror() { return null; }
