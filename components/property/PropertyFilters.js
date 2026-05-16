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
  comparePick1, comparePick2,
  resultCount,                // pins currently shown on the map
  resultCountByArea,          // { 1: n, 2: n } — pool size per area (in radius + filters)
  // NEW: checklist data
  propsInArea1 = [],
  propsInArea2 = [],
  selectedIds1,               // Set<string>
  selectedIds2,               // Set<string>
  onToggleProperty,           // (slot, propertyId) => void
  // Handlers
  onChangeArea,
  onChangeFilters,
  onChangeRadius,
  onToggleCompare,
  onClearComparePick,
  onOpenComparison,
  onBackToHome,
  // Add Property flow
  placeMode,
  onStartAddProperty,
  onCancelAddProperty,
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

      {/* Compare toggle + Add Property */}
      <div className="px-4 py-3 border-b border-slate-800 space-y-2">
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

        {/* Add Property — turns on place-mode; next map click drops the location. */}
        <button
          type="button"
          onClick={placeMode ? onCancelAddProperty : onStartAddProperty}
          className={`w-full text-[12px] font-semibold px-3 py-2 rounded border transition ${
            placeMode
              ? "border-amber-500 bg-amber-500/20 text-amber-100"
              : "border-amber-500/40 bg-amber-500/5 text-amber-200 hover:bg-amber-500/15"
          }`}
        >
          {placeMode ? "⏳ Click the map to drop pin · Cancel" : "+ Add Property"}
        </button>
        <div className="text-[10.5px] text-slate-500 leading-relaxed">
          {placeMode
            ? "Zoom in close before clicking so the pin lands on the exact building."
            : showCompareTray
              ? "Click the map to set Area 2. Pick one property in each area to enable the AI report."
              : "Turn Compare on for a side-by-side report, or add a property to save your own listing."}
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
          propsInArea={propsInArea1}
          selectedIds={selectedIds1}
          onToggleProperty={(id) => onToggleProperty?.(1, id)}
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
            propsInArea={propsInArea2}
            selectedIds={selectedIds2}
            onToggleProperty={(id) => onToggleProperty?.(2, id)}
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
  propsInArea = [], selectedIds, onToggleProperty,
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

      {/* Filters — checkbox-style rows so it matches the property checklist below
          and the user can clearly see which listing types are active. */}
      <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
        Listing type
      </div>
      <div className="space-y-1 mb-3">
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
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded border transition text-left ${
                active
                  ? "border-current font-semibold"
                  : "border-slate-800 bg-slate-950 hover:border-slate-600"
              }`}
              style={active ? { color: f.color, background: `${f.color}12`, borderColor: `${f.color}55` } : undefined}
            >
              <span
                className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-[10px] font-bold ${
                  active ? "text-slate-900" : "border-slate-600 text-transparent"
                }`}
                style={active ? { background: f.color, borderColor: f.color } : undefined}
              >
                ✓
              </span>
              <span className="text-base shrink-0">{f.icon}</span>
              <span className="text-[11.5px] flex-1">{f.label}</span>
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

      {/* ----- Properties in this area — checkbox list ----- */}
      <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold mt-3 mb-1.5 flex items-center justify-between">
        <span>
          Properties in this area · {propsInArea.length}
        </span>
        {selectedIds && propsInArea.length > 0 ? (
          <span className="text-cyan-300 tabular-nums">
            {[...selectedIds].filter((id) => propsInArea.some((p) => p.id === id)).length} on map
          </span>
        ) : null}
      </div>
      {propsInArea.length === 0 ? (
        <div className="text-[10.5px] text-slate-500 italic">
          {area
            ? "No matching properties in this radius. Try a different filter or radius."
            : "Set a location to see properties."}
        </div>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin pr-1">
          {propsInArea.map((p) => {
            const checked = !!selectedIds?.has(p.id);
            const priceText = p.listing === "rent"
              ? `AED ${Math.round(p.price/1000)}K/y`
              : p.price >= 1_000_000
                ? `AED ${(p.price/1_000_000).toFixed(1)}M`
                : `AED ${Math.round(p.price/1000)}K`;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggleProperty?.(p.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded border transition text-left ${
                  checked
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-slate-800 bg-slate-950 hover:border-slate-600"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-[10px] font-bold ${
                    checked
                      ? "bg-amber-500 border-amber-500 text-slate-900"
                      : "border-slate-600 text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: p._color || "#64748b" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-medium text-slate-100 truncate">{p.title}</div>
                  <div className="text-[9.5px] text-slate-500 truncate">
                    {p.building} · {p.area}
                  </div>
                </div>
                <span className="text-[10.5px] text-amber-300 font-semibold tabular-nums shrink-0">
                  {priceText}
                </span>
              </button>
            );
          })}
        </div>
      )}
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
