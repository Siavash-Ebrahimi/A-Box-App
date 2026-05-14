"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// First screen the user lands on when entering /property: pick a location on
// the map, then continue. Mirrors the LocationPicker UX so the whole app feels
// consistent. Defaults to Downtown Dubai.

const DEFAULT_CENTER = { lat: 25.1972, lng: 55.2744 };

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
}

function CenterOn({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], 13);
  }, [center?.lat, center?.lng, map]);
  return null;
}

export default function PropertyEntry({ onConfirm, onBackToHome }) {
  const [pinned, setPinned] = useState(null);
  const [label, setLabel] = useState(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (pinned && markerRef.current) {
      const t = setTimeout(() => markerRef.current?.openPopup(), 30);
      return () => clearTimeout(t);
    }
  }, [pinned?.lat, pinned?.lng]);

  // Reverse-geocode pin → friendly label
  useEffect(() => {
    if (!pinned) { setLabel(null); return; }
    let cancelled = false;
    setLabel("Resolving address…");
    fetch(`/api/reverse?lat=${pinned.lat}&lon=${pinned.lng}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const a = d?.address;
        const part1 = a?.neighbourhood || a?.suburb || a?.city_district || a?.quarter;
        const part2 = a?.city || a?.town || a?.county;
        const part3 = a?.country;
        const parts = [part1, part2, part3].filter(Boolean);
        const dedup = parts.filter((p, i) => p !== parts[i - 1]);
        setLabel(dedup.join(", ") || "Picked location");
      })
      .catch(() => { if (!cancelled) setLabel("Picked location"); });
    return () => { cancelled = true; };
  }, [pinned?.lat, pinned?.lng]);

  function handleConfirm() {
    if (!pinned) return;
    onConfirm({ lat: pinned.lat, lng: pinned.lng, label });
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <header className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
        <button
          type="button"
          onClick={onBackToHome}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          ← Back to A-Box home
        </button>
        <div className="flex items-center gap-1 text-sm font-semibold tracking-tight">
          <span className="text-amber-400">A</span>
          <span className="text-slate-100">-Box</span>
          <span className="text-slate-500 mx-1">·</span>
          <span className="text-slate-300">Property Discovery</span>
        </div>
        <div className="ml-auto text-xs text-slate-400 truncate max-w-[40ch]">
          {pinned ? (label || "Resolving…") : "Click anywhere on the map to set your search center"}
        </div>
      </header>

      <div className="flex-1 relative">
        <MapContainer
          center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={12}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CenterOn center={DEFAULT_CENTER} />
          <ClickHandler onPick={setPinned} />
          {pinned ? (
            <Marker ref={markerRef} position={[pinned.lat, pinned.lng]}>
              <Popup minWidth={240} closeButton={false} autoClose={false} closeOnClick={false}>
                <div className="confirm-popup">
                  <div className="confirm-title">Search properties here?</div>
                  <div className="confirm-address">{label || "Resolving address…"}</div>
                  <div className="confirm-actions">
                    <button type="button" className="confirm-btn confirm-yes" onClick={handleConfirm}>
                      ✓ Yes, explore here
                    </button>
                    <button type="button" className="confirm-btn confirm-no" onClick={() => setPinned(null)}>
                      Cancel
                    </button>
                  </div>
                  <div className="confirm-hint">Or click somewhere else to move the pin.</div>
                </div>
              </Popup>
            </Marker>
          ) : null}
        </MapContainer>

        {!pinned ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="bg-slate-900/95 border border-cyan-500/40 rounded-lg shadow-2xl px-4 py-2.5 backdrop-blur">
              <span className="text-xs text-cyan-300 font-semibold">
                Click anywhere on the map to set your search center
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
