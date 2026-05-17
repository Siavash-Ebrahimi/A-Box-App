"use client";

// Interactive working-area map. Layered render order, from bottom to top:
//   1. OSM tile base
//   2. Saved zones (translucent circles)
//   3. Pending pin + radius preview (while configuring a new zone)
//   4. Per-zone Business streets (gold/silver/bronze polylines + halos)
//   5. Per-zone Business competitor pins / shop-opportunity / recommended stars
//   6. Per-zone Business custom user-added pins
//   7. Property pins (emoji icons matching the active Property filter)

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Marker,
  Polyline,
  Popup,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { primaryFilterForProperty } from "@/lib/property/filters";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DUBAI_CENTER = { lat: 25.1972, lng: 55.2744 };
const ZONE_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899"];

// Same tier styling as the home Business section (components/MapView.js) so
// the per-zone overlays look identical to what the user sees in the standalone
// Business analysis.
const TIER_STYLE = {
  gold:   { color: "#FFD700", weight: 9,  haloWeight: 14, opacity: 0.95 },
  silver: { color: "#C0C0C0", weight: 6,  haloWeight: 10, opacity: 0.9 },
  bronze: { color: "#CD7F32", weight: 5,  haloWeight: 9,  opacity: 0.85 },
};

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
}

// Radar pulse — same shape as components/MapView.js's RadarOverlay. Runs while
// a business analysis is in flight for a given zone. We render one of these
// per loading zone so multi-zone analyses each get their own visual.
function RadarOverlay({ center, radius, active }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) { setTick(0); return; }
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, [active]);
  if (!active) return null;
  const cycleMs = 2200;
  const t = (tick * 50) % cycleMs;
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const phase = (t + (i * cycleMs) / 3) % cycleMs;
    const progress = phase / cycleMs;
    if (progress < 0.02) continue;
    rings.push(
      <Circle
        key={i}
        center={[center.lat, center.lng]}
        radius={radius * progress}
        pathOptions={{
          color: "#06b6d4",
          weight: 2,
          opacity: 0.7 * (1 - progress),
          fill: false,
          interactive: false,
        }}
      />,
    );
  }
  return <>{rings}</>;
}

function RecenterOnNewZone({ target, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], zoom, { duration: 0.6 });
  }, [target?.lat, target?.lng, zoom, map]);
  return null;
}

function radiusToZoom(r) {
  if (r <= 500) return 15;
  if (r <= 1000) return 14;
  if (r <= 1500) return 13;
  if (r <= 3000) return 12;
  return 11;
}

// Property pin: a coloured disc with the filter's emoji + a price chip
// beneath. The disc's colour and emoji match whichever PROPERTY_FILTER is the
// "primary" match for the property — so the pins on the map are visually
// identical to the chips the user toggles in the ribbon.
function propertyEmojiIcon({ color, emoji, price }) {
  const html = `
    <div style="display:flex; flex-direction:column; align-items:center; pointer-events:auto;">
      <span style="
        display:flex; align-items:center; justify-content:center;
        width:30px; height:30px; border-radius:50%;
        background:${color}; border:2.5px solid #fff;
        box-shadow:0 2px 5px rgba(0,0,0,0.55);
        font-size:15px; line-height:1;
      ">${emoji || "📍"}</span>
      <div style="
        margin-top:2px; padding:1px 6px; border-radius:7px;
        background:#0b1220ee; color:#fff;
        font-size:10px; font-weight:700;
        font-family:-apple-system,sans-serif; white-space:nowrap;
        border:1px solid #1e293b;
      ">${price}</div>
    </div>`;
  return L.divIcon({
    className: "area-prop-marker",
    html,
    iconSize: [60, 50],
    iconAnchor: [30, 25],
    popupAnchor: [0, -22],
  });
}

