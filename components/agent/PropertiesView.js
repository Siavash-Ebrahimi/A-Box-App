"use client";

import { useMemo, useState } from "react";
import PropertyCard from "./PropertyCard";
import {
  PROPERTIES,
  PROPERTY_AREAS,
  PROPERTY_TYPES,
} from "@/lib/agent/mockProperties";
import { filterPropertiesByZones } from "@/lib/agent/distance";

export default function PropertiesView({
  zones,
  favourites,
  onToggleFavourite,
  onSendToAI,
}) {
  const [filterListing, setFilterListing] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [scope, setScope] = useState(zones.length > 0 ? "zones" : "all");

  const list = useMemo(() => {
    const base =
      scope === "zones" && zones.length > 0
        ? filterPropertiesByZones(PROPERTIES, zones)
        : PROPERTIES.map((p) => ({ ...p, distance: null, matchedZone: null }));
    return base.filter((p) => {
      if (filterListing !== "all" && p.listing !== filterListing) return false;
      if (filterType !== "all" && p.type !== filterType) return false;
      if (filterArea !== "all" && p.area !== filterArea) return false;
      return true;
    });
  }, [scope, zones, filterListing, filterType, filterArea]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex flex-wrap gap-2 items-center">
        <Toggle label="In my zones" active={scope === "zones"} disabled={zones.length === 0} onClick={() => setScope("zones")} />
        <Toggle label="All Dubai" active={scope === "all"} onClick={() => setScope("all")} />
        <span className="mx-1 text-slate-700">·</span>
        <Pill label="Listing" value={filterListing} onChange={setFilterListing} options={[
          { value: "all", label: "All" },
          { value: "sale", label: "For sale" },
          { value: "rent", label: "For rent" },
        ]}/>
        <Pill label="Type" value={filterType} onChange={setFilterType} options={[
          { value: "all", label: "All types" },
          ...PROPERTY_TYPES.map((t) => ({ value: t.value, label: t.label })),
        ]}/>
        <Pill label="Area" value={filterArea} onChange={setFilterArea} options={[
          { value: "all", label: "All areas" },
          ...PROPERTY_AREAS.map((a) => ({ value: a, label: a })),
        ]}/>
        <span className="ml-auto text-[11px] text-slate-400 tabular-nums">{list.length} properties</span>
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
        {list.length === 0 ? (
          <div className="text-sm text-slate-500 leading-relaxed text-center max-w-md mx-auto mt-12">
            No properties match these filters.
            {scope === "zones" && zones.length === 0 ? (
              <div className="mt-3">
                <span className="text-cyan-300">Tip:</span> save a working zone on the map first,
                then properties inside that zone will appear here.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                isFavourite={favourites.has(p.id)}
                onToggleFavourite={() => onToggleFavourite(p.id)}
                onSendToAI={() => onSendToAI(p)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, active, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-[11px] px-2.5 py-1 rounded border transition ${
        active
          ? "border-amber-500 bg-amber-500/15 text-amber-200"
          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {label}
    </button>
  );
}

function Pill({ label, value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[11px] bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
      aria-label={label}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{label}: {o.label}</option>
      ))}
    </select>
  );
}
