"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const PinMap = dynamic(() => import("./PinMap"), { ssr: false });

export default function LocationPicker({ onLocationChosen, onBackToHome }) {
  const [mode, setMode] = useState("intro");        // "intro" | "pick"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [pinned, setPinned] = useState(null);       // { lat, lon } chosen on the map
  const [pinLabel, setPinLabel] = useState(null);   // human-readable address for the pin
  const [defaultCenter, setDefaultCenter] = useState({ lat: 25.2048, lon: 55.2708 });

  // Get a sensible default center (the user's IP city) for the pin-drop map.
  useEffect(() => {
    if (mode !== "pick") return;
    fetch("/api/location")
      .then((r) => r.json())
      .then((d) => {
        if (d?.latitude != null && d?.longitude != null) {
          setDefaultCenter({ lat: d.latitude, lon: d.longitude });
        }
      })
      .catch(() => {});
  }, [mode]);

  // Reverse-geocode whenever the pin moves.
  useEffect(() => {
    if (!pinned) {
      setPinLabel(null);
      return;
    }
    let cancelled = false;
    setPinLabel("Resolving address…");
    fetch(`/api/reverse?lat=${pinned.lat}&lon=${pinned.lon}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setPinLabel(d?.label || "(no address found)");
      })
      .catch(() => {
        if (!cancelled) setPinLabel("(address lookup failed)");
      });
    return () => {
      cancelled = true;
    };
  }, [pinned]);

  function ipFallbackThenChoose() {
    return fetch("/api/location")
      .then((r) => r.json())
      .then((d) => {
        onLocationChosen({
          city: d.city || "Your location",
          country: d.country || null,
          latitude: d.latitude,
          longitude: d.longitude,
          source: d.source || "ip",
        });
      });
  }

  function useCurrentLocation() {
    setBusy(true);
    setError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      ipFallbackThenChoose()
        .catch(() => setError("Could not detect location."))
        .finally(() => setBusy(false));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChosen({
          city: "Your location",
          country: null,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: "browser-gps",
        });
        setBusy(false);
      },
      () => {
        ipFallbackThenChoose()
          .catch(() => setError("Could not detect location. Try picking on the map instead."))
          .finally(() => setBusy(false));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function confirmPinned() {
    if (!pinned) return;
    const friendly =
      pinLabel && !pinLabel.startsWith("(") && !pinLabel.startsWith("Resolving")
        ? pinLabel.split(",").slice(0, 2).join(", ")
        : "Picked location";
    onLocationChosen({
      city: friendly,
      country: null,
      latitude: pinned.lat,
      longitude: pinned.lon,
      source: "pin",
      label: pinLabel,
    });
  }

  if (mode === "intro") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
          {onBackToHome ? (
            <button
              type="button"
              onClick={onBackToHome}
              className="text-[11px] text-slate-500 hover:text-slate-300 mb-3 transition"
            >
              ← Back to A-Box home
            </button>
          ) : null}
          <div className="mb-5">
            <h1 className="text-xl font-semibold tracking-tight">
              <span className="text-amber-400">A</span>-Box · Business
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Use your current location, or choose another location?
            </p>
          </div>

          <div className="text-sm text-slate-300 mb-4">Where do you want to analyze?</div>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={busy}
            className="w-full mb-3 p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition text-left disabled:opacity-50"
          >
            <div className="font-medium text-amber-200">📍 Use my current location</div>
            <div className="text-xs text-amber-200/70 mt-1">
              Browser will ask permission. Most accurate.
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("pick")}
            disabled={busy}
            className="w-full p-4 rounded-lg border border-slate-700 bg-slate-800/40 hover:bg-slate-800 transition text-left disabled:opacity-50"
          >
            <div className="font-medium text-slate-200">🗺️ Pick a location on the map</div>
            <div className="text-xs text-slate-400 mt-1">
              Click anywhere on the map to drop a pin — useful for analyzing a different city or
              an address you don&apos;t live at.
            </div>
          </button>

          {busy ? <div className="text-xs text-slate-400 mt-3">Detecting location…</div> : null}
          {error ? <div className="text-xs text-red-300 mt-3">{error}</div> : null}
        </div>
      </div>
    );
  }

  // mode === "pick"
  // Confirmation now happens in a popup attached to the pin itself — clearer UX
  // than a top-bar button that's far from where the user just clicked.
  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setMode("intro");
            setPinned(null);
            setPinLabel(null);
          }}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          ← Back
        </button>
        <div className="text-sm font-medium">Pick a location on the map</div>
        <div className="text-xs text-slate-400 ml-auto">
          {pinned ? "Confirm in the popup ↓" : "Click anywhere on the map to drop a pin"}
        </div>
      </div>
      <div className="flex-1 relative">
        <PinMap
          initialCenter={defaultCenter}
          pinned={pinned}
          pinLabel={pinLabel}
          onPick={setPinned}
          onConfirm={confirmPinned}
          onCancel={() => { setPinned(null); setPinLabel(null); }}
        />
      </div>
    </div>
  );
}