function shortPrice(p) {
  if (!p?.price) return "—";
  const v = p.price >= 1_000_000
    ? `${(p.price / 1_000_000).toFixed(p.price >= 10_000_000 ? 0 : 1)}M`
    : p.price >= 1_000
      ? `${Math.round(p.price / 1_000)}K`
      : `${p.price}`;
  return p.listing === "rent" ? `${v}/y` : v;
}

// Red drop-pin for competitor businesses (same shape used in MapView).
const COMPETITOR_ICON = L.divIcon({
  className: "comp-marker",
  html: '<div class="comp-pin"></div>',
  iconSize: [28, 32],
  iconAnchor: [14, 28],
  popupAnchor: [0, -26],
});

// Cyan numbered star — recommended spots (top-3 per zone business analysis).
function recommendedIcon(rank) {
  const html = `
    <svg width="48" height="52" viewBox="0 0 52 56" xmlns="http://www.w3.org/2000/svg"
         style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.6));">
      <polygon points="26,4 32,22 50,22 35,33 41,52 26,40 11,52 17,33 2,22 20,22"
        fill="#06b6d4" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" />
      <text x="26" y="33" text-anchor="middle" font-size="18" font-weight="800"
            font-family="-apple-system, BlinkMacSystemFont, sans-serif"
            fill="#ffffff">${rank}</text>
    </svg>`;
  return L.divIcon({
    className: "rec-marker",
    html,
    iconSize: [48, 52],
    iconAnchor: [24, 28],
    popupAnchor: [0, -26],
  });
}

// Green storefront pin — "shop opportunity" markers along recommended streets.
const SHOP_ICON = L.divIcon({
  className: "shop-marker",
  html: `
    <svg width="28" height="34" viewBox="0 0 32 38" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6));">
      <path d="M16 0 C 7.2 0 0 7.2 0 16 C 0 27 16 38 16 38 C 16 38 32 27 32 16 C 32 7.2 24.8 0 16 0 Z"
            fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <rect x="9" y="10" width="14" height="3" fill="#ffffff" rx="0.5"/>
      <rect x="9" y="14" width="4" height="6" fill="#ffffff"/>
      <rect x="14" y="14" width="4" height="6" fill="#ffffff"/>
      <rect x="19" y="14" width="4" height="6" fill="#ffffff"/>
    </svg>`,
  iconSize: [28, 34],
  iconAnchor: [14, 32],
  popupAnchor: [0, -30],
});

// Cyan storefront pin — custom user-added businesses (Add Business flow).
function userBusinessIcon(letter = "B") {
  const html = `
    <svg width="32" height="38" viewBox="0 0 32 38" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
      <path d="M16 0 C 7.2 0 0 7.2 0 16 C 0 27 16 38 16 38 C 16 38 32 27 32 16 C 32 7.2 24.8 0 16 0 Z"
            fill="#06b6d4" stroke="#ffffff" stroke-width="2"/>
      <text x="16" y="20" text-anchor="middle" font-size="13" font-weight="800"
            font-family="-apple-system, sans-serif" fill="#ffffff">${letter}</text>
    </svg>`;
  return L.divIcon({
    className: "user-biz-marker",
    html,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
    popupAnchor: [0, -32],
  });
}

// Logical "shop opportunity" anchor points along the longest path of a
// recommended street (copy of MapView's helper — keeps the AreaMap self-
// contained).
function shopSpotsForRec(rec, allStreets) {
  const street = allStreets.find((s) => s.street === rec.street);
  const fallback = [{ lat: rec.lat, lon: rec.lon }];
  if (!street?.paths?.length) return fallback;
  const longest = street.paths.reduce((a, b) => (a.length > b.length ? a : b));
  if (longest.length < 4) return fallback;
  const aIdx = Math.max(1, Math.floor(longest.length * 0.3));
  const bIdx = Math.min(longest.length - 2, Math.floor(longest.length * 0.7));
  return [
    { lat: longest[aIdx][0], lon: longest[aIdx][1] },
    { lat: longest[bIdx][0], lon: longest[bIdx][1] },
  ];
}

