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
import { useEffect, useMemo, useState } from "react";
import PropertyFilters from "@/components/property/PropertyFilters";
import PropertyDetailCard from "@/components/property/PropertyDetailCard";
import CompareReport from "@/components/property/CompareReport";

// Reuse the same "Use my current location" / "Pick a location on the map"
// picker that the Business section uses — same UX everywhere.
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });
import { PROPERTIES } from "@/lib/agent/mockProperties";
import { metersBetween } from "@/lib/agent/distance";
import {
  PROPERTY_FILTERS,
  primaryFilterForProperty,
  matchesSelectedFilters,
} from "@/lib/property/filters";
import { pickDemoHighlights } from "@/lib/property/suggestedDemos";
import { fillWithSynthetics } from "@/lib/property/synthetic";
import { loadUserProperties, addUserProperty } from "@/lib/property/userProperties";
import AddPropertyForm from "@/components/property/AddPropertyForm";

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
  // "Add Property" flow
  const [userProperties, setUserProperties] = useState([]);
  const [placeMode, setPlaceMode] = useState(false);
  const [pendingNewCoords, setPendingNewCoords] = useState(null);
  useEffect(() => { setUserProperties(loadUserProperties()); }, []);
  const allProperties = useMemo(() => [...PROPERTIES, ...userProperties], [userProperties]);

  function goHome() {
    if (typeof window !== "undefined") window.location.href = "/";
  }

  // --- Property listing logic ---
  //
  // 1) Pull every real property inside an active area AND matching that area's
  //    filters.
  // 2) Top each area up with synthetic dummies so the user ALWAYS sees at least
  //    3 properties inside their picked radius (works at 500 m, 1 km, 1.5 km
  //    even where the real dataset is sparse).
  const matched = useMemo(() => {
    const TARGET = 3;
    const realArea1 = [];
    const realArea2 = [];

    for (const p of allProperties) {
      const okFilters1 = matchesSelectedFilters(p, filters1);
      const okFilters2 = phase === "compare" && matchesSelectedFilters(p, filters2);
      const inArea1Geo = area1 && metersBetween(p.lat, p.lng, area1.lat, area1.lng) <= radius1;
      const inArea2Geo = area2 && metersBetween(p.lat, p.lng, area2.lat, area2.lng) <= radius2;
      if (inArea1Geo && okFilters1) realArea1.push(p);
      if (inArea2Geo && okFilters2) realArea2.push(p);
    }

    // Top up with synthetics so the user always sees ≥ TARGET demo properties
    // inside their selected circle, even at 500 m where the real data is thin.
    const filledArea1 = area1
      ? fillWithSynthetics({
          properties: realArea1,
          center: { lat: area1.lat, lng: area1.lng },
          radius: radius1,
          target: TARGET,
          seed: `a1|${area1.lat.toFixed(4)},${area1.lng.toFixed(4)},${radius1}`,
          activeFilters: [...filters1],
        })
      : [];
    const filledArea2 = (phase === "compare" && area2)
      ? fillWithSynthetics({
          properties: realArea2,
          center: { lat: area2.lat, lng: area2.lng },
          radius: radius2,
          target: TARGET,
          seed: `a2|${area2.lat.toFixed(4)},${area2.lng.toFixed(4)},${radius2}`,
          activeFilters: [...filters2],
        })
      : [];

    // Merge — same property can technically appear in both areas if circles
    // overlap; deduplicate by id, prefer the area-1 copy.
    const seen = new Set();
    const all = [];
    function push(p, inA1, inA2) {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      const f = primaryFilterForProperty(p);
      all.push({
        ...p,
        _color: f?.color || "#64748b",
        _filter: f,
        _inArea1: inA1,
        _inArea2: inA2,
        _inAnyArea: true,
      });
    }
    for (const p of filledArea1) push(p, true, false);
    for (const p of filledArea2) push(p, false, true);

    return {
      all,
      area1Count: filledArea1.length,
      area2Count: filledArea2.length,
    };
  }, [area1, radius1, filters1, area2, radius2, filters2, phase, allProperties]);

  // --- User-controlled selection ---
  //
  // The single source of truth for "which properties show on the map" is two
  // Sets the user can toggle from the sidebar checklist (Area 1 and Area 2).
  // Whenever the area / radius / filters change, we DEFAULT-CHECK 2–3 random
  // properties inside the new radius (deterministic via the seed) so the user
  // always sees demo pins the moment they pick a location. They can then tick
  // others on or untick the defaults — the map updates instantly.
  const [selectedIds1, setSelectedIds1] = useState(() => new Set());
  const [selectedIds2, setSelectedIds2] = useState(() => new Set());

  // Auto-default Area 1 picks when area/radius/filters change.
  useEffect(() => {
    if (!area1) { setSelectedIds1(new Set()); return; }
    const inA1 = matched.all.filter((p) => p._inArea1);
    const seed = `${area1.lat.toFixed(4)},${area1.lng.toFixed(4)},${radius1},${[...filters1].sort().join("|")}`;
    setSelectedIds1(pickDemoHighlights(inA1, radius1, seed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area1?.lat, area1?.lng, radius1, [...filters1].sort().join("|")]);

  // Auto-default Area 2 picks when compare-mode area2 changes.
  useEffect(() => {
    if (phase !== "compare" || !area2) { setSelectedIds2(new Set()); return; }
    const inA2 = matched.all.filter((p) => p._inArea2);
    const seed = `${area2.lat.toFixed(4)},${area2.lng.toFixed(4)},${radius2},${[...filters2].sort().join("|")}`;
    setSelectedIds2(pickDemoHighlights(inA2, radius2, seed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, area2?.lat, area2?.lng, radius2, [...filters2].sort().join("|")]);

  function toggleSelected(slot, propertyId) {
    const setter = slot === 2 ? setSelectedIds2 : setSelectedIds1;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  }

  // --- Handlers ---
  function handleConfirmInitialArea(loc) {
    setArea1({ lat: loc.lat, lng: loc.lng, label: loc.label });
    setPhase("explore");
    setFlyTarget({ lat: loc.lat, lng: loc.lng });
  }

  function handleMapClick(latlng) {
    if (phase === "picker") return;
    // "Add Property" place mode steals the next click.
    if (placeMode) {
      setPendingNewCoords({ lat: latlng.lat, lng: latlng.lng });
      setPlaceMode(false);
      return;
    }
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
    return (
      <LocationPicker
        onLocationChosen={(loc) =>
          handleConfirmInitialArea({ lat: loc.latitude, lng: loc.longitude, label: loc.city })
        }
        onBackToHome={goHome}
      />
    );
  }

  // Visible pins on the map = the subset the user has ticked in the sidebar.
  const visibleProperties = matched.all.filter(
    (p) => (p._inArea1 && selectedIds1.has(p.id)) || (p._inArea2 && selectedIds2.has(p.id)),
  );

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
        resultCount={visibleProperties.length}
        resultCountByArea={{ 1: matched.area1Count, 2: matched.area2Count }}
        propsInArea1={matched.all.filter((p) => p._inArea1)}
        propsInArea2={matched.all.filter((p) => p._inArea2)}
        selectedIds1={selectedIds1}
        selectedIds2={selectedIds2}
        onToggleProperty={toggleSelected}
        onChangeArea={(idx) => setPendingAreaSlot(idx)}
        onChangeFilters={(idx, next) => (idx === 2 ? setFilters2(next) : setFilters1(next))}
        onChangeRadius={(idx, r) => (idx === 2 ? setRadius2(r) : setRadius1(r))}
        onToggleCompare={handleToggleCompare}
        onClearComparePick={(idx) => (idx === 2 ? setComparePick2(null) : setComparePick1(null))}
        onOpenComparison={() => setReportOpen(true)}
        onBackToHome={goHome}
        placeMode={placeMode}
        onStartAddProperty={() => setPlaceMode(true)}
        onCancelAddProperty={() => setPlaceMode(false)}
      />

      <main className="flex-1 relative">
        <PropertyMap
          area1={area1}
          radius1={radius1}
          area2={area2}
          radius2={radius2}
          properties={visibleProperties}
          onMapClick={handleMapClick}
          flyTarget={flyTarget}
          onPropertyClick={setDetailProperty}
          initialCenter={area1 || undefined}
        />

        {/* "Click to set Area X" hint while we're waiting for a map click */}
        {pendingAreaSlot && !placeMode && (phase === "compare" || pendingAreaSlot === 1) ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="bg-slate-900/95 border border-cyan-500/40 rounded-lg shadow-2xl px-4 py-2.5 backdrop-blur">
              <span className="text-xs text-cyan-300 font-semibold">
                Click the map to set Area {pendingAreaSlot}
              </span>
            </div>
          </div>
        ) : null}

        {/* "Add Property" place-mode banner — reminds the user to zoom in first. */}
        {placeMode ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500]">
            <div className="bg-amber-500/95 text-slate-900 rounded-lg shadow-2xl px-4 py-2.5 backdrop-blur max-w-md">
              <div className="text-xs font-bold uppercase tracking-wider">
                📍 Drop a new property
              </div>
              <div className="text-[11.5px] mt-0.5 leading-snug">
                Zoom in close (use the + button or scroll) so the pin lands on the exact
                building. Then click the map.
              </div>
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

      {/* Add Property modal — opens after the user clicks a spot on the map
          while place-mode is on. Saves to localStorage so the new pin sticks
          across reloads. */}
      {pendingNewCoords ? (
        <AddPropertyForm
          coords={pendingNewCoords}
          onClose={() => setPendingNewCoords(null)}
          onSave={(form) => {
            const next = addUserProperty(form);
            setUserProperties(next);
            setPendingNewCoords(null);
          }}
        />
      ) : null}
    </div>
  );
}
