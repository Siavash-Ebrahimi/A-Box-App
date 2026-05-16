"use client";

// Interactive map for picking a working zone: click anywhere → pin drops, radius
// circle appears, sidebar shows confirm/cancel. Saved zones are rendered as
// translucent circles so the agent can see their whole working coverage at a glance.

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DUBAI_CENTER = { lat: 25.1972, lng: 55.2744 };
const ZONE_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899"];
const GOLD_HIGHLIGHT = "#facc15";
const CHECK_GREEN    = "#22c55e";

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
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

// Plain coloured dot + price chip. No check badges — selection lives in the
// sidebar checklist, and a marker only renders if its property is checked.
function propertyDotIcon({ color, price }) {
  const html = `
    <div style="display:flex; flex-direction:column; align-items:center; pointer-events:auto;">
      <span style="display:block; width:14px; height:14px; border-radius:50%; background:${color}; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.5);"></span>
      <div style="margin-top:2px; padding:1px 5px; border-radius:6px; background:#0b1220e0; color:#fff; font-size:9.5px; font-weight:700; font-family:-apple-system,sans-serif; white-space:nowrap;">
        ${price}
      </div>
    </div>`;
  return L.divIcon({
    className: "area-prop-marker",
    html,
    iconSize: [50, 36],
    iconAnchor: [25, 17],
    popupAnchor: [0, -16],
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

const FILTER_COLOR_FOR_ACTIVITY = {
  sell: "#f59e0b",
  buy: "#10b981",
  rent: "#06b6d4",
  airbnb: "#ec4899",
  hotel: "#a855f7",
  office: "#3b82f6",
  retail: "#ec4899",
  manufacturing: "#f97316",
};
function colorForProperty(p) {
  const acts = p.activities || [];
  for (const a of acts) {
    if (FILTER_COLOR_FOR_ACTIVITY[a]) return FILTER_COLOR_FOR_ACTIVITY[a];
  }
  return "#94a3b8";
}

export default function AreaMap({
  savedZones,
  pending,
  pendingRadius,
  focusZone,
  properties = [],   // ONLY user-checked properties — already filtered by parent
  onPick,
}) {
  // Priority for the map's "current focus":
  //   1) Dashboard told us to focus a specific saved zone (clicked snap-card)
  //   2) The agent is actively configuring a new pending pin
  //   3) Fall back to the most recently saved zone
  const focusTarget = focusZone || pending || savedZones[savedZones.length - 1] || null;
  const focusZoom = focusZone ? radiusToZoom(focusZone.radius) : 14;

  return (
    <MapContainer
      center={[DUBAI_CENTER.lat, DUBAI_CENTER.lng]}
      zoom={11}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler onPick={onPick} />
      <RecenterOnNewZone target={focusTarget} zoom={focusZoom} />

      {/* Persisted zones */}
      {savedZones.map((z, i) => (
        <Circle
          key={z.id}
          center={[z.lat, z.lng]}
          radius={z.radius}
          pathOptions={{
            color: ZONE_PALETTE[i % ZONE_PALETTE.length],
            weight: 2,
            fillColor: ZONE_PALETTE[i % ZONE_PALETTE.length],
            fillOpacity: 0.08,
          }}
        >
          <Popup>
            <div className="text-slate-900">
              <div className="font-semibold">{z.label || "Working zone"}</div>
              <div className="text-xs">{(z.radius / 1000).toFixed(1)} km radius</div>
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Pending pin + radius preview while the agent is configuring a new zone */}
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

      {/* Property markers — only the ones the user has ticked in the sidebar.
          Plain dot + price chip. */}
      {properties.map((p) => {
        return (
          <Marker
            key={`prop-${p.id}`}
            position={[p.lat, p.lng]}
            icon={propertyDotIcon({
              color: colorForProperty(p),
              price: shortPrice(p),
            })}
            zIndexOffset={500}
          >
            <Popup>
              <div className="text-slate-900" style={{ minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                  {p.building}, {p.area}
                </div>
                <div style={{ fontWeight: 700, color: "#b45309", marginTop: 4, fontSize: 13 }}>
                  {p.listing === "rent"
                    ? `AED ${p.price.toLocaleString()}/yr`
                    : `AED ${p.price.toLocaleString()}`}
                </div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  {p.beds || "Studio"} BR · {p.baths} bath · {p.area_sqft.toLocaleString()} ft²
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
