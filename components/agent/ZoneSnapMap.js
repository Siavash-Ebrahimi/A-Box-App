"use client";

// Tiny non-interactive Leaflet map for a single zone — used by the dashboard
// "Your working zones" cards as a visual snapshot. All map interaction is disabled
// so the parent card's click handler can navigate the user to the Working Areas view.

import { MapContainer, TileLayer, Circle } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function radiusToZoom(r) {
  if (r <= 500) return 15;
  if (r <= 1000) return 14;
  if (r <= 1500) return 13;
  if (r <= 3000) return 12;
  return 11;
}

export default function ZoneSnapMap({ zone, color = "#06b6d4" }) {
  const zoom = radiusToZoom(zone.radius);
  return (
    <div className="absolute inset-0 pointer-events-none">
      <MapContainer
        center={[zone.lat, zone.lng]}
        zoom={zoom}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        className="h-full w-full"
        style={{ background: "#0f172a" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle
          center={[zone.lat, zone.lng]}
          radius={zone.radius}
          pathOptions={{
            color,
            weight: 2.5,
            fillColor: color,
            fillOpacity: 0.18,
          }}
        />
      </MapContainer>
    </div>
  );
}
