"use client";

// One collapsible "drawer" card per saved working zone. Each zone is itself a
// drawer (expand/collapse via the header chevron), and inside it the Property
// + Business sections each get their OWN drawer chevron on the right — so the
// agent can independently collapse a section's body once they're done with it.
//
// Per the latest spec:
//   - No more "X in this zone" property checklist.
//   - Each layer's expanded body contains an "Add Property" / "Add Business"
//     button (and, for Business, a one-line status of the latest analysis).

export const ZONE_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899"];

export default function ZoneLayerDrawer({
  zone,
  index,
  layer,
  businessResult,
  businessLoading = false,
  selected = false,
  editingLocation = false,
  onSelectZone,
  onEditZone,
  onCancelEditZone,
  onToggleExpanded,
  onTogglePropertyLayer,
  onToggleBusinessLayer,
  onTogglePropertyDrawer,
  onToggleBusinessDrawer,
  onAddProperty,
  onAddBusiness,
  onAnalyzeBusiness,
  onViewBusinessReport,
  onRemoveZone,
  onFocusZone,
}) {
  const color = ZONE_PALETTE[index % ZONE_PALETTE.length];

  return (
    <div
      className={`rounded-lg border overflow-hidden transition ${
        selected
          ? "border-amber-400 bg-amber-500/5 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]"
          : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
      }`}
    >
      {/* Zone header. The whole row (except the action buttons on the right)
          is a "select this zone" button — single-click selects the zone, which
          drives single-zone ribbon focus on the map. */}
      <div
        className={`px-3 py-2 flex items-center gap-2 border-b ${
          selected ? "bg-amber-500/15 border-amber-500/30" : "bg-slate-900/60 border-slate-800"
        }`}
      >
        <button
          type="button"
          onClick={onToggleExpanded}
          className="text-slate-400 hover:text-slate-200 text-[12px] w-4 shrink-0"
          aria-label={layer.expanded ? "Collapse zone" : "Expand zone"}
        >
          {layer.expanded ? "▾" : "▸"}
        </button>
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
        <button
          type="button"
          onClick={onSelectZone}
          className="flex-1 text-left min-w-0 transition"
          title={selected ? "This zone is selected — click again to deselect" : "Select this zone (only its ribbons will appear on the map)"}
        >
          <div className={`text-[12.5px] font-semibold truncate ${selected ? "text-amber-200" : "text-slate-100"}`}>
            {selected ? "✓ " : ""}Zone {index + 1}
            {zone.label ? <span className={`font-normal ${selected ? "text-amber-300/80" : "text-slate-400"}`}> · {zone.label}</span> : null}
          </div>
          <div className="text-[10px] text-slate-500 truncate tabular-nums">
            {(zone.radius / 1000).toFixed(2)} km
            {zone.addressLabel ? <span className="ml-1">· {zone.addressLabel}</span> : null}
          </div>
        </button>
        {/* Action cluster on the right: focus, edit, remove. */}
        <button
          type="button"
          onClick={onFocusZone}
          className="text-slate-500 hover:text-cyan-300 px-1 transition text-[12px] shrink-0"
          title="Fly to this zone"
          aria-label="Focus zone on map"
        >
          ⌖
        </button>
        <button
          type="button"
          onClick={editingLocation ? onCancelEditZone : onEditZone}
          className={`px-1 transition text-[12px] shrink-0 ${
            editingLocation ? "text-amber-300" : "text-slate-500 hover:text-amber-300"
          }`}
          title={editingLocation ? "Cancel edit · click somewhere else on the map to abort" : "Edit zone location — next map click relocates the pin"}
          aria-label="Edit zone location"
        >
          ✎
        </button>
        <button
          type="button"
          onClick={onRemoveZone}
          className="text-slate-500 hover:text-red-400 px-1 transition text-[12px] shrink-0"
          title="Remove this zone"
          aria-label="Remove zone"
        >
          ✕
        </button>
      </div>

      {layer.expanded ? (
        <div className="p-2 space-y-2">
          {editingLocation ? (
            <div className="p-2 rounded border border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-200 leading-snug">
              ✎ <strong>Edit mode</strong> — click anywhere on the map to move this
              zone's centre. Click ✎ again to cancel.
            </div>
          ) : null}
          {/* PROPERTY layer ----------------------------------------------- */}
          <LayerRow
            label="Property"
            icon="🏠"
            color="#f59e0b"
            on={layer.propertyOn}
            onChangeOn={onTogglePropertyLayer}
            drawerOpen={layer.propertyDrawerOpen}
            onToggleDrawer={onTogglePropertyDrawer}
            hint={layer.propertyOn ? "Pin map + filter ribbon" : "Tick to surface the Property ribbon"}
          />
          {layer.propertyDrawerOpen ? (
            <div className="ml-6 pl-2 border-l border-slate-800 space-y-1.5">
              <button
                type="button"
                onClick={onAddProperty}
                disabled={!layer.propertyOn}
                className="w-full text-[11px] font-semibold px-3 py-1.5 rounded border transition disabled:opacity-50 disabled:cursor-not-allowed border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                title={layer.propertyOn ? "Drop a custom property inside this zone" : "Turn on the Property layer first"}
              >
                + Add Property
              </button>
              {!layer.propertyOn ? (
                <div className="text-[10px] text-slate-500 italic px-1">
                  Activate the Property layer above to surface the ribbon and start dropping pins.
                </div>
              ) : null}
            </div>
          ) : null}

          {/* BUSINESS layer ----------------------------------------------- */}
          <LayerRow
            label="Business"
            icon="📊"
            color="#06b6d4"
            on={layer.businessOn}
            onChangeOn={onToggleBusinessLayer}
            drawerOpen={layer.businessDrawerOpen}
            onToggleDrawer={onToggleBusinessDrawer}
            hint={layer.businessOn ? "Gold/Silver/Bronze ranking" : "Tick to surface the Business ribbon"}
          />
          {layer.businessDrawerOpen ? (
            <div className="ml-6 pl-2 border-l border-slate-800 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onAddBusiness}
                  disabled={!layer.businessOn}
                  className="text-[11px] font-semibold px-2 py-1.5 rounded border transition disabled:opacity-50 disabled:cursor-not-allowed border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                  title={layer.businessOn ? "Drop a custom business pin inside this zone" : "Turn on the Business layer first"}
                >
                  + Add Business
                </button>
                <button
                  type="button"
                  onClick={onAnalyzeBusiness}
                  disabled={!layer.businessOn || businessLoading}
                  className="text-[11px] font-semibold px-2 py-1.5 rounded border transition disabled:opacity-50 disabled:cursor-not-allowed border-cyan-500/40 bg-slate-900 text-cyan-200 hover:bg-cyan-500/15"
                  title="Run the Gold/Silver/Bronze street analysis for this zone"
                >
                  {businessLoading ? "Analysing…" : businessResult ? "↻ Re-analyse" : "▶ Analyse"}
                </button>
              </div>
              <BusinessStatus result={businessResult} onViewReport={onViewBusinessReport} />
              {!layer.businessOn ? (
                <div className="text-[10px] text-slate-500 italic px-1">
                  Activate the Business layer above to surface the ribbon.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// One LAYER row inside the zone drawer. Has TWO interactive controls:
//   1. The big checkbox row (toggles the layer's visibility / ribbon)
//   2. The little chevron on the right (toggles the per-layer sub-drawer
//      where the Add Property / Add Business buttons live)
function LayerRow({ label, icon, color, on, onChangeOn, drawerOpen, onToggleDrawer, hint }) {
  return (
    <div
      className={`flex items-stretch rounded border transition ${
        on ? "" : "border-slate-800 bg-slate-950 hover:border-slate-600"
      }`}
      style={on ? { background: `${color}15`, borderColor: `${color}55` } : undefined}
    >
      <button
        type="button"
        onClick={() => onChangeOn?.(!on)}
        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left"
        style={on ? { color } : undefined}
        title={`${on ? "Hide" : "Show"} the ${label} ribbon for this zone`}
      >
        <span
          className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-[10px] font-bold ${
            on ? "text-slate-900" : "border-slate-600 text-transparent"
          }`}
          style={on ? { background: color, borderColor: color } : undefined}
        >
          ✓
        </span>
        <span className="text-base shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold">{label}</div>
          {hint ? <div className={`text-[9.5px] ${on ? "opacity-80" : "text-slate-500"}`}>{hint}</div> : null}
        </div>
      </button>
      {/* Per-layer drawer chevron — independent of the layer-on checkbox. */}
      <button
        type="button"
        onClick={onToggleDrawer}
        className="px-2 border-l border-slate-800/60 hover:bg-slate-800/40 transition text-slate-400 hover:text-slate-100 text-[12px]"
        title={drawerOpen ? `Collapse ${label} drawer` : `Expand ${label} drawer`}
        aria-label={drawerOpen ? `Collapse ${label} drawer` : `Expand ${label} drawer`}
      >
        {drawerOpen ? "▾" : "▸"}
      </button>
    </div>
  );
}

// One-line summary of the latest business analysis (tier counts + a button
// to open the full modal report). Shown inside the Business layer drawer.
function BusinessStatus({ result, onViewReport }) {
  if (!result) {
    return (
      <div className="text-[10px] text-slate-500 italic px-1">
        No analysis yet. Pick a category in the ribbon and tap Analyse.
      </div>
    );
  }
  if (result.error) {
    return (
      <div className="text-[10px] text-red-300/90 italic px-1 leading-snug">
        {result.error}
      </div>
    );
  }
  const counts = {
    gold: (result.gold || []).length,
    silver: (result.silver || []).length,
    bronze: (result.bronze || []).length,
  };
  const enriching = !!(result.loadingOverview || result.loadingDetails);
  return (
    <div className="px-1 py-0.5 flex items-center gap-2 text-[11px] text-slate-200">
      <span title="Gold">🥇 {counts.gold}</span>
      <span title="Silver">🥈 {counts.silver}</span>
      <span title="Bronze">🥉 {counts.bronze}</span>
      {enriching ? (
        <span className="text-[9.5px] text-cyan-300/80 italic">AI writing…</span>
      ) : null}
      <button
        type="button"
        onClick={onViewReport}
        className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
      >
        View →
      </button>
    </div>
  );
}
