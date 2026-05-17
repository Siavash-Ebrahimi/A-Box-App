"use client";

// Top ribbon of the i-Case canvas. Shows EVERY zone the agent has saved.
// Each zone is itself a draggable card (drag-as-whole-zone) and has a
// chevron that pops a subcategory tray.
//
// The subcategory tray is PORTAL-MOUNTED to document.body so it isn't
// clipped by the ribbon's horizontal-scroll container (the previous bug
// the user reported — the tray was being cut off by `overflow-x: auto`).
//
// The tray surfaces every property + every business pin physically inside
// the zone (built-in mock catalogue + user-added + favourited), with a ★
// chip marking the agent's favourites. This way the tray is never empty
// even before the agent has starred anything on the map.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { metersBetween } from "@/lib/agent/distance";

const ZONE_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899"];

export default function FlowZoneRibbon({
  zones = [],
  allProperties = [],         // PROPERTIES + userProperties (every pin available)
  favouriteIds,               // Set<propertyId> — for ★ badge
  savedRecsByZone = {},       // per-zone favourited recommendations
  userBusinesses = [],        // custom Add-Business pins
  onAutoAddToCase,            // (zoneId) => void
}) {
  const [openZone, setOpenZone] = useState(null);   // { zoneId, rect }

  // Close the tray on scroll / resize so we never have a stale-position popup.
  useEffect(() => {
    if (!openZone) return;
    function close() { setOpenZone(null); }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openZone]);

  // Also close on Escape or an outside click.
  useEffect(() => {
    if (!openZone) return;
    function onKey(e) { if (e.key === "Escape") setOpenZone(null); }
    function onDocClick(e) {
      if (e.target.closest?.("[data-flowribbon-tray]")) return;
      if (e.target.closest?.("[data-flowribbon-trigger]")) return;
      setOpenZone(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDocClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDocClick);
    };
  }, [openZone]);

  if (zones.length === 0) {
    return (
      <div className="px-3 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold shrink-0">
          Zones
        </span>
        <span className="text-[11px] text-slate-400">
          You have no working zones yet — open <strong className="text-amber-300">Working Areas</strong> to drop one, then come back.
        </span>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-800 bg-slate-900/60 overflow-x-auto scrollbar-thin">
      <div className="px-3 py-2 flex items-stretch gap-2 min-h-[88px]">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold self-center shrink-0 mr-1">
          Zones
        </div>

        {zones.map((z, i) => {
          const color = ZONE_PALETTE[i % ZONE_PALETTE.length];
          const inZone = inZoneItems({ zone: z, allProperties, favouriteIds, savedRecsByZone, userBusinesses });
          const isOpen = openZone?.zoneId === z.id;
          return (
            <ZoneTileWithTrigger
              key={z.id}
              zone={z}
              index={i}
              color={color}
              counts={inZone.counts}
              isOpen={isOpen}
              onOpen={(rect) => setOpenZone({ zoneId: z.id, rect, i })}
              onClose={() => setOpenZone(null)}
              onAutoAdd={() => onAutoAddToCase?.(z.id)}
            />
          );
        })}
      </div>

      {/* Portal-mounted tray — escapes the ribbon's overflow-x clipping. */}
      {openZone ? (() => {
        const z = zones.find((zz) => zz.id === openZone.zoneId);
        if (!z) return null;
        const inZone = inZoneItems({ zone: z, allProperties, favouriteIds, savedRecsByZone, userBusinesses });
        const idx = openZone.i;
        return (
          <SubcategoryTrayPortal
            anchorRect={openZone.rect}
            zone={z}
            zoneIndex={idx}
            inZone={inZone}
            onAutoAdd={() => onAutoAddToCase?.(z.id)}
            onClose={() => setOpenZone(null)}
          />
        );
      })() : null}
    </div>
  );
}

// ---- Zone tile + chevron trigger (in-ribbon) ----------------------------

function ZoneTileWithTrigger({ zone, index, color, counts, isOpen, onOpen, onClose, onAutoAdd }) {
  const triggerRef = useRef(null);

  function toggleTray() {
    if (isOpen) { onClose(); return; }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      onOpen(r);
    }
  }

  return (
    <div
      className={`flex items-stretch rounded-lg border bg-slate-900 transition shrink-0 ${
        isOpen ? "border-amber-500 shadow-lg shadow-amber-500/10" : "border-slate-700 hover:border-slate-500"
      }`}
      style={{ minWidth: 220 }}
    >
      <DraggableZoneTile
        zone={zone}
        index={index}
        color={color}
        propsCount={counts.props}
        bizCount={counts.business}
        onAutoAdd={onAutoAdd}
      />
      <button
        ref={triggerRef}
        type="button"
        data-flowribbon-trigger
        onClick={toggleTray}
        className="px-2 border-l border-slate-700 hover:bg-slate-800 transition text-slate-300 hover:text-slate-100"
        title={isOpen ? "Close subcategory tray" : "Open: see properties & businesses inside this zone"}
        aria-label="Toggle zone subcategories"
      >
        {isOpen ? "▴" : "▾"}
      </button>
    </div>
  );
}

