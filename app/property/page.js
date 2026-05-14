"use client";

// Property discovery + comparison route.
//
// Phases:
//   "picker"  → first land — pick where you want to search
//   "explore" → main map with sidebar filters + property markers
//   "compare" → same map with two area circles + the compare tray (subset of explore)
//
// State lives here; child components are pure presentation.

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import PropertyFilters from "@/components/property/PropertyFilters";
import PropertyDetailCard from "@/components/property/PropertyDetailCard";
import CompareReport from "@/components/property/CompareReport";

// PropertyEntry uses react-leaflet — dynamic-import to avoid SSR (`window` not
// defined) during the static prerender of /property.
const PropertyEntry = dynamic(() => import("@/components/property/PropertyEntry"), { ssr: false });
import { PROPERTIES } from "@/lib/agent/mockProperties";
import { metersBetween } from "@/lib/agent/distance";
import {
  PROPERTY_FILTERS,
  primaryFilterForProperty,
  matchesSelectedFilters,
} from "@/lib/property/filters";

const PropertyMap = dynamic(() => import("@/components/property/PropertyMap"), { ssr: false });

const DEFAULT_RADIUS = 1000;
const DEFAULT_FILTERS = ["rent", "sell"]; // sensible defaults for first paint

export default function PropertyPage() {
  const [phase, setPhase] = useState("picker"); // "picker" | "explore" | "compare"
  const [area1, setArea1] = useState(null);     // { lat, lng, label? }
  const [radius1, setRadius1] = useState(DEFAULT_RADIUS);
  const [filters1, setFilters1] = useState(new Set(DEFAULT_FILTERS));
  const [area2, setArea2] = useState(null);
  const [radius2, setRadius2] = useState(DEFAULT_RADIUS);
  const [filters2, setFilters2] = useState(new Set(DEFAULT_FILTERS));
  const [detailProperty, setDetailProperty] = useState(null);
  const [comparePick1, setComparePick1] = useState(null);
  const [comparePick2, setComparePick2] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  // When the agent clicks "change" for an area, the next map click sets that area.
  // Default to 1 so the very first click on the map after picker also drops Area 1.
  const [pendingAreaSlot, setPendingAreaSlot] = useState(1);
  const [flyTarget, setFlyTarget] = useState(null);

  function goHome() {
    if (typeof window !== "undefined") window.location.href = "/";
  }

  // --- Property filtering: compute matched lists once and reuse ---
  const matched = useMemo(() => {
    const out = { all: [], area1: [], area2: [] };
    for (const p of PROPERTIES) {
      const f = primaryFilterForProperty(p);
      const pp = { ...p, _color: f?.color || "#64748b", _filter: f };
      const inArea1 = area1 && metersBetween(p.lat, p.lng, area1.lat, area1.lng) <= radius1;
      const inArea2 = area2 && metersBetween(p.lat, p.lng, area2.lat, area2.lng) <= radius2;
      const okFilters1 = matchesSelectedFilters(p, filters1);
      const okFilters2 = matchesSelectedFilters(p, filters2);
      if (inArea1 && okFilters1) out.area1.push(pp);
      if (inArea2 && okFilters2) out.area2.push(pp);
    }
    // Compare mode: union of both areas (avoid duplicates if a property happens to
    // fall in both). Explore mode: just area1.
    const seen = new Set();
    out.all = [...out.area1];
    for (const p of out.all) seen.add(p.id);
    if (phase === "compare") {
      for (const p of out.area2) if (!seen.has(p.id)) { out.all.push(p); seen.add(p.id); }
    }
    return out;
  }, [area1, radius1, filters1, area2, radius2, filters2, phase]);

  // --- Handlers ---
  function handleConfirmInitialArea(loc) {
    setArea1({ lat: loc.lat, lng: loc.lng, label: loc.label });
    setPhase("explore");
    setFlyTarget({ lat: loc.lat, lng: loc.lng });
  }

  function handleMapClick(latlng) {
    if (phase === "picker") return;
    const slot = pendingAreaSlot;
    if (slot === 2) {
      setArea2({ lat: latlng.lat, lng: latlng.lng });
      setFlyTarget({ lat: latlng.lat, lng: latlng.lng });
    } else {
      setArea1({ lat: latlng.lat, lng: latlng.lng });
      setFlyTarget({ lat: latlng.lat, lng: latlng.lng });
    }
    // Reverse-geocode the chosen point so we get a friendly label.
    fetch(`/api/reverse?lat=${latlng.lat}&lon=${latlng.lng}`)
      .then((r) => r.json())
      .then((d) => {
        const a = d?.address;
        const parts = [
          a?.neighbourhood || a?.suburb || a?.city_district || a?.quarter,
          a?.city || a?.town || a?.county,
          a?.country,
        ].filter(Boolean);
        const dedup = parts.filter((p, i) => p !== parts[i - 1]);
        const label = dedup.join(", ") || null;
        if (slot === 2) setArea2((cur) => (cur ? { ...cur, label } : cur));
        else setArea1((cur) => (cur ? { ...cur, label } : cur));
      })
      .catch(() => {});
    // Reset pending slot to "Area 1" so the agent has to opt-in to picking Area 2.
    setPendingAreaSlot(1);
  }

  function handleToggleCompare() {
    if (phase === "compare") {
      // Exit compare mode → keep area1 settings, drop area2 + picks.
      setPhase("explore");
      setArea2(null);
      setComparePick1(null);
      setComparePick2(null);
      setReportOpen(false);
      setPendingAreaSlot(1);
    } else {
      setPhase("compare");
      setPendingAreaSlot(2); // next click sets Area 2
    }
  }

  function pickForArea(slot) {
    if (!detailProperty) return;
    const inArea1 = area1 && metersBetween(detailProperty.lat, detailProperty.lng, area1.lat, area1.lng) <= radius1;
    const inArea2 = area2 && metersBetween(detailProperty.lat, detailProperty.lng, area2.lat, area2.lng) <= radius2;
    if (slot === 1 && inArea1) setComparePick1(detailProperty);
    else if (slot === 2 && inArea2) setComparePick2(detailProperty);
  }

  // --- Render branches ---
  if (phase === "picker") {
    return <PropertyEntry onConfirm={handleConfirmInitialArea} onBackToHome={goHome} />;
  }

  const inArea1 = (p) => area1 && metersBetween(p.lat, p.lng, area1.lat, area1.lng) <= radius1;
  const inArea2 = (p) => area2 && metersBetween(p.lat, p.lng, area2.lat, area2.lng) <= radius2;
  const detailInArea1 = detailProperty ? inArea1(detailProperty) : false;
  const detailInArea2 = detailProperty ? inArea2(detailProperty) : false;

  return (
    <div className="h-screen flex bg-slate-950">
      <PropertyFilters
        mode={phase === "compare" ? "compare" : "explore"}
        area1={area1}
        radius1={radius1}
        filters1={filters1}
        area2={area2}
        radius2={radius2}
        filters2={filters2}
        comparePick1={comparePick1}
        comparePick2={comparePick2}
        resultCount={matched.all.length}
        resultCountByArea={{ 1: matched.area1.length, 2: matched.area2.length }}
        onChangeArea={(idx) => setPendingAreaSlot(idx)}
        onChangeFilters={(idx, next) => (idx === 2 ? setFilters2(next) : setFilters1(next))}
        onChangeRadius={(idx, r) => (idx === 2 ? setRadius2(r) : setRadius1(r))}
        onToggleCompare={handleToggleCompare}
        onClearComparePick={(idx) => (idx === 2 ? setComparePick2(null) : setComparePick1(null))}
        onOpenComparison={() => setReportOpen(true)}
        onBackToHome={goHome}
      />

      <main className="flex-1 relative">
        <PropertyMap
          area1={area1}
          radius1={radius1}
          area2={area2}
          radius2={radius2}
          properties={matched.all}
          onMapClick={handleMapClick}
          flyTarget={flyTarget}
          onPropertyClick={setDetailProperty}
          comparePick1Id={comparePick1?.id}
          comparePick2Id={comparePick2?.id}
          initialCenter={area1 || undefined}
        />

        {/* "Click to set Area X" hint while we're waiting for a map click */}
        {pendingAreaSlot && (phase === "compare" || pendingAreaSlot === 1) ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="bg-slate-900/95 border border-cyan-500/40 rounded-lg shadow-2xl px-4 py-2.5 backdrop-blur">
              <span className="text-xs text-cyan-300 font-semibold">
                Click the map to set Area {pendingAreaSlot}
              </span>
            </div>
          </div>
        ) : null}

        {/* Map legend bottom-right */}
        <div className="absolute bottom-3 right-3 z-[400] bg-slate-900/90 border border-slate-700 rounded-md px-3 py-2 text-[10.5px] text-slate-200 shadow-lg backdrop-blur">
          <div className="font-semibold text-slate-300 mb-1">Listing types</div>
          {PROPERTY_FILTERS.map((f) => (
            <div key={f.value} className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: f.color }} />
              <span>{f.label}</span>
            </div>
          ))}
        </div>

        {detailProperty ? (
          <PropertyDetailCard
            property={detailProperty}
            onClose={() => setDetailProperty(null)}
            compareMode={phase === "compare"}
            comparePick1Id={comparePick1?.id}
            comparePick2Id={comparePick2?.id}
            canPickForArea1={detailInArea1}
            canPickForArea2={detailInArea2}
            onPickForCompare={pickForArea}
          />
        ) : null}
      </main>

      {reportOpen && comparePick1 && comparePick2 ? (
        <CompareReport
          propertyA={comparePick1}
          propertyB={comparePick2}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </div>
  );
}
