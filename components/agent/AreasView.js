"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ACTIVITY_TYPES, PROPERTIES } from "@/lib/agent/mockProperties";
import { FREE_TIER_MAX_ZONES } from "@/lib/agent/storage";
import { metersBetween } from "@/lib/agent/distance";
import { pickDemoHighlights } from "@/lib/property/suggestedDemos";
import { fillWithSynthetics } from "@/lib/property/synthetic";

const AreaMap = dynamic(() => import("./AreaMap"), { ssr: false });
// Same picker the Property + Business sections use: "Use my current location"
// or "Pick a location on the map". Shown the first time the agent opens
// Working Areas (and only the first time per visit).
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

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

  // Show the LocationPicker the first time this view is opened (unless the
  // agent already has saved zones — they've been here before).
  const [pickerDone, setPickerDone] = useState(() => zones.length > 0);
  function handleLocationChosen(loc) {
    setPickerDone(true);
    // Auto-drop a pending pin at the chosen location so demo properties
    // show up on the map immediately (per the user's #5 priority).
    if (!reachedLimit) {
      setPending({ lat: loc.latitude, lng: loc.longitude });
    }
  }

  const reachedLimit = zones.length >= FREE_TIER_MAX_ZONES;
  const canSave = !!pending && pendingActivities.length > 0 && !reachedLimit;

  // 2–3 suggested hotspots for the most relevant zone on screen:
  //   - while configuring a new pending pin → suggest inside the pending circle
  //   - else if a saved zone is focused → suggest inside that one
  //   - else → no suggestions (avoids clutter when several zones share the map)
  const suggestionTarget = pending
    ? { lat: pending.lat, lng: pending.lng, radius: pendingRadius }
    : focusZone
      ? { lat: focusZone.lat, lng: focusZone.lng, radius: focusZone.radius }
      : null;
  // No more clustered suggestion stars — we highlight 1–2 random property pins
  // inside each visible zone with a gold halo so the user immediately sees demo
  // candidates to click into. Computed after visibleProperties so we can pick from
  // exactly what's on screen.

  // Property markers visible on the map. Strategy:
  //   - While a pin is pending → show properties inside the pending circle
  //     (filtered by the activities the agent has tick-boxed for the new zone),
  //     topped up with synthetic demos so the user always sees at least 3.
  //   - Else → show properties for EVERY saved zone (each zone's activities apply),
  //     also topped up with synthetics per zone.
  const TARGET_PER_ZONE = 3;
  const visibleProperties = useMemo(() => {
    if (pending) {
      const real = PROPERTIES.filter((p) => {
        const inRadius = metersBetween(p.lat, p.lng, pending.lat, pending.lng) <= pendingRadius;
        if (!inRadius) return false;
        if (pendingActivities.length === 0) return true;
        const acts = p.activities || [];
        return pendingActivities.some((a) => acts.includes(a));
      });
      return fillWithSynthetics({
        properties: real,
        center: { lat: pending.lat, lng: pending.lng },
        radius: pendingRadius,
        target: TARGET_PER_ZONE,
        seed: `pending|${pending.lat.toFixed(4)},${pending.lng.toFixed(4)},${pendingRadius}`,
        activeFilters: pendingActivities,
      });
    }
    if (!zones || zones.length === 0) return [];
    const seen = new Set();
    const out = [];
    for (const z of zones) {
      const zoneActs = z.activities || [];
      const real = [];
      for (const p of PROPERTIES) {
        if (seen.has(p.id)) continue;
        const inRadius = metersBetween(p.lat, p.lng, z.lat, z.lng) <= z.radius;
        if (!inRadius) continue;
        const acts = p.activities || [];
        if (zoneActs.length > 0 && !zoneActs.some((a) => acts.includes(a))) continue;
        seen.add(p.id);
        real.push(p);
      }
      const filled = fillWithSynthetics({
        properties: real,
        center: { lat: z.lat, lng: z.lng },
        radius: z.radius,
        target: TARGET_PER_ZONE,
        seed: `zone|${z.id}|${z.radius}`,
        activeFilters: zoneActs,
      });
      for (const p of filled) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
      }
    }
    return out;
  }, [
    zones,
    pending,
    pendingRadius,
    pendingActivities.join(","),
  ]);

  // ---- User-controlled selection ----
  // The set of property IDs the user has currently ticked in the sidebar
  // checklist. Only these render as pins on the map.
  // When the pending pin / its radius / its activities change, we auto-tick
  // 2–3 random demo properties from inside the radius so the agent always
  // sees dummies appear the moment they click the map.
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    if (!visibleProperties || visibleProperties.length === 0) {
      setSelectedIds(new Set());
      return;
    }
    // Default seed based on the current "active context":
    //   - pending pin → seed off its coords+radius
    //   - else (browsing saved zones) → seed off the list of zone IDs
    const seed = pending
      ? `${pending.lat.toFixed(4)},${pending.lng.toFixed(4)},${pendingRadius}`
      : zones.map((z) => z.id).join("|");
    const effectiveRadius = pending ? pendingRadius : (focusZone?.radius || 1000);
    setSelectedIds(pickDemoHighlights(visibleProperties, effectiveRadius, seed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pending?.lat, pending?.lng, pendingRadius, pendingActivities.join(","),
    zones.map((z) => z.id).join("|"),
    focusZone?.id,
  ]);

  function toggleSelected(propertyId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  }

  // Properties actually rendered as pins on the map.
  const mapProperties = visibleProperties.filter((p) => selectedIds.has(p.id));

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

  // Gate: ask the agent where they want to work first (matches Business + Property).
  if (!pickerDone) {
    return <LocationPicker onLocationChosen={handleLocationChosen} />;
  }

  return (
    <div className="flex h-full">
      {/* Left config rail (was on the right — moved to match the Property
          section so radius + property checklist always live on the LEFT). */}
      <div className="w-[340px] shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
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

        {/* ---- Properties in this area — checkbox list ----
            Toggling adds/removes the matching pin on the map in real time. */}
        <PropertyChecklist
          properties={visibleProperties}
          selectedIds={selectedIds}
          onToggle={toggleSelected}
          contextLabel={pending ? "in this new zone" : (zones.length > 0 ? "across your saved zones" : null)}
        />

        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Saved zones · {zones.length}
          </div>
        </div>

        <div className="overflow-y-auto scrollbar-thin px-4 py-3 space-y-2 max-h-64">
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

      {/* Map (flex-1) */}
      <div className="flex-1 relative">
        <AreaMap
          savedZones={zones}
          pending={pending}
          pendingRadius={pendingRadius}
          focusZone={focusZone}
          properties={mapProperties}
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
    </div>
  );
}