function DraggableZoneTile({ zone, index, color, propsCount, bizCount, onAutoAdd }) {
  function handleDragStart(e) {
    try {
      e.dataTransfer.setData(
        "application/x-icase-node",
        JSON.stringify({
          nodeKind: "source", sourceKind: "zone",
          refId: zone.id, zoneId: zone.id,
          label: `Zone ${index + 1} · ${zone.label}`,
          sub: `${propsCount} props · ${bizCount} biz`,
          color: "#a855f7",
        }),
      );
      e.dataTransfer.effectAllowed = "copy";
      onAutoAdd?.();
    } catch {/* ignore */}
  }
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex-1 cursor-grab active:cursor-grabbing px-2.5 py-2 select-none"
      title="Drag this whole zone onto the canvas"
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
        <span className="text-[11.5px] font-semibold text-slate-100">
          Zone {index + 1}
        </span>
        <span className="text-[9.5px] text-slate-500 tabular-nums">
          · {(zone.radius / 1000).toFixed(2)} km
        </span>
      </div>
      <div className="text-[10.5px] text-slate-400 truncate">
        {zone.label || "Working zone"}
      </div>
      <div className="flex items-center gap-2 mt-1 text-[9.5px] text-slate-500">
        <span>🏠 {propsCount}</span>
        <span>🏪 {bizCount}</span>
      </div>
    </div>
  );
}

// ---- Subcategory tray (portal-mounted) ----------------------------------

