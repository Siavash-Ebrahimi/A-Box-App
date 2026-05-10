"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

function CenterOn({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lon], 12);
  }, [center?.lat, center?.lon, map]);
  return null;
}

export default function PinMap({ initialCenter, pinned, pinLabel, onPick, onConfirm, onCancel }) {
  const markerRef = useRef(null);

  // Auto-open the confirmation popup whenever a new pin lands.
  useEffect(() => {
    if (pinned && markerRef.current) {
      // Tiny delay so Leaflet finishes rendering the marker before opening.
      const t = setTimeout(() => markerRef.current?.openPopup(), 30);
      return () => clearTimeout(t);
    }
  }, [pinned?.lat, pinned?.lon]);

  return (
    <MapContainer
      center={[initialCenter.lat, initialCenter.lon]}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CenterOn center={initialCenter} />
      <ClickHandler onPick={onPick} />
      {pinned ? (
        <Marker ref={markerRef} position={[pinned.lat, pinned.lon]}>
          <Popup minWidth={240} closeButton={false} autoClose={false} closeOnClick={false}>
            <div className="confirm-popup">
              <div className="confirm-title">Use this location?</div>
              <div className="confirm-address">
                {pinLabel && !pinLabel.startsWith("(") && !pinLabel.startsWith("Resolving")
                  ? pinLabel
                  : pinLabel || "Resolving address…"}
              </div>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="confirm-btn confirm-yes"
                  onClick={onConfirm}
                >
                  ✓ Yes, analyze here
                </button>
                <button
                  type="button"
                  className="confirm-btn confirm-no"
                  onClick={onCancel}
                >
                  Cancel
                </button>
              </div>
              <div className="confirm-hint">Or click another spot to move the pin.</div>
            </div>
          </Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
