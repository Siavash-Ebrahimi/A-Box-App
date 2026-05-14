"use client";

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
  useMap,
} from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const COMPETITOR_ICON = L.divIcon({
  className: "comp-marker",
  html: '<div class="comp-pin"></div>',
  iconSize: [28, 32],
  iconAnchor: [14, 28],
  popupAnchor: [0, -26],
});

// Cyan numbered star — contrasts with gold/silver/bronze polylines and the red competitor pins.
function recommendedIcon(rank) {
  const html = `
    <svg width="52" height="56" viewBox="0 0 52 56" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.6));">
      <polygon
        points="26,4 32,22 50,22 35,33 41,52 26,40 11,52 17,33 2,22 20,22"
        fill="#06b6d4"
        stroke="#ffffff"
        stroke-width="3"
        stroke-linejoin="round" />
      <text x="26" y="33" text-anchor="middle" font-size="18" font-weight="800"
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fill="#ffffff">${rank}</text>
    </svg>`;
  return L.divIcon({
    className: "rec-marker",
    html,
    iconSize: [52, 56],
    iconAnchor: [26, 30],
    popupAnchor: [0, -28],
  });
}

// Shop-opportunity icon — small storefront pin placed at logical points along top streets.
// On click, the popup links to real listings on the property portals (we cannot host live
// listings without a paid real-estate API).
const SHOP_ICON = L.divIcon({
  className: "shop-marker",
  html: `
    <svg width="32" height="38" viewBox="0 0 32 38" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6));">
      <path d="M16 0 C 7.2 0 0 7.2 0 16 C 0 27 16 38 16 38 C 16 38 32 27 32 16 C 32 7.2 24.8 0 16 0 Z"
            fill="#10b981" stroke="#ffffff" stroke-width="2"/>
      <rect x="9" y="10" width="14" height="3" fill="#ffffff" rx="0.5"/>
      <rect x="9" y="14" width="4" height="6" fill="#ffffff"/>
      <rect x="14" y="14" width="4" height="6" fill="#ffffff"/>
      <rect x="19" y="14" width="4" height="6" fill="#ffffff"/>
    </svg>`,
  iconSize: [32, 38],
  iconAnchor: [16, 36],
  popupAnchor: [0, -34],
});

const TIER_STYLE = {
  gold:   { color: "#FFD700", weight: 9,  haloWeight: 14, opacity: 0.95 },
  silver: { color: "#C0C0C0", weight: 6,  haloWeight: 10, opacity: 0.9 },
  bronze: { color: "#CD7F32", weight: 5,  haloWeight: 9,  opacity: 0.85 },
};

// Compute 1–2 logical "shop opportunity" points along the longest path of a recommended street.
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

// Radar pulse + sweep that animates over the search radius while analysis is running.
function RadarOverlay({ center, radius, active }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) {
      setTick(0);
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, [active]);
  if (!active) return null;

  // Three pulse rings, staggered, each expanding from 0 → radius and fading out.
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
        center={[center.latitude, center.longitude]}
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

  // (Sweep line removed at user request — pulse rings alone are clear enough.)
  return <>{rings}</>;
}

const FOCUS_STYLE = { color: "#fbbf24", weight: 12, haloWeight: 18, opacity: 1, dash: "8,8" };

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], 17, { duration: 0.7 });
  }, [target, map]);
  return null;
}