// Checkbox list of properties currently in scope. Tapping a row toggles its pin
// on/off the map instantly — the parent owns the `selectedIds` Set.
function PropertyChecklist({ properties, selectedIds, onToggle, contextLabel }) {
  const onCount = [...(selectedIds || [])].filter((id) => properties.some((p) => p.id === id)).length;
  return (
    <div className="px-4 py-3 border-b border-slate-800">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Properties {contextLabel ? <span className="text-slate-500 normal-case tracking-normal">· {contextLabel}</span> : null} · {properties.length}
        </div>
        {properties.length > 0 ? (
          <span className="text-[10px] text-cyan-300 tabular-nums">{onCount} on map</span>
        ) : null}
      </div>
      {properties.length === 0 ? (
        <div className="text-[10.5px] text-slate-500 italic">
          {contextLabel ? "No matches for the current activities — try ticking more." : "Drop a pin to see properties appear here."}
        </div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin pr-1">
          {properties.map((p) => {
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
                onClick={() => onToggle?.(p.id)}
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
                <div className="flex-1 min-w-0">
                  <div className="text-[11.5px] font-medium text-slate-100 truncate">{p.title}</div>
                  <div className="text-[9.5px] text-slate-500 truncate">{p.building} · {p.area}</div>
                </div>
                <span className="text-[10.5px] text-amber-300 font-semibold tabular-nums shrink-0">
                  {priceText}
                </span>
              </button>
            );
          })}
        </div>
      )}
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
