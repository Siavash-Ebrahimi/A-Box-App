"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ACTIVITY_TYPES } from "@/lib/agent/mockProperties";
import { FREE_TIER_MAX_ZONES } from "@/lib/agent/storage";

const AreaMap = dynamic(() => import("./AreaMap"), { ssr: false });

const RADIUS_PRESETS = [
  { value: 500,  label: "500 m"  },
  { value: 1000, label: "1 km"   },
  { value: 1500, label: "1.5 km" },
];

export default function AreasView({ zones, onAddZone, onRemoveZone, focusZoneId, onClearFocus }) {
  const focusZone = focusZoneId ? zones.find((z) => z.id === focusZoneId) : null;
  // Auto-clear focus on unmount so navigating away and back doesn't re-fly to the same zone.
  useEffect(() => {
    if (focusZoneId) {
      const t = setTimeout(() => onClearFocus?.(), 800);
      return () => clearTimeout(t);
    }
  }, [focusZoneId, onClearFocus]);
  const [pending, setPending] = useState(null);
  const [pendingRadius, setPendingRadius] = useState(1000);
  const [pendingLabel, setPendingLabel] = useState("");
  const [customRadius, setCustomRadius] = useState("");
  const [pendingActivities, setPendingActivities] = useState(["sell", "buy", "rent"]);

  const reachedLimit = zones.length >= FREE_TIER_MAX_ZONES;
  const canSave = !!pending && pendingActivities.length > 0 && !reachedLimit;

  function handleCancel() {
    setPending(null);
    setPendingLabel("");
    setCustomRadius("");
    setPendingActivities(["sell", "buy", "rent"]);
  }
  function handleSave() {
    if (!canSave) return;
    onAddZone({
      lat: pending.lat,
      lng: pending.lng,
      radius: pendingRadius,
      label: pendingLabel.trim() || `Zone ${zones.length + 1}`,
      activities: pendingActivities,
    });
    handleCancel();
  }
  function toggleActivity(value) {
    setPendingActivities((curr) =>
      curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value],
    );
  }

  return (
    <div className="flex h-full">
      {/* Map */}
      <div className="flex-1 relative">
        <AreaMap
          savedZones={zones}
          pending={pending}
          pendingRadius={pendingRadius}
          focusZone={focusZone}
          onPick={(p) => !reachedLimit && setPending(p)}
        />
        {!pending && zones.length === 0 ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="bg-slate-900/95 border border-cyan-500/40 rounded-lg shadow-2xl px-4 py-2.5 backdrop-blur">
              <span className="text-xs text-cyan-300 font-semibold">
                Click anywhere on the map to drop your first working zone
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Right config rail */}
      <div className="w-[340px] shrink-0 border-l border-slate-800 bg-slate-950 flex flex-col">
        {/* Plan / quota banner */}
        <PlanBanner used={zones.length} limit={FREE_TIER_MAX_ZONES} />

        {pending && !reachedLimit ? (
          <div className="p-4 border-b border-slate-800 overflow-y-auto scrollbar-thin">
            <div className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold mb-2">
              New working zone
            </div>
            <div className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              {pending.lat.toFixed(4)}, {pending.lng.toFixed(4)} — drag the pin by clicking
              somewhere else on the map.
            </div>

            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
              Label
            </label>
            <input
              type="text"
              value={pendingLabel}
              onChange={(e) => setPendingLabel(e.target.value)}
              placeholder="e.g. Marina patch"
              className="w-full mb-3 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
            />

            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
              Radius
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {RADIUS_PRESETS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => { setPendingRadius(r.value); setCustomRadius(""); }}
                  className={`text-[11px] py-1.5 rounded border transition ${
                    pendingRadius === r.value && !customRadius
                      ? "border-amber-500 bg-amber-500/15 text-amber-200"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                min="100"
                max="20000"
                value={customRadius}
                onChange={(e) => {
                  setCustomRadius(e.target.value);
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v >= 100 && v <= 20000) setPendingRadius(v);
                }}
                placeholder="Custom (m)"
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
              />
              <span className="text-[11px] text-slate-500 self-center">
                {(pendingRadius / 1000).toFixed(2)} km
              </span>
            </div>

            {/* Activity multi-select — what should this zone surface? */}
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
              Activities · {pendingActivities.length} selected
            </label>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {ACTIVITY_TYPES.map((a) => {
                const on = pendingActivities.includes(a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => toggleActivity(a.value)}
                    className={`text-[11px] px-2 py-1.5 rounded border flex items-center gap-1.5 transition ${
                      on
                        ? `${a.color} font-semibold`
                        : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    <span>{a.icon}</span>
                    <span>{a.label}</span>
                  </button>
                );
              })}
            </div>
            {pendingActivities.length === 0 ? (
              <div className="text-[10px] text-amber-300/80 mb-2">
                Pick at least one activity — that determines what shows in this zone.
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="flex-1 px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Save zone
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-2 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {reachedLimit ? <GoldUpsell zonesUsed={zones.length} limit={FREE_TIER_MAX_ZONES} /> : null}

        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Saved zones · {zones.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-2">
          {zones.length === 0 ? (
            <div className="text-[11px] text-slate-500 leading-relaxed">
              No zones yet. Click the map to drop a pin, choose a radius and activities, then
              save. You can have up to {FREE_TIER_MAX_ZONES} zones on the free plan.
            </div>
          ) : (
            zones.map((z, i) => <ZoneCard key={z.id} z={z} index={i} onRemove={() => onRemoveZone(z.id)} />)
          )}
        </div>
      </div>
    </div>
  );
}

function PlanBanner({ used, limit }) {
  const atLimit = used >= limit;
  return (
    <div
      className={[
        "px-4 py-3 border-b text-xs leading-snug",
        atLimit ? "border-amber-500/40 bg-amber-500/10" : "border-slate-800 bg-slate-900/60",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
          Free
        </span>
        <span className={atLimit ? "text-amber-200 font-semibold" : "text-slate-200"}>
          {used} of {limit} zones used
        </span>
      </div>
      <div className="text-[11px] text-slate-400">
        Free plan includes {limit} working zones. Upgrade to <span className="text-amber-300 font-semibold">Gold</span> for unlimited zones.
      </div>
    </div>
  );
}

function GoldUpsell({ zonesUsed, limit }) {
  return (
    <div className="m-4 p-4 rounded-lg border border-amber-500/50 bg-gradient-to-br from-amber-500/15 to-amber-700/5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.15em] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-slate-900">
          Gold
        </span>
        <span className="text-sm font-semibold text-amber-200">Unlock unlimited zones</span>
      </div>
      <div className="text-[11.5px] text-slate-300 leading-relaxed mb-3">
        You've used all {limit} free working zones. Upgrade to a Gold membership for
        unlimited zones across Dubai, plus priority AI processing and partner-network
        access.
      </div>
      <button
        type="button"
        onClick={() => alert("Gold membership is launching soon. Talk to your A-Box rep to be notified.")}
        className="w-full px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-xs transition"
      >
        ⭐ Upgrade to Gold
      </button>
      <div className="text-[10px] text-slate-500 mt-2">
        Or remove one of your existing zones below to free up a slot.
      </div>
    </div>
  );
}

function ZoneCard({ z, index, onRemove }) {
  const palette = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899"];
  const acts = z.activities || [];
  const labels = ACTIVITY_TYPES.filter((a) => acts.includes(a.value));
  return (
    <div className="p-2.5 rounded border border-slate-700 bg-slate-900/50">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: palette[index % palette.length] }}
        />
        <span className="text-xs font-medium text-slate-100 truncate flex-1">
          {z.label}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] text-slate-500 hover:text-red-400 transition"
          title="Remove zone"
        >
          ✕
        </button>
      </div>
      <div className="text-[10px] text-slate-500 mt-1 tabular-nums">
        {z.lat.toFixed(4)}, {z.lng.toFixed(4)} · {(z.radius / 1000).toFixed(2)} km
      </div>
      {labels.length > 0 ? (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {labels.map((a) => (
            <span
              key={a.value}
              className={`text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${a.color}`}
            >
              {a.icon} {a.label}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-slate-500 mt-1.5 italic">All activities</div>
      )}
    </div>
  );
}
