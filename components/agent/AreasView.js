"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { PROPERTIES } from "@/lib/agent/mockProperties";
import {
  FREE_TIER_MAX_ZONES,
  loadZoneLayers,
  updateZoneLayer,
  DEFAULT_ZONE_LAYER,
  loadFavourites,
  toggleFavourite as persistToggleFavourite,
  loadZoneBusinessSummaries,
  updateZoneBusinessSummary,
  clearZoneBusinessSummary,
  loadZoneBusinessFull,
  saveZoneBusinessFull,
  clearZoneBusinessFull,
  loadFavoriteRecommendations,
  toggleFavoriteRecommendation,
  recommendationKey,
} from "@/lib/agent/storage";
import { metersBetween } from "@/lib/agent/distance";
import { fillPerFilterSynthetics } from "@/lib/property/synthetic";
import { loadUserProperties, addUserProperty } from "@/lib/property/userProperties";
import { loadUserBusinesses, addUserBusiness } from "@/lib/business/userBusinesses";
import {
  PROPERTY_FILTER_BY_VALUE,
  ALL_PROPERTY_FILTER_VALUES,
} from "@/lib/property/filters";
import AddPropertyForm from "@/components/property/AddPropertyForm";
import AddBusinessForm from "./AddBusinessForm";
import ZoneLayerDrawer from "./ZoneLayerDrawer";
import ZoneRibbonsStack from "./ZoneRibbonsStack";

const AreaMap = dynamic(() => import("./AreaMap"), { ssr: false });
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });
const FullAnalysisModal = dynamic(() => import("@/components/FullAnalysisModal"), { ssr: false });
const ZoneBusinessAnalysisPanel = dynamic(() => import("./ZoneBusinessAnalysisPanel"), { ssr: false });

const RADIUS_PRESETS = [
  { value: 500,  label: "500 m"  },
  { value: 1000, label: "1 km"   },
  { value: 1500, label: "1.5 km" },
];

// Per-filter target — the user spec is "3 random non-overlapping pins per
// activated property type". Synthetic.js handles the separation pass.
const TARGET_PER_FILTER = 3;

// Three top-level map modes — only one is active at a time. Drives what a
// map click means:
//   "idle"  → click selects the zone you clicked inside (or deselects)
//   "add"   → click drops a new pending zone pin
//   "edit"  → click moves the editing zone's centre to that location
//             (zone id stored in `editZoneId`)
const MODE = { IDLE: "idle", ADD: "add", EDIT: "edit" };

