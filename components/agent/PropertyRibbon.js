"use client";

import { PROPERTY_FILTERS } from "@/lib/property/filters";

// One ribbon for a zone's Property layer. Sits at the top of the map (rendered
// by ZoneRibbonsStack). Contains:
//   - Zone label (number + name)
//   - Listing-type filter chips (rent / sale / shop / manufacture / …)
//   - "+ Add Property" button (turns on place-mode tied to this zone)
// Mirrors the property-type selector that used to live in the sidebar,
// per the user's redesign of the Working Area.

export default function PropertyRibbon({
  zone,
  index,
  color,
  activeFilters = [],
  onToggleFilter,
  onAddProperty,
  placeMode = false,
  matchCount = 0,
}) {
  return (
    <div className="bg-slate-950/95 backdrop-blur border border-slate-700 rounded-lg shadow-xl">
      <div className="px-3 py-2 flex items-center gap-2.5 flex-wrap">
        {/* Zone label — colour-coded dot + "Zone N · Property". */}
        <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-slate-800">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <span className="text-[10.5px] uppercase tracking-wider font-bold text-slate-100">
            Zone {index + 1}
          </span>
          <span className="text-[10px] text-amber-300/90 font-semibold uppercase tracking-wider">
            · Property
          </span>
          {zone.label ? (
            <span className="text-[10px] text-slate-400 truncate max-w-[160px]">
              · {zone.label}
            </span>
          ) : null}
          <span className="text-[9.5px] text-slate-500 tabular-nums ml-1">
            {matchCount} pin{matchCount === 1 ? "" : "s"}
          </span>
        </div>

        {/* Filter chips — one per listing type. Empty selection = show all. */}
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {PROPERTY_FILTERS.map((f) => {
            const on = activeFilters.includes(f.value);
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => onToggleFilter?.(f.value)}
                className={`text-[10.5px] px-2 py-1 rounded border transition flex items-center gap-1 ${
                  on
                    ? "font-semibold"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                }`}
                style={
                  on
                    ? { borderColor: f.color, background: `${f.color}25`, color: f.color }
                    : undefined
                }
                title={f.label}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            );
          })}
          {activeFilters.length === 0 ? (
            <span className="text-[10px] text-slate-500 italic self-center px-1">
              No filter — showing all types
            </span>
          ) : null}
        </div>

        {/* Add Property — same UX as the previous sidebar button. */}
        <button
          type="button"
          onClick={onAddProperty}
          className={`shrink-0 text-[10.5px] px-2.5 py-1 rounded border transition font-semibold ${
            placeMode
              ? "border-amber-400 bg-amber-500/30 text-amber-100"
              : "border-amber-500/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/30"
          }`}
          title={placeMode ? "Cancel — currently waiting for a map click" : "Drop a custom property in this zone"}
        >
          {placeMode ? "⏳ Click map · Cancel" : "+ Add Property"}
        </button>
      </div>
    </div>
  );
}
