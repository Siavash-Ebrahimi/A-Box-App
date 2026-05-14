"use client";

import { PROPERTY_FILTERS } from "@/lib/property/filters";

const RADIUS_PRESETS = [
  { value: 500, label: "500 m" },
  { value: 1000, label: "1 km" },
  { value: 1500, label: "1.5 km" },
];

// Sidebar UI for the Property discovery view.
// In compare mode the sidebar shows two stacked area-control panels and a tray
// summarising the user's compare selections.

export default function PropertyFilters({
  // Mode + state
  mode,                       // "explore" | "compare"
  area1, radius1, filters1,
  area2, radius2, filters2,
  comparePick1, comparePick2, // {id, title, area, ...} | null
  resultCount,                // total visible properties across both areas
  resultCountByArea,          // { 1: n, 2: n } in compare mode
  // Handlers
  onChangeArea,               // (idx) => void  — agent wants to re-pick area idx
  onChangeFilters,            // (idx, nextSet) => void
  onChangeRadius,             // (idx, meters) => void
  onToggleCompare,            // () => void  — flips mode
  onClearComparePick,         // (idx) => void
  onOpenComparison,           // () => void  — opens the AI report modal
  onBackToHome,               // () => void
}) {
  const showCompareTray = mode === "compare";
  const canRunReport = !!comparePick1 && !!comparePick2;

  return (
    <aside className="w-[300px] shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
      <header className="px-4 py-4 border-b border-slate-800">
        <button
          type="button"
          onClick={onBackToHome}
          className="text-[11px] text-slate-500 hover:text-slate-300 transition mb-2"
        >
          ← Back to A-Box home
        </button>
        <div className="flex items-center gap-1 text-sm font-semibold tracking-tight">
          <span className="text-amber-400">A</span>
          <span className="text-slate-100">-Box</span>
          <span className="text-slate-500 mx-1">·</span>
          <span className="text-slate-300">Property Discovery</span>
        </div>
      </header>

      {/* Compare toggle */}
      <div className="px-4 py-3 border-b border-slate-800">
        <button
          type="button"
          onClick={onToggleCompare}
          className={`w-full text-[12px] font-semibold px-3 py-2 rounded border transition ${
            showCompareTray
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20"
              : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
          }`}
        >
          {showCompareTray ? "✓ Compare Two Areas (on)" : "Compare Two Areas"}
        </button>
        <div className="text-[10.5px] text-slate-500 mt-1.5 leading-relaxed">
          {showCompareTray
            ? "Click the map to set Area 2. Pick one property in each area to enable the AI report."
            : "Turn this on to evaluate two locations side-by-side with an AI report."}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Area 1 controls */}
        <AreaPanel
          index={1}
          label={showCompareTray ? "Area 1" : "Search location"}
          area={area1}
          radius={radius1}
          filters={filters1}
          color="#3b82f6"
          count={resultCountByArea?.[1]}
          showCount={showCompareTray}
          onChangeArea={() => onChangeArea(1)}
          onChangeFilters={(next) => onChangeFilters(1, next)}
          onChangeRadius={(r) => onChangeRadius(1, r)}
        />

        {/* Area 2 controls (compare only) */}
        {showCompareTray ? (
          <AreaPanel
            index={2}
            label="Area 2"
            area={area2}
            radius={radius2}
            filters={filters2}
            color="#10b981"
            count={resultCountByArea?.[2]}
            showCount
            onChangeArea={() => onChangeArea(2)}
            onChangeFilters={(next) => onChangeFilters(2, next)}
            onChangeRadius={(r) => onChangeRadius(2, r)}
            placeholderHint="Click the map to set Area 2"
          />
        ) : null}

        {/* Compare tray */}
        {showCompareTray ? (
          <div className="px-4 py-4 border-t border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
              Compare picks
            </div>
            <div className="space-y-2">
              <CompareSlot
                index={1}
                pick={comparePick1}
                color="#3b82f6"
                onClear={() => onClearComparePick(1)}
              />
              <CompareSlot
                index={2}
                pick={comparePick2}
                color="#10b981"
                onClear={() => onClearComparePick(2)}
              />
            </div>
            <button
              type="button"
              onClick={onOpenComparison}
              disabled={!canRunReport}
              className="mt-3 w-full text-sm font-semibold py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {canRunReport ? "Generate AI Comparison Report →" : "Pick one property in each area"}
            </button>
          </div>
        ) : null}
      </div>

      <footer className="px-4 py-3 border-t border-slate-800 text-[10px] text-slate-500">
        {resultCount} property{resultCount === 1 ? "" : "ies"} visible · click a pin to open details
      </footer>
    </aside>
  );
}

function AreaPanel({
  index, label, area, radius, filters, color, count, showCount,
  onChangeArea, onChangeFilters, onChangeRadius, placeholderHint,
}) {
  return (
    <section className="px-4 py-3 border-b border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            {label}
          </div>
        </div>
        {showCount ? (
          <span className="text-[10px] tabular-nums text-slate-300">{count || 0} properties</span>
        ) : null}
      </div>

      {area ? (
        <div className="text-[11px] text-slate-300 mb-2.5 leading-snug">
          {area.label || `${area.lat.toFixed(4)}, ${area.lng.toFixed(4)}`}
          <button
            type="button"
            onClick={onChangeArea}
            className="ml-2 text-cyan-300 hover:text-cyan-200 text-[10.5px] underline-offset-2 hover:underline"
          >
            change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onChangeArea}
          className="w-full mb-2.5 text-[11px] text-amber-300 hover:text-amber-200 border border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/15 rounded px-2 py-1.5 text-left transition"
        >
          {placeholderHint || "Click the map to set this area"}
        </button>
      )}

      {/* Filters */}
      <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
        Listing type
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {PROPERTY_FILTERS.map((f) => {
          const active = filters.has(f.value);
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                const next = new Set(filters);
                if (next.has(f.value)) next.delete(f.value);
                else next.add(f.value);
                onChangeFilters(next);
              }}
              className={`text-[11px] text-left px-2 py-1.5 rounded border transition flex items-center gap-1.5 ${
                active
                  ? "border-current font-semibold"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
              }`}
              style={active ? { color: f.color, background: `${f.color}15`, borderColor: `${f.color}55` } : undefined}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Radius */}
      <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
        Radius
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {RADIUS_PRESETS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => onChangeRadius(r.value)}
            className={`text-[11px] py-1.5 rounded border transition ${
              radius === r.value
                ? "border-amber-500 bg-amber-500/15 text-amber-200"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function CompareSlot({ index, pick, color, onClear }) {
  return (
    <div
      className={`p-2.5 rounded border ${
        pick ? "border-current bg-slate-900/40" : "border-dashed border-slate-700 bg-slate-900/20"
      }`}
      style={pick ? { color, borderColor: `${color}55` } : undefined}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
          style={{ background: color }}
        >
          {index}
        </span>
        {pick ? (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] font-semibold text-slate-100 truncate">{pick.title}</div>
              <div className="text-[10px] text-slate-400 truncate">{pick.building} · {pick.area}</div>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="text-slate-500 hover:text-slate-200 text-xs px-1"
              aria-label="Clear selection"
            >
              ✕
            </button>
          </>
        ) : (
          <span className="text-[11px] text-slate-500 italic">No property picked yet</span>
        )}
      </div>
    </div>
  );
}