export default function AreasView({
  zones,
  onAddZone,
  onUpdateZone,
  onRemoveZone,
  focusZoneId,
  onClearFocus,
}) {
  const focusZone = focusZoneId ? zones.find((z) => z.id === focusZoneId) : null;
  useEffect(() => {
    if (focusZoneId) {
      const t = setTimeout(() => onClearFocus?.(), 800);
      return () => clearTimeout(t);
    }
  }, [focusZoneId, onClearFocus]);

  // ---- Map mode + zone selection
  const [mode, setMode] = useState(MODE.IDLE);
  const [editZoneId, setEditZoneId] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  // "Show all my Zones" overview toggle. Mutually exclusive with a single
  // selectedZoneId — turning either on clears the other so the user always
  // has exactly one viewing mode active.
  const [showAllZones, setShowAllZones] = useState(false);

  // Auto-select a newly saved zone. We compare the current zones[] against
  // a ref of last-seen IDs; any ID that wasn't there last time is treated as
  // freshly created and becomes the selection. Initial mount is intentionally
  // a no-op so loading saved zones from localStorage doesn't fire a focus.
  const prevZoneIdsRef = useRef(null);
  useEffect(() => {
    const currIds = zones.map((z) => z.id);
    if (prevZoneIdsRef.current === null) {
      prevZoneIdsRef.current = currIds;
      return;
    }
    const prevSet = new Set(prevZoneIdsRef.current);
    const newOnes = currIds.filter((id) => !prevSet.has(id));
    if (newOnes.length > 0) {
      setSelectedZoneId(newOnes[newOnes.length - 1]);
      setShowAllZones(false);
    }
    prevZoneIdsRef.current = currIds;
  }, [zones]);

  // ---- Pending-zone config (only used while mode === ADD)
  const [pending, setPending] = useState(null);
  const [pendingRadius, setPendingRadius] = useState(1000);
  const [pendingLabel, setPendingLabel] = useState("");
  const [customRadius, setCustomRadius] = useState("");

  // ---- Picker gate
  const [pickerDone, setPickerDone] = useState(() => zones.length > 0);
  function handleLocationChosen(loc) {
    setPickerDone(true);
    // First-time agents land directly in "add" mode at their location so
    // they can drop a zone immediately.
    if (zones.length === 0 && !reachedLimit) {
      setMode(MODE.ADD);
      setPending({ lat: loc.latitude, lng: loc.longitude });
    }
  }

  // ---- Property/Business place-mode (Add Property / Add Business buttons)
  const [userProperties, setUserProperties] = useState([]);
  const [userBusinesses, setUserBusinesses] = useState([]);
  const [placeMode, setPlaceMode] = useState(null);
  const [pendingNewProperty, setPendingNewProperty] = useState(null);
  const [pendingNewBusiness, setPendingNewBusiness] = useState(null);
  useEffect(() => {
    setUserProperties(loadUserProperties());
    setUserBusinesses(loadUserBusinesses());
  }, []);
  const allProperties = useMemo(() => [...PROPERTIES, ...userProperties], [userProperties]);

  // ---- Favourites (property pins)
  const [favourites, setFavourites] = useState(() => new Set());
  useEffect(() => { setFavourites(loadFavourites()); }, []);
  function toggleFavourite(propertyId) {
    persistToggleFavourite(propertyId);
    setFavourites(loadFavourites());
  }

  // ---- Favourited business-analysis recommendations (per zone)
  const [favRecsByZone, setFavRecsByZone] = useState({});
  useEffect(() => { setFavRecsByZone(loadFavoriteRecommendations()); }, []);
  function toggleFavRec(zoneId, rec) {
    const next = toggleFavoriteRecommendation(zoneId, rec);
    setFavRecsByZone(next);
  }
  function isFavRec(zoneId, rec) {
    const list = favRecsByZone[zoneId] || [];
    const key = recommendationKey(rec);
    return list.some((r) => r.id === key);
  }

  // ---- Per-zone layer state
  const [layers, setLayers] = useState({});
  useEffect(() => { setLayers(loadZoneLayers()); }, []);

  // Hydrate defaults: new zones auto-enable Property with every filter chip
  // pre-selected (lit). propertyTouched=false → pins gated until user clicks
  // a chip.
  const layersForRender = useMemo(() => {
    const out = {};
    for (const z of zones) {
      const stored = layers[z.id];
      if (stored) {
        out[z.id] = { ...DEFAULT_ZONE_LAYER, ...stored };
      } else {
        out[z.id] = {
          ...DEFAULT_ZONE_LAYER,
          propertyOn: true,
          propertyDrawerOpen: true,
          propertyFilters: [...ALL_PROPERTY_FILTER_VALUES],
          propertyTouched: false,
        };
      }
    }
    return out;
  }, [zones, layers]);

  function patchLayer(zoneId, patch) {
    setLayers((curr) => {
      const merged = { ...DEFAULT_ZONE_LAYER, ...(curr[zoneId] || {}), ...patch };
      const next = { ...curr, [zoneId]: merged };
      updateZoneLayer(zoneId, merged);
      return next;
    });
  }

  function togglePropertyLayer(zoneId, on) {
    patchLayer(zoneId, { propertyOn: !!on });
    if (!on && placeMode?.kind === "property" && placeMode.zoneId === zoneId) setPlaceMode(null);
  }
  function toggleBusinessLayer(zoneId, on) {
    patchLayer(zoneId, { businessOn: !!on });
    if (!on && placeMode?.kind === "business" && placeMode.zoneId === zoneId) setPlaceMode(null);
  }
  function toggleExpanded(zoneId) {
    const curr = layersForRender[zoneId] || DEFAULT_ZONE_LAYER;
    patchLayer(zoneId, { expanded: !curr.expanded });
  }
  function togglePropertyDrawer(zoneId) {
    const curr = layersForRender[zoneId] || DEFAULT_ZONE_LAYER;
    patchLayer(zoneId, { propertyDrawerOpen: !curr.propertyDrawerOpen });
  }
  function toggleBusinessDrawer(zoneId) {
    const curr = layersForRender[zoneId] || DEFAULT_ZONE_LAYER;
    patchLayer(zoneId, { businessDrawerOpen: !curr.businessDrawerOpen });
  }
  function togglePropertyFilter(zoneId, value) {
    const curr = layersForRender[zoneId]?.propertyFilters || [];
    const next = curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value];
    patchLayer(zoneId, { propertyFilters: next, propertyTouched: true });
  }
  function setBusinessCategory(zoneId, value) {
    patchLayer(zoneId, { businessCategory: value });
  }

  // ---- Selection helpers
  function selectZone(zoneId) {
    setSelectedZoneId((curr) => (curr === zoneId ? null : zoneId));
    setShowAllZones(false);
    // Selecting a zone implicitly cancels edit/add modes if they target a
    // different zone — keeps things unambiguous.
    if (mode === MODE.EDIT && editZoneId !== zoneId) cancelEditMode();
    if (mode === MODE.ADD) cancelAddMode();
  }
  // "Show all my Zones" is now a pure deselect — it clears the focused zone
  // so the user sees every zone's circle cleanly with no ribbons. Ribbons
  // only ever appear when a single zone is selected.
  function showAllZonesAction() {
    setSelectedZoneId(null);
    setShowAllZones(false);
  }
  function startEditMode(zoneId) {
    setEditZoneId(zoneId);
    setMode(MODE.EDIT);
    setSelectedZoneId(zoneId);
  }
  function cancelEditMode() {
    setEditZoneId(null);
    setMode(MODE.IDLE);
  }
  function startAddMode() {
    if (reachedLimit) return;
    setMode(MODE.ADD);
    setPending(null);     // wait for a click to drop the pin
    setSelectedZoneId(null);
  }
  function cancelAddMode() {
    setMode(MODE.IDLE);
    setPending(null);
    setPendingLabel("");
    setCustomRadius("");
  }

  // Which zone (if any) is the user's circle inside? Used to "select-by-click"
  // when the user clicks anywhere on the map in idle mode.
  function zoneAt(latlng) {
    for (const z of zones) {
      if (metersBetween(latlng.lat, latlng.lng, z.lat, z.lng) <= z.radius) return z;
    }
    return null;
  }

  // ---- Map click handler
  function handleMapPick(latlng) {
    // Add Property / Add Business place-modes take priority over everything.
    if (placeMode?.kind === "property") {
      setPendingNewProperty({ lat: latlng.lat, lng: latlng.lng });
      setPlaceMode(null);
      return;
    }
    if (placeMode?.kind === "business") {
      setPendingNewBusiness({ lat: latlng.lat, lng: latlng.lng, zoneId: placeMode.zoneId });
      setPlaceMode(null);
      return;
    }

    if (mode === MODE.ADD) {
      setPending(latlng);
      return;
    }
    if (mode === MODE.EDIT && editZoneId) {
      onUpdateZone?.(editZoneId, { lat: latlng.lat, lng: latlng.lng, addressLabel: null });
      cancelEditMode();
      return;
    }
    // Idle: select the zone you clicked inside (or deselect if you clicked
    // outside every zone). This is the "only work on existing zones unless +"
    // behaviour the user asked for.
    const z = zoneAt(latlng);
    setSelectedZoneId(z ? z.id : null);
  }

  const reachedLimit = zones.length >= FREE_TIER_MAX_ZONES;
  const canSave = !!pending && !reachedLimit;

  function handleCancel() {
    cancelAddMode();
  }
  function handleSave() {
    if (!canSave) return;
    onAddZone({
      lat: pending.lat,
      lng: pending.lng,
      radius: pendingRadius,
      label: pendingLabel.trim() || `Zone ${zones.length + 1}`,
      activities: ["sell", "buy", "rent"],
    });
    cancelAddMode();
  }

  // ---- Per-zone property pool — 3 random pins per active chip, with the
  // non-overlap separation pass baked into fillPerFilterSynthetics.
  const { propsByZone, propertyCounts, unionForMap } = useMemo(() => {
    const byZone = {};
    const counts = {};
    const union = new Map();

    for (const z of zones) {
      const layer = layersForRender[z.id] || DEFAULT_ZONE_LAYER;
      if (!layer.propertyOn) { byZone[z.id] = []; counts[z.id] = 0; continue; }
      const filters = layer.propertyFilters || [];
      if (filters.length === 0) { byZone[z.id] = []; counts[z.id] = 0; continue; }

      // Real properties inside the circle, with a generic "in radius" gate.
      const realInRadius = allProperties.filter(
        (p) => metersBetween(p.lat, p.lng, z.lat, z.lng) <= z.radius,
      );
      const filled = fillPerFilterSynthetics({
        realProperties: realInRadius,
        matchesFilter: (p, f) => PROPERTY_FILTER_BY_VALUE[f]?.matches(p) || false,
        center: { lat: z.lat, lng: z.lng },
        radius: z.radius,
        activeFilters: filters,
        targetPerFilter: TARGET_PER_FILTER,
        seed: `zone|${z.id}|${z.radius}|${filters.join(",")}`,
      });
      byZone[z.id] = filled;
      counts[z.id] = filled.length;
      for (const p of filled) {
        if (!union.has(p.id)) union.set(p.id, p);
      }
    }
    return { propsByZone: byZone, propertyCounts: counts, unionForMap: [...union.values()] };
  }, [zones, layersForRender, allProperties]);

  // Pending-zone preview pins — gives the agent visual feedback the moment
  // they drop the dashed-yellow circle.
  const pendingPreviewProps = useMemo(() => {
    if (!pending) return [];
    const realInRadius = allProperties.filter(
      (p) => metersBetween(p.lat, p.lng, pending.lat, pending.lng) <= pendingRadius,
    );
    return fillPerFilterSynthetics({
      realProperties: realInRadius,
      matchesFilter: (p, f) => PROPERTY_FILTER_BY_VALUE[f]?.matches(p) || false,
      center: { lat: pending.lat, lng: pending.lng },
      radius: pendingRadius,
      activeFilters: ["rent", "sell"],
      targetPerFilter: 2,
      seed: `pending|${pending.lat.toFixed(4)},${pending.lng.toFixed(4)},${pendingRadius}`,
    });
  }, [pending?.lat, pending?.lng, pendingRadius, allProperties]);

  // ---- Map pins: union of every zone whose Property layer is on AND
  // propertyTouched is true. If a zone is selected, restrict to that one zone
  // (the user's single-focus spec).
  const mapProperties = useMemo(() => {
    const out = new Map();
    const considerZones = selectedZoneId
      ? zones.filter((z) => z.id === selectedZoneId)
      : zones;
    for (const z of considerZones) {
      const layer = layersForRender[z.id] || DEFAULT_ZONE_LAYER;
      if (!layer.propertyOn || !layer.propertyTouched) continue;
      const list = propsByZone[z.id] || [];
      for (const p of list) {
        if (!out.has(p.id)) out.set(p.id, p);
      }
    }
    if (pending) {
      for (const p of pendingPreviewProps) {
        if (!out.has(p.id)) out.set(p.id, p);
      }
    }
    return [...out.values()];
  }, [propsByZone, zones, layersForRender, selectedZoneId, pending, pendingPreviewProps]);

  // Zones with Property on but no chip touched yet — drives the "tap a chip"
  // hint banner.
  const awaitingTouchZones = useMemo(() => zones.filter((z) => {
    const l = layersForRender[z.id];
    if (!l || !l.propertyOn || l.propertyTouched) return false;
    if (selectedZoneId && z.id !== selectedZoneId) return false;
    return true;
  }), [zones, layersForRender, selectedZoneId]);

  // ---- Business analyse flow per zone
  const [businessResults, setBusinessResults] = useState({});
  const [businessLoading, setBusinessLoading] = useState({});
  const [reportZoneId, setReportZoneId] = useState(null);

  // Restore the FULL cached analysis on mount so the map redraws every
  // polyline, competitor pin, recommendation star, etc. when the agent comes
  // back to Working Areas. Fall back to the slim summary (just counts) for
  // any zone whose full snapshot wasn't persisted (e.g. quota exceeded).
  useEffect(() => {
    const fulls = loadZoneBusinessFull();
    const summaries = loadZoneBusinessSummaries();
    if (Object.keys(fulls).length === 0 && Object.keys(summaries).length === 0) return;
    setBusinessResults((curr) => {
      const next = { ...curr };
      // Full results take priority — restore everything as-is so loading is
      // marked finished (no spinners) and the map can draw immediately.
      for (const [zid, full] of Object.entries(fulls)) {
        if (next[zid]) continue;
        next[zid] = { ...full, loadingOverview: false, loadingDetails: false };
      }
      // Then fill in summary-only placeholders for zones missing a full cache.
      for (const [zid, s] of Object.entries(summaries)) {
        if (next[zid]) continue;
        next[zid] = {
          _summaryOnly: true,
          category: s.category,
          gold: new Array(s.goldCount || 0).fill(null).map((_, i) => ({ _placeholder: true, _i: i })),
          silver: new Array(s.silverCount || 0).fill(null).map((_, i) => ({ _placeholder: true, _i: i })),
          bronze: new Array(s.bronzeCount || 0).fill(null).map((_, i) => ({ _placeholder: true, _i: i })),
          analyzedAt: s.analyzedAt,
        };
      }
      return next;
    });
  }, []);

  // Clear an analysis: drops cached result from state + storage so the map
  // returns to a clean "no analysis" state for this zone. Surfaced from the
  // Business drawer's ✕ button (see ZoneLayerDrawer).
  function clearBusinessAnalysis(zoneId) {
    const z = zones.find((x) => x.id === zoneId);
    const label = z ? `Zone ${zones.findIndex((zz) => zz.id === zoneId) + 1}` : "this zone";
    if (!confirm(`Remove the business analysis from ${label}? You can re-run it any time from the Business ribbon.`)) return;
    setBusinessResults((m) => {
      const { [zoneId]: _drop, ...rest } = m;
      return rest;
    });
    setBusinessLoading((m) => ({ ...m, [zoneId]: false }));
    clearZoneBusinessFull(zoneId);
    clearZoneBusinessSummary(zoneId);
    if (reportZoneId === zoneId) setReportZoneId(null);
  }

  async function analyzeBusiness(zoneId) {
    const z = zones.find((x) => x.id === zoneId);
    if (!z) return;
    const layer = { ...DEFAULT_ZONE_LAYER, ...(layers[zoneId] || {}) };
    setBusinessLoading((m) => ({ ...m, [zoneId]: true }));
    setBusinessResults((m) => {
      const { [zoneId]: _drop, ...rest } = m;
      return rest;
    });
    try {
      const phase1 = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: z.lat,
          longitude: z.lng,
          radius: z.radius,
          businessType: layer.businessCategory || "mens_salon",
          cityHint: z.addressLabel?.split(",")[0] || null,
        }),
      });
      const phase1Data = await safeJson(phase1, "analysis");
      if (!phase1.ok) throw new Error(phase1Data?.error || `Analysis failed (HTTP ${phase1.status})`);
      const phase1Snapshot = { ...phase1Data, loadingOverview: true, loadingDetails: true };
      setBusinessResults((m) => ({ ...m, [zoneId]: phase1Snapshot }));
      setBusinessLoading((m) => ({ ...m, [zoneId]: false }));

      // Persist the full Phase-1 snapshot too so a navigation between views
      // restores the map polylines + competitor pins immediately. Phases 2/3
      // will overwrite this entry as their data lands.
      saveZoneBusinessFull(zoneId, phase1Snapshot);

      // Persist a slim summary so the dashboard can show it later.
      updateZoneBusinessSummary(zoneId, {
        category: layer.businessCategory || "mens_salon",
        goldCount: (phase1Data.gold || []).length,
        silverCount: (phase1Data.silver || []).length,
        bronzeCount: (phase1Data.bronze || []).length,
        totalCommercial: phase1Data.meta?.totalCommercial || 0,
        analyzedAt: Date.now(),
      });

      const all = [
        ...(phase1Data.gold || []),
        ...(phase1Data.silver || []),
        ...(phase1Data.bronze || []),
      ];
      const topStreets = all.slice(0, 5).map((s) => ({
        street: s.street, tier: s.tier, score: s.score,
        breakdown: s.breakdown, highway: s.highway, center: s.center,
      }));
      const ctx = phase1Data.enrichContext || {};
      const meta = phase1Data.meta || {};
      const recommendations = phase1Data.recommendations || [];

      fetch("/api/enrich-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ctx, topStreets, meta }),
      })
        .then((r) => safeJson(r, "overview").then((data) => ({ r, data })))
        .then(({ r, data }) => {
          if (!r.ok) throw new Error(data?.error || `Overview failed (HTTP ${r.status})`);
          setBusinessResults((m) => {
            const prev = m[zoneId];
            if (!prev) return m;
            const merged = {
              ...prev,
              report: data.report || prev.report,
              competitorInsights: data.competitorInsights || prev.competitorInsights,
              successFactors: data.successFactors || prev.successFactors,
              agencies: data.agencies || prev.agencies,
              loadingOverview: false,
              overviewError: null,
            };
            // Refresh the full cache so a navigation away/back keeps the
            // upgraded AI fields.
            saveZoneBusinessFull(zoneId, merged);
            return { ...m, [zoneId]: merged };
          });
        })
        .catch((err) => {
          setBusinessResults((m) => {
            const prev = m[zoneId];
            if (!prev) return m;
            return { ...m, [zoneId]: { ...prev, loadingOverview: false, overviewError: err.message || "Overview unavailable" } };
          });
        });

      fetch("/api/enrich-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ctx, topStreets, recommendations }),
      })
        .then((r) => safeJson(r, "details").then((data) => ({ r, data })))
        .then(({ r, data }) => {
          if (!r.ok) throw new Error(data?.error || `Details failed (HTTP ${r.status})`);
          const byStreet = new Map((data.explanations || []).map((e) => [e.street, e]));
          const upgrade = (s) => {
            const m2 = byStreet.get(s.street);
            return m2 ? { ...s, explanation: m2.text, explanationSource: m2.source } : s;
          };
          setBusinessResults((m) => {
            const prev = m[zoneId];
            if (!prev) return m;
            const merged = {
              ...prev,
              gold: (prev.gold || []).map(upgrade),
              silver: (prev.silver || []).map(upgrade),
              bronze: (prev.bronze || []).map(upgrade),
              recommendations: (prev.recommendations || []).map((rec, i) => {
                const reason = data.recReasons?.[i];
                return reason ? { ...rec, reason: reason.text, reasonSource: reason.source } : rec;
              }),
              loadingDetails: false,
              detailsError: null,
            };
            saveZoneBusinessFull(zoneId, merged);
            return { ...m, [zoneId]: merged };
          });
        })
        .catch((err) => {
          setBusinessResults((m) => {
            const prev = m[zoneId];
            if (!prev) return m;
            return { ...m, [zoneId]: { ...prev, loadingDetails: false, detailsError: err.message || "Details unavailable" } };
          });
        });
    } catch (e) {
      setBusinessResults((m) => ({ ...m, [zoneId]: { error: e.message || "Analysis failed" } }));
      setBusinessLoading((m) => ({ ...m, [zoneId]: false }));
      clearZoneBusinessSummary(zoneId);
    }
  }

  function startAddProperty(zoneId) {
    setPlaceMode((curr) =>
      curr?.kind === "property" && curr.zoneId === zoneId ? null : { kind: "property", zoneId },
    );
  }
  function startAddBusiness(zoneId) {
    setPlaceMode((curr) =>
      curr?.kind === "business" && curr.zoneId === zoneId ? null : { kind: "business", zoneId },
    );
  }

  if (!pickerDone) {
    return <LocationPicker onLocationChosen={handleLocationChosen} />;
  }

  const reportZone = reportZoneId ? zones.find((z) => z.id === reportZoneId) : null;
  const reportLayer = reportZone ? (layersForRender[reportZone.id] || DEFAULT_ZONE_LAYER) : null;
  const reportResult = reportZone ? businessResults[reportZone.id] : null;
  // Don't open the report modal for summary-only stubs (no `report` field yet).
  const reportReady = reportResult && !reportResult._summaryOnly && reportResult.report;

  const propertyPlaceZoneId = placeMode?.kind === "property" ? placeMode.zoneId : null;
  const businessPlaceZoneId = placeMode?.kind === "business" ? placeMode.zoneId : null;

  // For radar: pick up zones currently loading a business analysis.
  const radarZones = zones.filter((z) => businessLoading[z.id]);

  return (
    <div className="flex h-full">
      {/* ---- LEFT RAIL ---- */}
      <div className="w-[360px] shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
        <PlanBanner used={zones.length} limit={FREE_TIER_MAX_ZONES} />

        {/* Mode prompt — only visible while actively dropping a new zone. The
            actual "+ Add a new zone" affordance now lives at the END of the
            zones list below (styled like the dashboard's "Add new i-Case"
            dashed card). Keeps the top of the sidebar uncluttered. */}
        {mode === MODE.ADD ? (
          <div className="px-4 py-3 border-b border-slate-800">
            <button
              type="button"
              onClick={cancelAddMode}
              className="w-full text-[12px] font-semibold px-3 py-2 rounded border border-amber-400 bg-amber-500/20 text-amber-100 transition"
            >
              ⏳ Click the map to place · Cancel
            </button>
          </div>
        ) : null}

        {mode === MODE.ADD && pending ? (
          <div className="p-4 border-b border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold mb-2">
              New working zone
            </div>
            <div className="text-[11px] text-slate-400 mb-3 leading-relaxed tabular-nums">
              {pending.lat.toFixed(4)}, {pending.lng.toFixed(4)} — click elsewhere on the
              map to move this pin.
            </div>

            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Label</label>
            <input
              type="text"
              value={pendingLabel}
              onChange={(e) => setPendingLabel(e.target.value)}
              placeholder="e.g. Marina patch"
              className="w-full mb-3 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500"
            />

            <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">Radius</label>
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
              <span className="text-[11px] text-slate-500 self-center tabular-nums">
                {(pendingRadius / 1000).toFixed(2)} km
              </span>
            </div>

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

        {reachedLimit ? <GoldUpsell limit={FREE_TIER_MAX_ZONES} /> : null}

{/* (Removed extra "Select a zone to focus…" line per spec — the floating
    "Show all my Zones" button on the map already covers this affordance.) */}

        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Working zones · {zones.length}
          </div>
          {selectedZoneId ? (
            <button
              type="button"
              onClick={() => setSelectedZoneId(null)}
              className="text-[10px] text-cyan-300 hover:text-cyan-200 transition"
              title="Clear zone selection (back to default)"
            >
              ⛒ Clear
            </button>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
          {zones.map((z, i) => (
            <div key={z.id}>
              {/* Visible divider between zones — clearer separation than the
                  previous tight stack. */}
              {i > 0 ? <div className="my-3 border-t border-slate-800" /> : null}
              <ZoneLayerDrawer
                zone={z}
                index={i}
                layer={layersForRender[z.id] || DEFAULT_ZONE_LAYER}
                businessResult={businessResults[z.id]}
                businessLoading={!!businessLoading[z.id]}
                selected={selectedZoneId === z.id}
                editingLocation={mode === MODE.EDIT && editZoneId === z.id}
                onSelectZone={() => selectZone(z.id)}
                onEditZone={() => startEditMode(z.id)}
                onCancelEditZone={cancelEditMode}
                onToggleExpanded={() => toggleExpanded(z.id)}
                onTogglePropertyLayer={(on) => togglePropertyLayer(z.id, on)}
                onToggleBusinessLayer={(on) => toggleBusinessLayer(z.id, on)}
                onTogglePropertyDrawer={() => togglePropertyDrawer(z.id)}
                onToggleBusinessDrawer={() => toggleBusinessDrawer(z.id)}
                onAddProperty={() => startAddProperty(z.id)}
                onAddBusiness={() => startAddBusiness(z.id)}
                onAnalyzeBusiness={() => analyzeBusiness(z.id)}
                onViewBusinessReport={() => setReportZoneId(z.id)}
                onClearBusinessAnalysis={() => clearBusinessAnalysis(z.id)}
                onRemoveZone={() => onRemoveZone(z.id)}
                onFocusZone={() => onClearFocus?.()}
              />
            </div>
          ))}
          {zones.length > 0 ? <div className="my-3 border-t border-slate-800" /> : null}

          {/* Dashed "+ Add a new zone" card — same visual language as the
              dashboard's "Add new i-Case" CTA. Lives at the END of the zones
              list so newly-saved zones push above it. */}
          {mode !== MODE.ADD ? (
            <button
              type="button"
              onClick={startAddMode}
              disabled={reachedLimit}
              className={`w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center min-h-[120px] p-3 transition ${
                reachedLimit
                  ? "border-slate-800 bg-slate-900/30 cursor-not-allowed"
                  : "border-slate-700 bg-slate-900/30 hover:border-amber-500 hover:bg-amber-500/5"
              }`}
              title={reachedLimit ? "Free-plan limit reached — upgrade to Gold for unlimited zones" : "Click here, then click the map to drop a new zone"}
            >
              <div className={`text-3xl ${reachedLimit ? "text-slate-700" : "text-amber-300"}`}>+</div>
              <div className={`mt-1 text-[12.5px] font-semibold ${reachedLimit ? "text-slate-500" : "text-slate-100"}`}>
                {reachedLimit ? "Free-plan limit reached" : zones.length === 0 ? "Add your first zone" : "Add a new zone"}
              </div>
              <div className={`text-[10px] mt-1 max-w-[28ch] text-center leading-relaxed ${
                reachedLimit ? "text-slate-600" : "text-slate-400"
              }`}>
                {reachedLimit
                  ? `Using ${FREE_TIER_MAX_ZONES} of ${FREE_TIER_MAX_ZONES}. Upgrade for unlimited.`
                  : "Click, then drop a pin on the map."}
              </div>
            </button>
          ) : null}
        </div>
      </div>

      {/* ---- MAP + RIBBONS ---- */}
      <div className="flex-1 relative">
        <AreaMap
          savedZones={zones}
          selectedZoneId={selectedZoneId}
          editingZoneId={mode === MODE.EDIT ? editZoneId : null}
          pending={mode === MODE.ADD ? pending : null}
          pendingRadius={pendingRadius}
          focusZone={focusZone}
          properties={mapProperties}
          businessByZone={businessResults}
          userBusinesses={userBusinesses}
          favourites={favourites}
          onToggleFavourite={toggleFavourite}
          favRecsByZone={favRecsByZone}
          onToggleFavRec={toggleFavRec}
          isFavRec={isFavRec}
          onPick={handleMapPick}
          radarZones={radarZones}
        />

        <ZoneRibbonsStack
          zones={zones}
          layers={layersForRender}
          selectedZoneId={selectedZoneId}
          showAllZones={showAllZones}
          propertyMatchesByZone={propertyCounts}
          onToggleFilter={togglePropertyFilter}
          onAddProperty={startAddProperty}
          placeModeZoneId={propertyPlaceZoneId}
          businessResults={businessResults}
          businessLoading={businessLoading}
          onCategoryChange={setBusinessCategory}
          onAnalyzeBusiness={analyzeBusiness}
          onViewBusinessReport={(zoneId) => setReportZoneId(zoneId)}
          onAddBusiness={startAddBusiness}
          addBusinessModeZoneId={businessPlaceZoneId}
        />

        {/* Floating "Show all my Zones" control — sits at the bottom-left of
            the map so the affordance is right next to the surface it controls.
            Shows the current focus and gives a one-click deselect. */}
        {zones.length > 0 ? (
          <div className="absolute bottom-4 left-4 z-[500]">
            <button
              type="button"
              onClick={showAllZonesAction}
              disabled={!selectedZoneId}
              className={`text-[11.5px] font-semibold px-3 py-2 rounded-lg border shadow-2xl backdrop-blur transition ${
                selectedZoneId
                  ? "border-cyan-500/50 bg-slate-900/90 hover:bg-slate-900 text-cyan-200"
                  : "border-slate-700 bg-slate-900/80 text-slate-400 cursor-not-allowed"
              }`}
              title={
                selectedZoneId
                  ? "Deselect — view all your zones cleanly with no ribbons."
                  : "Already showing all zones cleanly. Click a zone in the list to surface its ribbons."
              }
            >
              🗺️ Show all my Zones
              {selectedZoneId ? (
                <span className="ml-2 text-[9.5px] uppercase tracking-wider text-cyan-300/80">
                  · focusing Zone {zones.findIndex((z) => z.id === selectedZoneId) + 1}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}

        {/* Awaiting-chip hint (per the "tap to reveal" gate) */}
        {awaitingTouchZones.length > 0 && !placeMode && mode !== MODE.ADD ? (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[450] pointer-events-none max-w-md text-center">
            <div className="bg-slate-900/90 border border-amber-500/50 rounded-lg shadow-2xl px-5 py-3 backdrop-blur">
              <div className="text-amber-300 text-[10.5px] uppercase tracking-wider font-bold mb-1">
                ☝ Choose your property types
              </div>
              <div className="text-[12px] text-slate-100 leading-snug">
                Tap any chip in the Property ribbon to start surfacing pins on the map.
                Each activated chip drops 3 random examples inside the zone radius.
              </div>
            </div>
          </div>
        ) : null}

        {/* Mode banner: place-mode / edit / first-zone hint */}
        {placeMode ? (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500]">
            <div className={`rounded-lg shadow-2xl px-4 py-2.5 backdrop-blur max-w-md ${
              placeMode.kind === "property"
                ? "bg-amber-500/95 text-slate-900"
                : "bg-cyan-500/95 text-slate-900"
            }`}>
              <div className="text-xs font-bold uppercase tracking-wider">
                {placeMode.kind === "property" ? "📍 Drop a new property" : "🏪 Drop a new business"}
              </div>
              <div className="text-[11.5px] mt-0.5 leading-snug">
                Zoom in close, then click the map to place the pin inside
                Zone {zones.findIndex((z) => z.id === placeMode.zoneId) + 1}.
              </div>
            </div>
          </div>
        ) : mode === MODE.EDIT && editZoneId ? (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500]">
            <div className="rounded-lg shadow-2xl px-4 py-2.5 backdrop-blur max-w-md bg-amber-500/95 text-slate-900">
              <div className="text-xs font-bold uppercase tracking-wider">✎ Edit zone location</div>
              <div className="text-[11.5px] mt-0.5 leading-snug">
                Click anywhere on the map to move Zone {zones.findIndex((z) => z.id === editZoneId) + 1}'s
                centre. Click ✎ in the sidebar to cancel.
              </div>
            </div>
          </div>
        ) : mode === MODE.ADD && !pending ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="bg-slate-900/95 border border-amber-500/40 rounded-lg shadow-2xl px-4 py-2.5 backdrop-blur">
              <span className="text-xs text-amber-300 font-semibold">
                Click anywhere on the map to drop your new zone
              </span>
            </div>
          </div>
        ) : !pending && zones.length === 0 && mode === MODE.IDLE ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="bg-slate-900/95 border border-cyan-500/40 rounded-lg shadow-2xl px-4 py-2.5 backdrop-blur">
              <span className="text-xs text-cyan-300 font-semibold">
                Click <strong>+ Add a new zone</strong> in the sidebar to start
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Add Property modal */}
      {pendingNewProperty ? (
        <AddPropertyForm
          coords={pendingNewProperty}
          onClose={() => setPendingNewProperty(null)}
          onSave={(form) => {
            const next = addUserProperty(form);
            setUserProperties(next);
            setPendingNewProperty(null);
          }}
        />
      ) : null}

      {/* Add Business modal */}
      {pendingNewBusiness ? (
        <AddBusinessForm
          coords={{ lat: pendingNewBusiness.lat, lng: pendingNewBusiness.lng }}
          defaultCategory={
            (layersForRender[pendingNewBusiness.zoneId]?.businessCategory) || "mens_salon"
          }
          onClose={() => setPendingNewBusiness(null)}
          onSave={(form) => {
            const next = addUserBusiness({ ...form, zoneId: pendingNewBusiness.zoneId });
            setUserBusinesses(next);
            setPendingNewBusiness(null);
          }}
        />
      ) : null}

      {/* Right-side Business Analysis panel — mirrors the main Business
          section's layout: sidebar | map | analysis. Renders only when a
          single zone is selected (so the user has clearly opted into one
          zone's report); hidden in show-all overview mode. */}
      {selectedZoneId ? (
        <ZoneBusinessAnalysisPanel
          zone={zones.find((z) => z.id === selectedZoneId)}
          zoneIndex={zones.findIndex((z) => z.id === selectedZoneId)}
          result={businessResults[selectedZoneId]}
          loading={!!businessLoading[selectedZoneId]}
          category={(layersForRender[selectedZoneId]?.businessCategory) || "mens_salon"}
          onOpenFullReport={() => setReportZoneId(selectedZoneId)}
        />
      ) : null}

      {/* Business report modal */}
      {reportZone && reportReady ? (
        <FullAnalysisModal
          result={reportResult}
          category={reportLayer?.businessCategory || "mens_salon"}
          location={{
            latitude: reportZone.lat,
            longitude: reportZone.lng,
            city: reportZone.addressLabel?.split(",")[0] || "",
          }}
          onClose={() => setReportZoneId(null)}
        />
      ) : null}
    </div>
  );
}

async function safeJson(res, label = "request") {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 504 || res.status === 502 || text.startsWith("An error")) {
      throw new Error(
        `The ${label} took too long and was cut off by the server. Try a smaller zone radius and retry.`,
      );
    }
    throw new Error(`Server returned a non-JSON response (HTTP ${res.status}).`);
  }
}

function PlanBanner({ used, limit }) {
  const atLimit = used >= limit;
  // When the agent has used all their free zones, swap the friendly tagline
  // for a bold red "quota used" message — and let the dashed + Add a new zone
  // card render in its disabled state below.
  if (atLimit) {
    return (
      <div className="px-4 py-3 border-b border-red-500/40 bg-red-500/10">
        <div className="text-[12.5px] font-bold text-red-300 leading-snug">
          {used} of {limit} free zones selection used
        </div>
        <div className="text-[10.5px] text-red-200/70 mt-1 leading-relaxed">
          Upgrade to Gold (below) for unlimited zones — or remove one to free a slot.
        </div>
      </div>
    );
  }
  return (
    <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 text-xs leading-snug">
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
          Free
        </span>
        <span className="text-slate-200">
          {used} of {limit} zones used
        </span>
      </div>
    </div>
  );
}

function GoldUpsell({ limit }) {
  return (
    <div className="m-4 p-4 rounded-lg border border-amber-500/50 bg-gradient-to-br from-amber-500/15 to-amber-700/5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.15em] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-slate-900">
          Gold
        </span>
        <span className="text-sm font-semibold text-amber-200">Unlock unlimited zones</span>
      </div>
      <div className="text-[11.5px] text-slate-300 leading-relaxed mb-3">
        You've used all {limit} free working zones. Upgrade to Gold for unlimited zones
        across Dubai, plus priority AI processing.
      </div>
      <button
        type="button"
        onClick={() => alert("Gold membership is launching soon. Talk to your A-Box rep to be notified.")}
        className="w-full px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-xs transition"
      >
        ⭐ Upgrade to Gold
      </button>
    </div>
  );
}
