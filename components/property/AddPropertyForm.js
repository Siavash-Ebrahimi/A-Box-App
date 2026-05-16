"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Modal form for the "Add Property" flow. Receives the lat/lng where the user
// clicked on the map and lets them fill in the rest. On Save the parent
// persists to localStorage and the new property starts showing on the map.

const TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "studio", label: "Studio" },
  { value: "penthouse", label: "Penthouse" },
  { value: "office", label: "Office" },
  { value: "hotel", label: "Hotel" },
  { value: "retail", label: "Shop / Retail" },
  { value: "warehouse", label: "Manufacture / Warehouse" },
];

export default function AddPropertyForm({ coords, onClose, onSave }) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("apartment");
  const [listing, setListing] = useState("sale");
  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("1");
  const [baths, setBaths] = useState("1");
  const [areaSqft, setAreaSqft] = useState("");
  const [building, setBuilding] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [features, setFeatures] = useState("");

  useEffect(() => {
    setMounted(true);
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  if (!mounted) return null;

  const numericPrice = Number(price) || 0;
  const canSave = !!coords && title.trim() && numericPrice > 0;

  function handleSave(e) {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      title: title.trim(),
      type,
      listing,
      price: numericPrice,
      beds: type === "studio" ? 0 : (parseInt(beds, 10) || 0),
      baths: parseInt(baths, 10) || 1,
      area_sqft: parseInt(areaSqft, 10) || 800,
      building: building.trim() || "User-added",
      area: areaLabel.trim() || "Custom area",
      lat: coords.lat,
      lng: coords.lng,
      features: features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
    });
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add new property"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        className="max-w-xl w-full max-h-[92vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Add new property</h2>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              At {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "—"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-lg w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Title *" full>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              autoFocus maxLength={80} placeholder="e.g. Cozy 2BR Marina Loft"
              className="input" />
          </Field>

          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value)} className="input">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <Field label="Listing">
            <select value={listing} onChange={(e) => setListing(e.target.value)} className="input">
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
          </Field>

          <Field label="Price (AED) *">
            <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder={listing === "rent" ? "Annual rent" : "Sale price"} className="input" />
          </Field>

          <Field label="Area (sqft)">
            <input type="number" min="0" value={areaSqft} onChange={(e) => setAreaSqft(e.target.value)}
              placeholder="e.g. 1250" className="input" />
          </Field>

          <Field label="Bedrooms">
            <input type="number" min="0" max="20" value={beds} onChange={(e) => setBeds(e.target.value)}
              className="input" />
          </Field>

          <Field label="Bathrooms">
            <input type="number" min="1" max="20" value={baths} onChange={(e) => setBaths(e.target.value)}
              className="input" />
          </Field>

          <Field label="Building / Project" full>
            <input type="text" value={building} onChange={(e) => setBuilding(e.target.value)}
              maxLength={60} placeholder="e.g. Marina Heights Tower 1" className="input" />
          </Field>

          <Field label="Area name" full>
            <input type="text" value={areaLabel} onChange={(e) => setAreaLabel(e.target.value)}
              maxLength={40} placeholder="e.g. Dubai Marina" className="input" />
          </Field>

          <Field label="Features (comma-separated)" full>
            <input type="text" value={features} onChange={(e) => setFeatures(e.target.value)}
              maxLength={200} placeholder="e.g. Sea view, Furnished, Pool" className="input" />
          </Field>
        </div>

        <footer className="px-5 py-3 border-t border-slate-800 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save property
          </button>
        </footer>

        <style jsx>{`
          .input {
            width: 100%;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 12.5px;
            color: #f1f5f9;
            outline: none;
          }
          .input:focus { border-color: #f59e0b; }
        `}</style>
      </form>
    </div>,
    document.body,
  );
}

function Field({ label, full, children }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}