export default function MapView({
  center,
  radius,
  streets,
  focused,
  onSelectStreet,
  recommendations = [],
  agencies = null,
  loading = false,
  enriching = false,
  phaseDone = 0,
}) {
  const busy = loading || enriching;
  // Phase 1: Overpass+scoring; Phase 2/3: LLM overview + details running in parallel.
  // phaseDone tells us how many of the 3 layers have completed so far.
  const phase = loading ? 1 : enriching ? (phaseDone >= 2 ? 3 : 2) : 0;
  const allStreets = useMemo(
    () => [...(streets.gold || []), ...(streets.silver || []), ...(streets.bronze || [])],
    [streets],
  );

  const competitorMarkers = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const s of allStreets) {
      for (const b of s.businesses) {
        if (!b.isCompetitor || seen.has(b.id)) continue;
        seen.add(b.id);
        // Carries through tags + branches so the popup can render full details.
        out.push({ ...b, street: s.street, tier: s.tier });
      }
    }
    return out;
  }, [allStreets]);

  // Render order: bronze → silver → gold so Gold draws on top.
  const renderOrder = useMemo(() => {
    const order = { bronze: 0, silver: 1, gold: 2 };
    return [...allStreets].sort((a, b) => order[a.tier] - order[b.tier]);
  }, [allStreets]);

  const focusTarget = focused ? focused.center : null;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={15}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Search radius — uses Google-Maps-style blue with dashed stroke for clarity. */}
        <Circle
          center={[center.latitude, center.longitude]}
          radius={radius}
          pathOptions={{
            color: "#3b82f6",
            weight: 2.5,
            opacity: 0.9,
            fillColor: "#3b82f6",
            fillOpacity: 0.08,
            dashArray: "8,6",
          }}
        />
        <Marker position={[center.latitude, center.longitude]}>
          <Popup>You are here</Popup>
        </Marker>

        {/* Halos (drawn first, beneath the colored line). */}
        {renderOrder.map((s) => {
          const isFocused = focused?.street === s.street;
          const style = isFocused ? FOCUS_STYLE : TIER_STYLE[s.tier];
          if (!s.paths || s.paths.length === 0) return null;
          return s.paths.map((path, i) => (
            <Polyline
              key={`halo-${s.street}-${i}`}
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

        {/* Colored polylines on top. Streets without geometry fall back to a marker. */}
        {renderOrder.map((s) => {
          const isFocused = focused?.street === s.street;
          const style = isFocused ? FOCUS_STYLE : TIER_STYLE[s.tier];
          if (s.paths && s.paths.length > 0) {
            return s.paths.map((path, i) => (
              <Polyline
                key={`line-${s.street}-${i}`}
                positions={path}
                pathOptions={{
                  color: style.color,
                  weight: style.weight,
                  opacity: style.opacity,
                  lineCap: "round",
                  lineJoin: "round",
                  dashArray: style.dash || undefined,
                }}
                eventHandlers={{ click: () => onSelectStreet?.(s) }}
              >
                <Tooltip sticky direction="top" offset={[0, -6]}>
                  <div className="text-slate-900">
                    <div className="font-semibold">{s.street}</div>
                    <div className="text-xs uppercase" style={{ color: TIER_STYLE[s.tier].color }}>
                      {s.tier} · score {Math.round(s.score)}
                    </div>
                  </div>
                </Tooltip>
              </Polyline>
            ));
          }
          return (
            <CircleMarker
              key={`pt-${s.street}`}
              center={[s.center.lat, s.center.lon]}
              radius={9}
              pathOptions={{
                color: TIER_STYLE[s.tier].color,
                fillColor: TIER_STYLE[s.tier].color,
                fillOpacity: 0.55,
                weight: 2,
              }}
              eventHandlers={{ click: () => onSelectStreet?.(s) }}
            >
              <Popup>
                <div className="text-slate-900">
                  <div className="font-semibold">{s.street}</div>
                  <div className="text-xs uppercase mt-0.5" style={{ color: TIER_STYLE[s.tier].color }}>
                    {s.tier} · score {Math.round(s.score)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Same-category business markers — red drop-pins. Click for full details. */}
        {competitorMarkers.map((b) => (
          <Marker key={b.id} position={[b.lat, b.lon]} icon={COMPETITOR_ICON}>
            <Popup>
              <BusinessPopup b={b} />
            </Popup>
          </Marker>
        ))}

        {/* Radar effect — runs through BOTH analysis phases (Phase 1: data, Phase 2: AI). */}
        <RadarOverlay center={center} radius={radius} active={busy} />

        {/* Shop-opportunity markers along the top recommended streets. They link to live
            listings on the property portals (we don't host real-time inventory). */}
        {!busy && recommendations.map((rec, i) =>
          shopSpotsForRec(rec, allStreets).map((sp, j) => (
            <Marker
              key={`shop-${i}-${j}`}
              position={[sp.lat, sp.lon]}
              icon={SHOP_ICON}
              zIndexOffset={500}
            >
              <Popup maxWidth={280}>
                <ShopOpportunityPopup rec={rec} agencies={agencies} />
              </Popup>
            </Marker>
          )),
        )}

        {/* AI-recommended specific spots — cyan numbered stars. */}
        {recommendations.map((r, i) => (
          <Marker
            key={`rec-${i}`}
            position={[r.lat, r.lon]}
            icon={recommendedIcon(i + 1)}
            zIndexOffset={1000}
          >
            <Popup maxWidth={320}>
              <div className="rec-popup" style={{ maxWidth: 300 }}>
                <span className="badge">★ Recommended #{i + 1}</span>
                <div className="font-semibold text-sm text-slate-100">{r.street}</div>
                <div className="summary">
                  {r.tier.toUpperCase()} · score {r.score}{r.highway ? ` · ${r.highway}` : ""}
                </div>
                <div className="summary">{r.summary}</div>

                {r.nearbyAnchors && r.nearbyAnchors.length > 0 ? (
                  <div className="summary" style={{ paddingTop: 4, borderTop: "1px solid #1f2937" }}>
                    <strong style={{ color: "#94a3b8" }}>Footfall drivers nearby:</strong>
                    <ul style={{ margin: "4px 0 0 0", padding: 0, listStyle: "none" }}>
                      {r.nearbyAnchors.slice(0, 4).map((a, j) => (
                        <li key={j} style={{ fontSize: 11, color: "#cbd5e1" }}>
                          • {a.label} (~{a.distance} m)
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="reason" style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #1f2937" }}>
                  <strong style={{ color: "#fbbf24", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Why this spot
                  </strong>
                  <div style={{ marginTop: 4 }}>{r.reason}</div>
                  {r.reasonSource && r.reasonSource !== "template" ? (
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                      analysis by {r.reasonSource}
                    </div>
                  ) : null}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Controlled detail popup — appears whenever a street is focused
            (clicked from the sidebar list or directly on its polyline). */}
        {focused ? (
          <Popup
            position={[focused.center.lat, focused.center.lon]}
            maxWidth={340}
            eventHandlers={{ remove: () => onSelectStreet?.(null) }}
          >
            <StreetDetailPopup street={focused} />
          </Popup>
        ) : null}

        <FlyTo target={focusTarget} />
      </MapContainer>

      {/* Floating progress card — runs through all 3 phases with stage-aware messaging. */}
      <MapProgressCard active={busy} phase={phase} phaseDone={phaseDone} />

      {/* Legend overlay. */}
      <div className="absolute bottom-4 right-4 z-[400] bg-slate-900/90 border border-slate-700 rounded-md px-3 py-2 text-[11px] text-slate-200 shadow-lg backdrop-blur">
        <div className="font-semibold text-slate-300 mb-1">Legend</div>
        <div className="flex items-center gap-2 mb-1">
          <svg width="18" height="18" viewBox="0 0 52 56" style={{ flexShrink: 0 }}>
            <polygon points="26,4 32,22 50,22 35,33 41,52 26,40 11,52 17,33 2,22 20,22"
                     fill="#06b6d4" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
          </svg>
          <span>Top-3 recommended spots (numbered)</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <svg width="14" height="16" viewBox="0 0 32 38" style={{ flexShrink: 0 }}>
            <path d="M16 0 C 7.2 0 0 7.2 0 16 C 0 27 16 38 16 38 C 16 38 32 27 32 16 C 32 7.2 24.8 0 16 0 Z"
                  fill="#10b981" stroke="#fff" strokeWidth="2" />
          </svg>
          <span>Shop opportunity (search live listings)</span>
        </div>
        <LegendRow color="#FFD700" label="Gold — high opportunity" thick />
        <LegendRow color="#C0C0C0" label="Silver — medium" />
        <LegendRow color="#CD7F32" label="Bronze — low" />
        <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-700">
          <span className="comp-pin" style={{ width: 14, height: 14, transform: "translateY(-2px) scale(0.6)" }} />
          <span>Existing same-category business</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block rounded" style={{ width: 14, height: 0, borderTop: "2.5px dashed #3b82f6" }} />
          <span>Search radius</span>
        </div>
      </div>
    </div>
  );
}

function StreetDetailPopup({ street }) {
  const b = street.breakdown;
  const competitors = street.businesses.filter((x) => x.isCompetitor);
  return (
    <div className="rec-popup" style={{ maxWidth: 320 }}>
      <span className={`tier-pill ${street.tier}`}>{street.tier}</span>
      <div className="font-semibold text-sm text-slate-100 mt-1">{street.street}</div>
      <div className="summary">
        Score {Math.round(street.score)}{street.highway ? ` · ${street.highway}` : ""}
      </div>

      <div style={{ marginTop: 6, padding: 6, background: "#0f172a", borderRadius: 6 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, fontSize: 10.5, color: "#94a3b8" }}>
          <div>Competitors<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.competitors}</span></div>
          <div>Density<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.density}</span></div>
          <div>Variety<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.variety}</span></div>
          <div>Transit<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.transit}</span></div>
          <div>Anchors<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.anchors}</span></div>
          <div>Residential<br /><span style={{ color: "#e5e7eb", fontWeight: 600 }}>{b.residential}</span></div>
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

function BusinessPopup({ b }) {
  const t = b.tags || {};
  const phone = t.phone || t["contact:phone"];
  const website = t.website || t["contact:website"];
  const hours = t.opening_hours;
  const since = t.start_date;
  const brand = t.brand;
  const street = t["addr:street"] || b.street;
  const housenum = t["addr:housenumber"];
  const branches = b.branches || [];

  return (
    <div className="biz-popup">
      <div className="font-semibold text-sm text-slate-100">{b.name}</div>
      <div className="text-xs text-slate-400 mt-0.5">{b.category}</div>

      {street ? (
        <div className="row"><span className="ico">📍</span><span>{housenum ? `${housenum} ` : ""}{street}</span></div>
      ) : null}
      {phone ? (
        <div className="row"><span className="ico">📞</span><span>{phone}</span></div>
      ) : null}
      {website ? (
        <div className="row"><span className="ico">🔗</span><a href={website} target="_blank" rel="noopener noreferrer">{shorten(website)}</a></div>
      ) : null}
      {hours ? (
        <div className="row"><span className="ico">⏰</span><span>{hours}</span></div>
      ) : null}
      {since ? (
        <div className="row"><span className="ico">📅</span><span>Operating since {since}</span></div>
      ) : (
        <div className="row"><span className="ico">📅</span><span className="text-slate-500">Year established: not in OSM</span></div>
      )}
      {brand ? (
        <div className="row"><span className="ico">🏷️</span><span>Brand: {brand}</span></div>
      ) : null}

      <div className="branches">
        {branches.length > 0 ? (
          <>
            <h5>{branches.length} other branch{branches.length === 1 ? "" : "es"} nearby</h5>
            <ul>
              {branches.slice(0, 6).map((br) => (
                <li key={br.id}>• {br.street}</li>
              ))}
              {branches.length > 6 ? <li>• +{branches.length - 6} more</li> : null}
            </ul>
          </>
        ) : (
          <h5>No other branches detected in this radius</h5>
        )}
      </div>
    </div>
  );
}

function shorten(url) {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
}

// Popup shown when the user clicks one of the green shop-opportunity markers along a
// recommended street. We're explicit that this is a "search-here" pin, not a fake listing.
function ShopOpportunityPopup({ rec, agencies }) {
  const list = agencies?.agencies || [];
  return (
    <div style={{ maxWidth: 260 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#10b981", fontWeight: 700 }}>
        Shop opportunity area
      </div>
      <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 13, marginTop: 2 }}>{rec.street}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
        {rec.tier?.toUpperCase()} · score {rec.score}{rec.highway ? ` · ${rec.highway}` : ""}
      </div>
      <div style={{ fontSize: 11.5, color: "#cbd5e1", marginTop: 8, lineHeight: 1.5 }}>
        We don't host live shop listings — that requires a paid real-estate API. Use these
        portals to see shops <strong>currently for rent or sale</strong> in this area:
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
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
          Property-agency lookup needs the OpenRouter LLM. Set OPENROUTER_API_KEY in .env.local.
        </div>
      )}
    </div>
  );
}

// Floating progress card pinned to the top-center of the map while analysis runs.
// `phase` is 1 (data fetch), 2 (overview LLM still running) or 3 (only details LLM left).
// `phaseDone` is 1, 2 or 3 — how many of the three layers have finished so far.
// The radar continues animating across all three phases, so the user keeps a clear
// "system is working" cue until everything is on screen.
function MapProgressCard({ active, phase = 0, phaseDone = 0 }) {
  const [seconds, setSeconds] = useState(0);
  // Re-zero the timer at each phase transition.
  useEffect(() => {
    if (!active) { setSeconds(0); return; }
    const start = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active, phase]);

  if (!active) return null;
  const mm = String(Math.floor(seconds / 60));
  const ss = String(seconds % 60).padStart(2, "0");
  const dots = ".".repeat(seconds % 4);

  const title =
    phase === 1
      ? "Step 1 of 3 · Reading the map"
      : phase === 2
        ? "Steps 2 & 3 of 3 · AI is writing your analysis"
        : phase === 3
          ? "Step 3 of 3 · Finalising per-street insights"
          : "Processing your request";
  const subtitle =
    phase === 1
      ? "Finding nearby businesses, scoring streets, building recommendations…"
      : phase === 2
        ? "Market overview and per-street insights are loading in parallel. Sections will appear layer by layer."
        : phase === 3
          ? "The market overview is on screen. Per-street paragraphs are landing now — almost done."
          : "";

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
      <div className="bg-slate-900/95 border border-cyan-500/40 rounded-lg shadow-2xl px-4 py-3 backdrop-blur min-w-[320px] max-w-[440px]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs text-cyan-300 font-semibold uppercase tracking-wider">
            {title}{dots}
          </span>
          <span className="ml-auto text-[11px] text-slate-400 tabular-nums">T+ {mm}:{ss}</span>
        </div>
        {subtitle ? (
          <div className="text-[11.5px] text-slate-300 leading-snug mt-1.5">{subtitle}</div>
        ) : null}
        {/* Tiny "1/3, 2/3, 3/3" progress dots for visual reassurance. */}
        <div className="flex items-center gap-1.5 mt-2">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`inline-block w-2 h-2 rounded-full ${
                phaseDone >= n
                  ? "bg-emerald-400"
                  : phaseDone + 1 === n
                    ? "bg-cyan-400 animate-pulse"
                    : "bg-slate-700"
              }`}
            />
          ))}
          <span className="text-[10px] text-slate-500 ml-1">
            {phaseDone} of 3 layers complete
          </span>
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, thick }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block rounded"
        style={{ width: 18, height: thick ? 5 : 3, backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}
