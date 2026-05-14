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

export default function AreaMap({ savedZones, pending, pendingRadius, focusZone, onPick }) {
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
    </MapContainer>
  );
}
