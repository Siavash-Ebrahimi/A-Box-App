"use client";

// One ribbon for a zone's Business layer. Sits below the Property ribbons at
// the top of the map (rendered by ZoneRibbonsStack). Mirrors the Business
// section's analyse flow (Controls.js → /api/analyze → enrich), but compressed
// into a single horizontal bar.
//
// The actual API plumbing lives in AreasView — this component is purely
// presentational + click handlers.

// Same category list as components/Controls.js — kept inline so the ribbon
// stays self-contained.
export const BUSINESS_CATEGORIES = [
  { value: "mens_salon", label: "Men's Salon" },
  { value: "barber_shop", label: "Barber Shop" },
  { value: "bakery", label: "Bakery" },
  { value: "coffee_shop", label: "Coffee Shop" },
  { value: "clothing_store", label: "Clothing Store" },
  { value: "restaurant", label: "Restaurant" },
  { value: "grocery_store", label: "Grocery Store" },
  { value: "pharmacy", label: "Pharmacy" },
];

export default function BusinessRibbon({
  zone,
  index,
  color,
  category,
  onCategoryChange,
  result,
  loading,
  onAnalyze,
  onViewReport,
  onAddBusiness,
  placeMode = false,
}) {
  const tierCounts = result
    ? {
        gold: (result.gold || []).length,
        silver: (result.silver || []).length,
        bronze: (result.bronze || []).length,
      }
    : null;
  const enriching = !!(result && (result.loadingOverview || result.loadingDetails));

  return (
    <div className="bg-slate-950/95 backdrop-blur border border-cyan-500/40 rounded-lg shadow-xl">
      <div className="px-3 py-2 flex items-center gap-2.5 flex-wrap">
        {/* Zone label */}
        <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-slate-800">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <span className="text-[10.5px] uppercase tracking-wider font-bold text-slate-100">
            Zone {index + 1}
          </span>
          <span className="text-[10px] text-cyan-300/90 font-semibold uppercase tracking-wider">
            · Business
          </span>
          {zone.label ? (
            <span className="text-[10px] text-slate-400 truncate max-w-[160px]">
              · {zone.label}
            </span>
          ) : null}
        </div>

        {/* Category select + Analyse button */}
        <label className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
          <span className="uppercase tracking-wider font-semibold text-slate-500">For</span>
          <select
            value={category || "mens_salon"}
            onChange={(e) => onCategoryChange?.(e.target.value)}
            disabled={loading}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10.5px] text-slate-200 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
          >
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading}
          className="text-[10.5px] px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "🔄 Analysing…"
            : result
              ? "↻ Re-analyse"
              : "▶ Analyse streets"}
        </button>

        {/* Add Business — drops a custom business pin (competitor / partner /
            etc.) inside this zone. Mirrors the Property ribbon's Add Property
            button. */}
        <button
          type="button"
          onClick={onAddBusiness}
          className={`text-[10.5px] px-2.5 py-1 rounded border transition font-semibold ${
            placeMode
              ? "border-cyan-300 bg-cyan-500/30 text-cyan-100"
              : "border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/25"
          }`}
          title={placeMode ? "Cancel — currently waiting for a map click" : "Drop a custom business pin inside this zone"}
        >
          {placeMode ? "⏳ Click map · Cancel" : "+ Add Business"}
        </button>

        {/* Tier counts — appear once Phase 1 returns. */}
        {tierCounts ? (
          <div className="flex items-center gap-2 text-[11px] text-slate-200 px-2 border-l border-slate-800">
            <span title="Gold streets">🥇 {tierCounts.gold}</span>
            <span title="Silver streets">🥈 {tierCounts.silver}</span>
            <span title="Bronze streets">🥉 {tierCounts.bronze}</span>
            {enriching ? (
              <span className="text-[9.5px] text-cyan-300/80 italic ml-1">
                AI report writing…
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Error (if any) */}
        {result?.error ? (
          <span className="text-[10px] text-red-300 italic">
            {result.error}
          </span>
        ) : null}

        {/* View Report — opens a modal with AnalysisPieChart + 4 sections. */}
        {result && !result.error ? (
          <button
            type="button"
            onClick={onViewReport}
            className="ml-auto shrink-0 text-[10.5px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition font-semibold"
            title="Open the full Gold/Silver/Bronze report + AI analysis"
          >
            View full report →
          </button>
        ) : null}
      </div>
    </div>
  );
}
