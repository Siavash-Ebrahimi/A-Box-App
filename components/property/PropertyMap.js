"use client";

// Interactive Leaflet map for the Property section.
//   - Renders 1 or 2 radius circles (Compare Two Areas mode = 2 circles)
//   - Renders a pin per property matching the active filters
//   - Pins are colour-coded by their primary filter (For Sale / For Rent / Airbnb…)
//     and carry a tiny price label so the agent can scan without clicking
//   - Picking a new area in compare mode happens by clicking the map; the parent
//     decides whether that click sets area 1 or area 2.

import { useEffect } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const AREA_COLORS = ["#3b82f6", "#10b981"];

// Map clicks → parent decides which area they update.
function ClickRelay({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyTo({ target, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], zoom, { duration: 0.7 });
  }, [target?.lat, target?.lng, zoom, map]);
  return null;
}

function priceLabel(p) {
  if (!p) return "—";
  const v = p.price >= 1_000_000
    ? `${(p.price / 1_000_000).toFixed(p.price >= 10_000_000 ? 0 : 1)}M`
    : p.price >= 1_000
      ? `${Math.round(p.price / 1_000)}K`
      : `${p.price}`;
  return p.listing === "rent" ? `${v}/y` : v;
}

// Custom property pin — drop-shape with filter colour and a small price label.
// A teal/blue ring is added when the property is the user's selection for compare.
function propertyIcon(color, price, selected, selectionRank) {
  const ring = selected
    ? `<circle cx="22" cy="22" r="20" fill="none" stroke="#06b6d4" stroke-width="3"/>`
    : "";
  const badge = selected && selectionRank
    ? `<circle cx="36" cy="8" r="8" fill="#06b6d4" stroke="white" stroke-width="2"/>
       <text x="36" y="11.5" text-anchor="middle" font-size="10" font-weight="800" fill="white" font-family="-apple-system,sans-serif">${selectionRank}</text>`
    : "";
  const html = `
    <svg width="44" height="56" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.55));">
      ${ring}
      <path d="M22 4 C 11 4 4 12 4 22 C 4 33 22 52 22 52 C 22 52 40 33 40 22 C 40 12 33 4 22 4 Z"
            fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <rect x="11" y="14" width="22" height="12" rx="2.5" fill="#ffffff"/>
      <text x="22" y="23" text-anchor="middle" font-size="9.5" font-weight="800"
            font-family="-apple-system,BlinkMacSystemFont,sans-serif"
            fill="${color}">${price}</text>
      ${badge}
    </svg>`;
  return L.divIcon({
    className: "property-pin",
    html,
    iconSize: [44, 56],
    iconAnchor: [22, 54],
    popupAnchor: [0, -50],
  });
}

export default function PropertyMap({
  area1, radius1,
  area2, radius2,
  properties,            // already filtered by area + filters
  onMapClick,            // (latlng) → parent updates area1 or area2
  flyTarget,             // optional center to fly to
  onPropertyClick,       // (property) → parent opens detail / sets compare slot
  comparePick1Id,        // property ID currently picked as compare slot 1
  comparePick2Id,        // property ID currently picked as compare slot 2
  initialCenter = { lat: 25.1972, lng: 55.2744 }, // Downtown Dubai default
}) {
  return (
    <MapContainer
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={13}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickRelay onMapClick={onMapClick} />
      <FlyTo target={flyTarget} />

      {/* Area 1 radius */}
      {area1 ? (
        <Circle
          center={[area1.lat, area1.lng]}
          radius={radius1}
          pathOptions={{
            color: AREA_COLORS[0],
            weight: 2.5,
            opacity: 0.9,
            fillColor: AREA_COLORS[0],
            fillOpacity: 0.06,
            dashArray: "8,6",
          }}
        />
      ) : null}

      {/* Area 2 radius (compare mode) */}
      {area2 ? (
        <Circle
          center={[area2.lat, area2.lng]}
          radius={radius2}
          pathOptions={{
            color: AREA_COLORS[1],
            weight: 2.5,
            opacity: 0.9,
            fillColor: AREA_COLORS[1],
            fillOpacity: 0.06,
            dashArray: "8,6",
          }}
        />
      ) : null}

      {/* Property pins */}
      {properties.map((p) => {
        const isPick1 = comparePick1Id === p.id;
        const isPick2 = comparePick2Id === p.id;
        const selected = isPick1 || isPick2;
        const rank = isPick1 ? 1 : isPick2 ? 2 : null;
        const icon = propertyIcon(p._color, priceLabel(p), selected, rank);
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={icon}
            eventHandlers={{ click: () => onPropertyClick(p) }}
          >
            <Popup>
              <div className="text-slate-900" style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                  {p.building}, {p.area}
                </div>
                <div style={{ fontWeight: 700, color: "#b45309", marginTop: 4, fontSize: 13 }}>
                  {p.listing === "rent" ? `AED ${p.price.toLocaleString()}/yr` : `AED ${p.price.toLocaleString()}`}
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