function SubcategoryTrayPortal({ anchorRect, zone, zoneIndex, inZone, onAutoAdd, onClose }) {
  if (typeof document === "undefined") return null;

  // Compute tray position from the chevron trigger's bounding rect.
  // Default: drop below the trigger, left-aligned with the zone tile.
  const TRAY_WIDTH = 320;
  const TRAY_MAX_HEIGHT = 420;
  const margin = 6;

  const left = Math.min(
    Math.max(8, anchorRect.left - TRAY_WIDTH + anchorRect.width + 40),  // align under the tile-ish
    window.innerWidth - TRAY_WIDTH - 8,
  );
  // Prefer dropping DOWN, but flip up if there's no room.
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const dropDown = spaceBelow >= 220;
  const top = dropDown
    ? anchorRect.bottom + margin
    : Math.max(8, anchorRect.top - TRAY_MAX_HEIGHT - margin);

  return createPortal(
    <div
      data-flowribbon-tray
      className="fixed z-[2000] rounded-lg border border-amber-500/50 bg-slate-950 shadow-2xl flex flex-col"
      style={{ left, top, width: TRAY_WIDTH, maxHeight: TRAY_MAX_HEIGHT }}
    >
      <div className="px-3 py-2 border-b border-slate-800 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold">
            Zone {zoneIndex + 1} · drag onto canvas
          </div>
          <div className="text-[10.5px] text-slate-400 truncate">
            {zone.label || "Working zone"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 text-[14px] leading-none px-1"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-2.5">
        {/* Whole zone shortcut */}
        <DraggableSubItem
          payload={{
            nodeKind: "source", sourceKind: "zone",
            refId: zone.id, zoneId: zone.id,
            label: `Zone ${zoneIndex + 1} · ${zone.label}`,
            sub: `${inZone.props.length} props · ${inZone.business.length} biz`,
            color: "#a855f7",
          }}
          onAutoAdd={onAutoAdd}
          icon="📍"
          iconBg="#a855f7"
          title="Whole zone (all items)"
          sub={`${inZone.props.length} properties · ${inZone.business.length} businesses`}
        />

        {/* PROPERTIES — every pin physically inside this zone */}
        <section>
          <div className="text-[9.5px] uppercase tracking-wider text-amber-300 font-semibold px-1 mb-1">
            🏠 Properties · {inZone.props.length}
          </div>
          {inZone.props.length === 0 ? (
            <div className="text-[10.5px] text-slate-500 italic px-2 py-1.5">
              No property pins inside this zone yet. Open the Property section's map to drop one.
            </div>
          ) : (
            inZone.props.map((p) => (
              <DraggableSubItem
                key={p.id}
                payload={{
                  nodeKind: "source", sourceKind: "property",
                  refId: p.id, zoneId: zone.id,
                  label: p.title,
                  sub: p.building || p.area || "",
                  color: "#f59e0b",
                }}
                onAutoAdd={onAutoAdd}
                icon="🏠"
                iconBg="#f59e0b"
                title={p.title}
                sub={`${p.building || ""}${p.area ? ` · ${p.area}` : ""}`}
                right={priceShort(p)}
                rightColor="#fbbf24"
                badge={p._isFavourite ? "★" : null}
              />
            ))
          )}
        </section>

        {/* BUSINESSES — user-added pins + favourited recommendations from
            the per-zone Business analysis */}
        <section>
          <div className="text-[9.5px] uppercase tracking-wider text-cyan-300 font-semibold px-1 mb-1">
            🏪 Businesses · {inZone.business.length}
          </div>
          {inZone.business.length === 0 ? (
            <div className="text-[10.5px] text-slate-500 italic px-2 py-1.5">
              No saved businesses or recommendations from this zone yet. Run the Business layer on the map and ★ a recommendation, or use Add Business.
            </div>
          ) : (
            inZone.business.map((b) => (
              <DraggableSubItem
                key={`${b._kind}-${b.id}`}
                payload={
                  b._kind === "user_business"
                    ? {
                      nodeKind: "source", sourceKind: "property", // user businesses ride the property channel
                      refId: b.id, zoneId: zone.id,
                      label: b.name,
                      sub: b.category || "Custom business",
                      color: "#06b6d4",
                    }
                    : {
                      nodeKind: "source", sourceKind: "recommendation",
                      refId: b.id, zoneId: zone.id,
                      label: b.street,
                      sub: `${b.tier?.toUpperCase()} · ${Math.round(b.score)}`,
                      color: "#06b6d4",
                    }
                }
                onAutoAdd={onAutoAdd}
                icon={b._kind === "user_business" ? "🏪" : "★"}
                iconBg="#06b6d4"
                title={b._kind === "user_business" ? b.name : b.street}
                sub={b._kind === "user_business" ? (b.category || "Custom business") : `Score ${Math.round(b.score)}`}
                right={b._kind === "user_business" ? null : b.tier?.[0]?.toUpperCase()}
                rightColor="#22d3ee"
                badge={b._kind === "rec" ? "★" : null}
              />
            ))
          )}
        </section>
      </div>
    </div>,
    document.body,
  );
}

// ---- One subcategory row inside the tray --------------------------------

function DraggableSubItem({ payload, icon, iconBg, title, sub, right, rightColor, badge, onAutoAdd }) {
  function handleDragStart(e) {
    try {
      e.dataTransfer.setData("application/x-icase-node", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "copy";
      onAutoAdd?.();
    } catch {/* ignore */}
  }
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab active:cursor-grabbing flex items-center gap-2 px-2 py-1.5 rounded border border-slate-800 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900 transition select-none mb-1"
      title="Drag this onto the canvas"
    >
      <span
        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-slate-900 font-bold text-[11px]"
        style={{ background: iconBg }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-slate-100 truncate flex items-center gap-1">
          {title}
          {badge ? (
            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
              {badge} saved
            </span>
          ) : null}
        </div>
        {sub ? <div className="text-[9.5px] text-slate-500 truncate">{sub}</div> : null}
      </div>
      {right ? (
        <div className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color: rightColor || "#cbd5e1" }}>
          {right}
        </div>
      ) : null}
    </div>
  );
}

// ---- Helpers ------------------------------------------------------------

// Build the in-zone lists for the tray.
// - props: every property pin (built-in + user-added) physically inside the
//   zone radius. Favourited ones get _isFavourite so the row can show a ★.
// - business: user-added businesses inside the radius, plus per-zone
//   favourited recommendation stars (tagged with _kind so the row knows
//   which payload shape to emit).
function inZoneItems({ zone, allProperties, favouriteIds, savedRecsByZone, userBusinesses }) {
  const props = (allProperties || []).filter(
    (p) => typeof p.lat === "number" && typeof p.lng === "number"
      && metersBetween(p.lat, p.lng, zone.lat, zone.lng) <= zone.radius,
  ).map((p) => ({ ...p, _isFavourite: !!favouriteIds?.has(p.id) }));

  const ubs = (userBusinesses || []).filter(
    (b) => typeof b.lat === "number" && typeof b.lng === "number"
      && metersBetween(b.lat, b.lng, zone.lat, zone.lng) <= zone.radius,
  ).map((b) => ({ ...b, _kind: "user_business" }));

  const recs = (savedRecsByZone?.[zone.id] || []).map((r) => ({ ...r, _kind: "rec" }));

  return {
    props,
    business: [...ubs, ...recs],
    counts: {
      props: props.length,
      business: ubs.length + recs.length,
    },
  };
}

function priceShort(p) {
  if (!p?.price) return "—";
  if (p.listing === "rent") return `${Math.round(p.price / 1000)}K/y`;
  if (p.price >= 1_000_000) return `${(p.price / 1_000_000).toFixed(1)}M`;
  return `${Math.round(p.price / 1000)}K`;
}
