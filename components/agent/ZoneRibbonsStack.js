"use client";

import PropertyRibbon from "./PropertyRibbon";
import BusinessRibbon from "./BusinessRibbon";
import { ZONE_PALETTE } from "./ZoneLayerDrawer";

// Stacks every active layer ribbon at the top of the map. Property ribbons go
// first (one per zone whose Property layer is on), then Business ribbons
// (always below the Property block — same ordering rule the user described).
// The container is pointer-events:none so the map underneath stays clickable
// between the ribbons; the ribbons themselves re-enable pointer events.

export default function ZoneRibbonsStack({
  zones = [],
  layers = {},
  // Ribbon visibility rule (simplified): ribbons render ONLY when a single
  // zone is selected. The "Show all my Zones" button in the sidebar is a pure
  // deselect — it clears the focus and the map shows every zone's circle
  // cleanly with no ribbons floating across the top.
  selectedZoneId = null,
  // showAllZones is kept in the signature for backwards-compat with the
  // parent but is ignored for ribbon visibility — see comment above.
  // eslint-disable-next-line no-unused-vars
  showAllZones = false,
  // Property side
  propertyMatchesByZone = {},      // { [zoneId]: number of matches inside that zone }
  onToggleFilter,                  // (zoneId, filterValue) → void
  onAddProperty,                   // (zoneId) → void
  placeModeZoneId = null,
  // Business side
  businessResults = {},            // { [zoneId]: result | { error } }
  businessLoading = {},            // { [zoneId]: bool }
  onCategoryChange,                // (zoneId, value) → void
  onAnalyzeBusiness,               // (zoneId) → void
  onViewBusinessReport,            // (zoneId) → void
  onAddBusiness,                   // (zoneId) → void
  addBusinessModeZoneId = null,    // which zone is currently in "place a business" mode
}) {
  const propertyRibbons = [];
  const businessRibbons = [];

  // Decide which zones contribute ribbons this render. Default = none, until
  // the agent selects a single zone.
  const visibleZones = selectedZoneId
    ? zones.filter((z) => z.id === selectedZoneId)
    : [];

  visibleZones.forEach((z) => {
    // Use the zone's original index for colour + label parity with the rest
    // of the UI (sidebar drawer, dashboard cards).
    const i = zones.findIndex((zz) => zz.id === z.id);
    const layer = layers[z.id] || {};
    const color = ZONE_PALETTE[i % ZONE_PALETTE.length];

    if (layer.propertyOn) {
      propertyRibbons.push(
        <PropertyRibbon
          key={`p-${z.id}`}
          zone={z}
          index={i}
          color={color}
          activeFilters={layer.propertyFilters || []}
          onToggleFilter={(v) => onToggleFilter?.(z.id, v)}
          onAddProperty={() => onAddProperty?.(z.id)}
          placeMode={placeModeZoneId === z.id}
          matchCount={propertyMatchesByZone[z.id] || 0}
        />
      );
    }
    if (layer.businessOn) {
      businessRibbons.push(
        <BusinessRibbon
          key={`b-${z.id}`}
          zone={z}
          index={i}
          color={color}
          category={layer.businessCategory || "mens_salon"}
          onCategoryChange={(c) => onCategoryChange?.(z.id, c)}
          result={businessResults[z.id]}
          loading={!!businessLoading[z.id]}
          onAnalyze={() => onAnalyzeBusiness?.(z.id)}
          onViewReport={() => onViewBusinessReport?.(z.id)}
          onAddBusiness={() => onAddBusiness?.(z.id)}
          placeMode={addBusinessModeZoneId === z.id}
        />
      );
    }
  });

  if (propertyRibbons.length === 0 && businessRibbons.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute top-3 left-3 right-3 z-[500] space-y-1.5 pointer-events-none max-h-[60%] overflow-y-auto scrollbar-thin"
    >
      {/* Property block — always above the Business block per the spec. */}
      {propertyRibbons.length > 0 ? (
        <div className="space-y-1.5 pointer-events-auto">{propertyRibbons}</div>
      ) : null}
      {businessRibbons.length > 0 ? (
        <div className="space-y-1.5 pointer-events-auto">{businessRibbons}</div>
      ) : null}
    </div>
  );
}