export default function AreaMap({
  savedZones = [],
  selectedZoneId = null,
  editingZoneId = null,
  pending,
  pendingRadius,
  focusZone,
  properties = [],            // ONLY user-checked properties (parent-filtered)
  businessByZone = {},        // { [zoneId]: result } — gold/silver/bronze + recs/agencies
  userBusinesses = [],        // custom Add-Business pins
  favourites,                 // Set<propertyId>
  onToggleFavourite,
  // Favorited business recommendations — per-zone. Each entry's `id` is the
  // stable recommendation key (street + rounded coords).
  favRecsByZone = {},
  onToggleFavRec,
  isFavRec,                   // (zoneId, rec) => bool
  onPick,
  radarZones = [],            // zones currently loading a business analysis
}) {
  const focusTarget = focusZone
    || (selectedZoneId ? savedZones.find((z) => z.id === selectedZoneId) : null)
    || pending
    || savedZones[savedZones.length - 1]
    || null;
  const focusZoom = focusZone ? radiusToZoom(focusZone.radius) : 14;

  // Flatten the per-zone business data into a single render list — but tag
  // each entry with its zoneId / zoneIndex so we can colour-bracket and key
  // safely across zones.
  const businessOverlays = useMemo(() => {
    const out = [];
    savedZones.forEach((z, idx) => {
      const r = businessByZone[z.id];
      // Skip if no data, an error stub, or a summary-only placeholder used by
      // the dashboard counts (we don't have geometry for those).
      if (!r || r.error || r._summaryOnly) return;
      const gold = (r.gold || []).map((s) => ({ ...s, _zoneId: z.id, _zoneIdx: idx, _tier: "gold" }));
      const silver = (r.silver || []).map((s) => ({ ...s, _zoneId: z.id, _zoneIdx: idx, _tier: "silver" }));
      const bronze = (r.bronze || []).map((s) => ({ ...s, _zoneId: z.id, _zoneIdx: idx, _tier: "bronze" }));
      const all = [...gold, ...silver, ...bronze];
      // Competitor markers (red drop pins) — dedupe by id.
      const seen = new Set();
      const competitors = [];
      for (const s of all) {
        for (const b of s.businesses || []) {
          if (!b.isCompetitor || seen.has(b.id)) continue;
          seen.add(b.id);
          competitors.push({ ...b, street: s.street, tier: s.tier, _zoneId: z.id });
        }
      }
      out.push({
        zone: z,
        zoneIndex: idx,
        // Render order: bronze → silver → gold so Gold sits on top.
        ordered: [...all].sort((a, b) => ({ bronze: 0, silver: 1, gold: 2 })[a.tier] - ({ bronze: 0, silver: 1, gold: 2 })[b.tier]),
        all,
        competitors,
        recommendations: r.recommendations || [],
        agencies: r.agencies || null,
      });
    });
    return out;
  }, [savedZones, businessByZone]);

  return (
    <MapContainer
      center={[DUBAI_CENTER.lat, DUBAI_CENTER.lng]}
      zoom={11}
      scrollWheelZoom
      // Disable the default top-left zoom control and remount it at the
      // bottom-right via <ZoomControl /> below so it doesn't sit on top of the
      // ribbons stack.
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />

      <ClickHandler onPick={onPick} />
      <RecenterOnNewZone target={focusTarget} zoom={focusZoom} />

      {/* Saved zones. The selected zone gets a brighter ring + slightly heavier
          stroke. The "currently being edited" zone gets a dashed amber halo. */}
      {savedZones.map((z, i) => {
        const isSelected = selectedZoneId === z.id;
        const isEditing = editingZoneId === z.id;
        const isDimmed = !!selectedZoneId && !isSelected;
        const palette = ZONE_PALETTE[i % ZONE_PALETTE.length];
        return (
          <Circle
            key={z.id}
            center={[z.lat, z.lng]}
            radius={z.radius}
            pathOptions={{
              color: isEditing ? "#fbbf24" : palette,
              weight: isSelected ? 3 : 2,
              dashArray: isEditing ? "8,6" : undefined,
              fillColor: palette,
              fillOpacity: isDimmed ? 0.03 : (isSelected ? 0.14 : 0.08),
              opacity: isDimmed ? 0.45 : 1,
            }}
          >
            <Popup>
              <div className="text-slate-900">
                <div className="font-semibold">
                  Zone {i + 1}{z.label ? ` · ${z.label}` : ""}
                </div>
                <div className="text-xs">{(z.radius / 1000).toFixed(2)} km radius</div>
                {isSelected ? (
                  <div className="text-[10px] mt-1 uppercase tracking-wider text-amber-700 font-bold">
                    Selected
                  </div>
                ) : null}
              </div>
            </Popup>
          </Circle>
        );
      })}

      {/* Radar pulse over zones currently running a business analysis */}
      {radarZones.map((z) => (
        <RadarOverlay key={`radar-${z.id}`} center={{ lat: z.lat, lng: z.lng }} radius={z.radius} active />
      ))}

      {/* Pending pin + radius preview */}
      {pending ? (
        <>
          <Circle
            center={[pending.lat, pending.lng]}
            radius={pendingRadius}
            pathOptions={{
              color: "#fbbf24",
              weight: 2.5,
              dashArray: "8,6",
              fillColor: "#fbbf24",
              fillOpacity: 0.1,
            }}
          />
          <Marker position={[pending.lat, pending.lng]}>
            <Popup>Click anywhere to move this pin</Popup>
          </Marker>
        </>
      ) : null}

      {/* ---- Per-zone Business overlays (gold/silver/bronze polylines + halos) */}
      {businessOverlays.map((bo) => (
        <BusinessZoneOverlay
          key={`biz-${bo.zone.id}`}
          bo={bo}
          isFavRec={isFavRec}
          onToggleFavRec={onToggleFavRec}
        />
      ))}

      {/* ---- Custom user-added business pins ---- */}
      {userBusinesses.map((b) => (
        <Marker
          key={`userbiz-${b.id}`}
          position={[b.lat, b.lng]}
          icon={userBusinessIcon((b.name || "B").slice(0, 1).toUpperCase())}
          zIndexOffset={400}
        >
          <Popup>
            <div className="text-slate-900" style={{ minWidth: 200 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0891b2", fontWeight: 700 }}>
                Custom business
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>{b.name}</div>
              {b.category ? (
                <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{b.category}</div>
              ) : null}
              {b.phone ? <div style={{ fontSize: 11, marginTop: 4 }}>📞 {b.phone}</div> : null}
              {b.website ? (
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  🔗 <a href={b.website} target="_blank" rel="noopener noreferrer">{shorten(b.website)}</a>
                </div>
              ) : null}
              {b.notes ? (
                <div style={{ fontSize: 11, color: "#334155", marginTop: 6, lineHeight: 1.4 }}>{b.notes}</div>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* ---- Property pins (emoji icons matching the Property ribbon chips) */}
      {properties.map((p) => {
        const filter = primaryFilterForProperty(p);
        const color = filter?.color || "#94a3b8";
        const emoji = filter?.icon || "📍";
        return (
          <Marker
            key={`prop-${p.id}`}
            position={[p.lat, p.lng]}
            icon={propertyEmojiIcon({ color, emoji, price: shortPrice(p) })}
            zIndexOffset={600}
          >
            <Popup maxWidth={360} minWidth={320}>
              <PropertyPopup
                p={p}
                filter={filter}
                isFavourite={favourites?.has(p.id)}
                onToggleFavourite={onToggleFavourite}
              />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

// Renders one zone's business analysis overlay. Popups for streets, businesses
// and recommendations match the home Business section (components/MapView.js)
// so the user gets the SAME windows in both places, per the spec.
function BusinessZoneOverlay({ bo, isFavRec, onToggleFavRec }) {
  const { zone, zoneIndex, ordered, all, competitors, recommendations, agencies } = bo;
  const zoneTag = `Zone ${zoneIndex + 1}`;

  return (
    <>
      {/* Halos */}
      {ordered.map((s, i) => {
        const style = TIER_STYLE[s.tier];
        if (!s.paths || s.paths.length === 0) return null;
        return s.paths.map((path, j) => (
          <Polyline
            key={`halo-${zone.id}-${i}-${j}`}
            positions={path}
            pathOptions={{
              color: "#0b1220",
              weight: style.haloWeight,
              opacity: 0.85,
              lineCap: "round",
              lineJoin: "round",
              interactive: false,
            }}
          />
        ));
      })}

      {/* Coloured tier polylines with full StreetDetailPopup */}
      {ordered.map((s, i) => {
        const style = TIER_STYLE[s.tier];
        if (s.paths && s.paths.length > 0) {
          return s.paths.map((path, j) => (
            <Polyline
              key={`line-${zone.id}-${i}-${j}`}
              positions={path}
              pathOptions={{
                color: style.color,
                weight: style.weight,
                opacity: style.opacity,
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              <Tooltip sticky direction="top" offset={[0, -6]}>
                <div className="text-slate-900">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{zoneTag}</div>
                  <div className="font-semibold">{s.street}</div>
                  <div className="text-xs uppercase" style={{ color: TIER_STYLE[s.tier].color }}>
                    {s.tier} · score {Math.round(s.score)}
                  </div>
                </div>
              </Tooltip>
              <Popup maxWidth={340}>
                <StreetDetailPopup street={s} zoneTag={zoneTag} />
              </Popup>
            </Polyline>
          ));
        }
        return (
          <CircleMarker
            key={`pt-${zone.id}-${i}`}
            center={[s.center.lat, s.center.lon]}
            radius={9}
            pathOptions={{
              color: TIER_STYLE[s.tier].color,
              fillColor: TIER_STYLE[s.tier].color,
              fillOpacity: 0.55,
              weight: 2,
            }}
          >
            <Popup maxWidth={340}>
              <StreetDetailPopup street={s} zoneTag={zoneTag} />
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Competitor pins with full BusinessPopup */}
      {competitors.map((b) => (
        <Marker key={`cmp-${zone.id}-${b.id}`} position={[b.lat, b.lon]} icon={COMPETITOR_ICON} zIndexOffset={200}>
          <Popup>
            <BusinessPopup b={b} zoneTag={zoneTag} />
          </Popup>
        </Marker>
      ))}

      {/* Shop-opportunity pins */}
      {recommendations.map((rec, i) =>
        shopSpotsForRec(rec, all).map((sp, j) => (
          <Marker
            key={`shop-${zone.id}-${i}-${j}`}
            position={[sp.lat, sp.lon]}
            icon={SHOP_ICON}
            zIndexOffset={400}
          >
            <Popup maxWidth={280}>
              <ShopOpportunityPopup rec={rec} agencies={agencies} zoneTag={zoneTag} />
            </Popup>
          </Marker>
        )),
      )}

      {/* Numbered cyan stars (recommended spots) */}
      {recommendations.map((r, i) => (
        <Marker
          key={`rec-${zone.id}-${i}`}
          position={[r.lat, r.lon]}
          icon={recommendedIcon(i + 1)}
          zIndexOffset={800}
        >
          <Popup maxWidth={320}>
            <RecommendationPopup
              rec={r}
              rank={i + 1}
              zoneTag={zoneTag}
              isFavorite={isFavRec?.(zone.id, r)}
              onToggleFavorite={() => onToggleFavRec?.(zone.id, r)}
            />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// ----- Detailed popups (parity with components/MapView.js) ------------------

function StreetDetailPopup({ street, zoneTag }) {
  const b = street.breakdown || {};
  const competitors = (street.businesses || []).filter((x) => x.isCompetitor);
  return (
    // Leaflet popup background is dark (#0b1220) via global CSS — use LIGHT
    // text colours throughout to keep the popup readable.
    <div className="rec-popup" style={{ maxWidth: 320 }}>
      {zoneTag ? (
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>
          {zoneTag}
        </div>
      ) : null}
      <span className={`tier-pill ${street.tier}`}>{street.tier}</span>
      <div className="font-semibold text-sm text-slate-100 mt-1">{street.street}</div>
      <div className="summary">
        Score {Math.round(street.score)}{street.highway ? ` · ${street.highway}` : ""}
      </div>

      <div style={{ marginTop: 6, padding: 6, background: "#0f172a", border: "1px solid #1f2937", borderRadius: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, fontSize: 10.5, color: "#94a3b8" }}>
          <div>Competitors<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.competitors ?? 0}</span></div>
          <div>Density<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.density ?? 0}</span></div>
          <div>Variety<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.variety ?? 0}</span></div>
          <div>Transit<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.transit ?? 0}</span></div>
          <div>Anchors<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.anchors ?? 0}</span></div>
          <div>Residential<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.residential ?? 0}</span></div>
        </div>
      </div>

      {street.explanation ? (
        <div className="reason" style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #1f2937" }}>
          <strong style={{ color: "#fbbf24", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Why this street is {street.tier}
          </strong>
          <div style={{ marginTop: 4 }}>{street.explanation}</div>
          {street.explanationSource && street.explanationSource !== "template" ? (
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
              analysis by {street.explanationSource}
            </div>
          ) : null}
        </div>
      ) : null}

      {competitors.length > 0 ? (
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #1f2937" }}>
          <strong style={{ color: "#94a3b8", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Existing competitors here ({competitors.length})
          </strong>
          <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4, lineHeight: 1.5 }}>
            {competitors.slice(0, 8).map((c) => c.name).join(" · ")}
            {competitors.length > 8 ? ` · +${competitors.length - 8} more` : ""}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BusinessPopup({ b, zoneTag }) {
  const t = b.tags || {};
  const phone = t.phone || t["contact:phone"];
  const website = t.website || t["contact:website"];
  const hours = t.opening_hours;
  const since = t.start_date;
  const brand = t.brand;
  const street = t["addr:street"] || b.street;
  const housenum = t["addr:housenumber"];
  const branches = b.branches || [];
  // The .biz-popup global class already gives us light .row text on the dark
  // popup background — don't override it with text-slate-900.
  return (
    <div className="biz-popup" style={{ maxWidth: 280 }}>
      {zoneTag ? (
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>
          {zoneTag}
        </div>
      ) : null}
      <div className="font-semibold text-sm text-slate-100">{b.name}</div>
      <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{b.category}</div>

      {street ? (
        <div className="row" style={{ fontSize: 11, marginTop: 4 }}>
          <span className="ico">📍</span> {housenum ? `${housenum} ` : ""}{street}
        </div>
      ) : null}
      {phone ? <div className="row" style={{ fontSize: 11, marginTop: 2 }}>📞 {phone}</div> : null}
      {website ? (
        <div className="row" style={{ fontSize: 11, marginTop: 2 }}>
          🔗 <a href={website} target="_blank" rel="noopener noreferrer">{shorten(website)}</a>
        </div>
      ) : null}
      {hours ? <div className="row" style={{ fontSize: 11, marginTop: 2 }}>⏰ {hours}</div> : null}
      {since ? (
        <div className="row" style={{ fontSize: 11, marginTop: 2 }}>📅 Operating since {since}</div>
      ) : (
        <div className="row" style={{ fontSize: 11, marginTop: 2, color: "#64748b" }}>📅 Year established: not in OSM</div>
      )}
      {brand ? <div className="row" style={{ fontSize: 11, marginTop: 2 }}>🏷️ Brand: {brand}</div> : null}

      <div style={{ marginTop: 6, paddingTop: 4, borderTop: "1px solid #1f2937" }}>
        {branches.length > 0 ? (
          <>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", fontWeight: 700 }}>
              {branches.length} other branch{branches.length === 1 ? "" : "es"} nearby
            </div>
            <ul style={{ margin: "4px 0 0 0", padding: 0, listStyle: "none", fontSize: 11, color: "#cbd5e1" }}>
              {branches.slice(0, 6).map((br) => (
                <li key={br.id}>• {br.street}</li>
              ))}
              {branches.length > 6 ? <li>• +{branches.length - 6} more</li> : null}
            </ul>
          </>
        ) : (
          <div style={{ fontSize: 10.5, color: "#64748b", fontStyle: "italic" }}>
            No other branches detected in this radius
          </div>
        )}
      </div>
    </div>
  );
}

function ShopOpportunityPopup({ rec, agencies, zoneTag }) {
  const list = agencies?.agencies || [];
  return (
    <div style={{ maxWidth: 260 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#10b981", fontWeight: 700 }}>
        {zoneTag ? `${zoneTag} · ` : ""}Shop opportunity area
      </div>
      <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 13, marginTop: 2 }}>{rec.street}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
        {rec.tier?.toUpperCase()} · score {rec.score}{rec.highway ? ` · ${rec.highway}` : ""}
      </div>
      <div style={{ fontSize: 11.5, color: "#cbd5e1", marginTop: 8, lineHeight: 1.5 }}>
        We don't host live shop listings — that requires a paid real-estate API. Use these
        portals to see shops <strong style={{ color: "#fbbf24" }}>currently for rent or sale</strong> in this area:
      </div>
      {list.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {list.slice(0, 4).map((a, i) => (
            <a
              key={i}
              href={a.searchUrl}
              target="_blank"
              rel="noreferrer noopener"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 8px",
                borderRadius: 6,
                background: "rgba(6, 182, 212, 0.12)",
                border: "1px solid rgba(6, 182, 212, 0.4)",
                color: "#a5f3fc",
                fontSize: 11.5,
                textDecoration: "none",
              }}
            >
              <span style={{ fontWeight: 600 }}>{a.name}</span>
              <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase" }}>{a.listingType} →</span>
            </a>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
          Property-agency lookup needs the OpenRouter LLM. Set OPENROUTER_API_KEY in .env.local.
        </div>
      )}
    </div>
  );
}

function RecommendationPopup({ rec, rank, zoneTag, isFavorite, onToggleFavorite }) {
  return (
    <div className="rec-popup" style={{ maxWidth: 300 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span className="badge">{zoneTag ? `${zoneTag} · ` : ""}★ Recommended #{rank}</span>
        {/* Favourite toggle — persists to localStorage per zone, surfaces on
            the dashboard zone card so the agent can revisit later. */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggleFavorite?.(); }}
          title={isFavorite ? "Remove from saved recommendations" : "Save this recommendation to this zone"}
          style={{
            background: isFavorite ? "rgba(251, 191, 36, 0.25)" : "transparent",
            border: isFavorite ? "1px solid #fbbf24" : "1px solid #475569",
            color: isFavorite ? "#fde68a" : "#cbd5e1",
            borderRadius: 6,
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 13,
            lineHeight: 1,
            fontWeight: 700,
          }}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>
      <div className="font-semibold text-sm text-slate-100 mt-1">{rec.street}</div>
      <div className="summary">
        {rec.tier?.toUpperCase()} · score {rec.score}{rec.highway ? ` · ${rec.highway}` : ""}
      </div>
      <div className="summary">{rec.summary}</div>

      {rec.nearbyAnchors && rec.nearbyAnchors.length > 0 ? (
        <div className="summary" style={{ paddingTop: 6, marginTop: 6, borderTop: "1px solid #1f2937" }}>
          <strong style={{ color: "#94a3b8" }}>Footfall drivers nearby:</strong>
          <ul style={{ margin: "4px 0 0 0", padding: 0, listStyle: "none" }}>
            {rec.nearbyAnchors.slice(0, 4).map((a, j) => (
              <li key={j} style={{ fontSize: 11, color: "#cbd5e1" }}>
                • {a.label} (~{a.distance} m)
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rec.reason ? (
        <div className="reason" style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #1f2937" }}>
          <strong style={{ color: "#fbbf24", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Why this spot
          </strong>
          <div style={{ marginTop: 4 }}>{rec.reason}</div>
          {rec.reasonSource && rec.reasonSource !== "template" ? (
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
              analysis by {rec.reasonSource}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Property popup — bigger card with two thumbnail images at the top, then
// type pill, title, address, price, beds/baths/sqft, features. Images use
// the property's stored image (if any) plus a second deterministic
// picsum.photos thumbnail keyed by id so the row is always full.
function PropertyPopup({ p, filter, isFavourite, onToggleFavourite }) {
  const primaryImg = p.image || `https://picsum.photos/seed/${encodeURIComponent(p.id || "x")}_a/360/200`;
  const secondaryImg = `https://picsum.photos/seed/${encodeURIComponent(p.id || "x")}_b/360/200`;
  return (
    <div style={{ width: 320 }}>
      {/* Image strip — two related shots so the popup feels like a listing
          preview rather than a tag tooltip. */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8 }}>
        <img
          src={primaryImg}
          alt=""
          loading="lazy"
          style={{
            width: "100%", height: 96, objectFit: "cover",
            borderRadius: 6, border: "1px solid #1f2937", background: "#0f172a",
          }}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
        />
        <img
          src={secondaryImg}
          alt=""
          loading="lazy"
          style={{
            width: "100%", height: 96, objectFit: "cover",
            borderRadius: 6, border: "1px solid #1f2937", background: "#0f172a",
          }}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {filter ? (
              <span style={{
                fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em",
                fontWeight: 700, color: filter.color,
                padding: "2px 6px", borderRadius: 4,
                background: `${filter.color}22`,
                border: `1px solid ${filter.color}55`,
              }}>{filter.icon} {filter.label}</span>
            ) : null}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4, color: "#f1f5f9", lineHeight: 1.25 }}>
            {p.title}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {p.building}{p.area ? `, ${p.area}` : ""}
          </div>
        </div>
        {/* Favourite star */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onToggleFavourite?.(p.id); }}
          title={isFavourite ? "Remove from favourites" : "Save to favourites"}
          style={{
            background: isFavourite ? "rgba(251, 191, 36, 0.25)" : "transparent",
            border: isFavourite ? "1px solid #fbbf24" : "1px solid #475569",
            color: isFavourite ? "#fde68a" : "#cbd5e1",
            borderRadius: 6,
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            fontWeight: 700,
          }}
        >
          {isFavourite ? "★" : "☆"}
        </button>
      </div>

      <div style={{ fontWeight: 700, color: "#fbbf24", marginTop: 6, fontSize: 14 }}>
        {p.listing === "rent"
          ? `AED ${Number(p.price).toLocaleString()}/year`
          : `AED ${Number(p.price).toLocaleString()}`}
      </div>
      <div style={{ fontSize: 11, marginTop: 4, color: "#cbd5e1" }}>
        {p.beds ? `${p.beds} BR` : "Studio"} · {p.baths} bath · {Number(p.area_sqft || 0).toLocaleString()} ft²
      </div>
      {p.features && p.features.length > 0 ? (
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 6, lineHeight: 1.4 }}>
          {p.features.slice(0, 6).join(" · ")}
        </div>
      ) : null}
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 6, paddingTop: 6, borderTop: "1px solid #1f2937" }}>
        📍 {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}
      </div>
    </div>
  );
}

function shorten(url) {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
}
