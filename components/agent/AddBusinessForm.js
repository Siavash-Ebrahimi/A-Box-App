"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BUSINESS_CATEGORIES } from "./BusinessRibbon";

// Companion to AddPropertyForm. Lets the agent drop a custom business marker
// on the Working Area map — e.g. a competitor they want to keep an eye on, or
// a partner location. Persists via lib/business/userBusinesses.js.

export default function AddBusinessForm({ coords, defaultCategory = "mens_salon", onClose, onSave }) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");

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

  const canSave = !!coords && name.trim().length > 0;

  function handleSave(e) {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      name: name.trim(),
      category,
      phone: phone.trim() || null,
      website: website.trim() || null,
      notes: notes.trim() || null,
      lat: coords.lat,
      lng: coords.lng,
    });
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add new business"
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
            <h2 className="text-sm font-semibold text-slate-100">Add new business</h2>
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
          <Field label="Business name *" full>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={80}
              placeholder="e.g. The Marina Cut · Men's Salon"
              className="input"
            />
          </Field>

          <Field label="Category" full>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              placeholder="+971 ..."
              className="input"
            />
          </Field>

          <Field label="Website">
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              maxLength={120}
              placeholder="https://..."
              className="input"
            />
          </Field>

          <Field label="Notes" full>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={400}
              rows={3}
              placeholder="Anything worth remembering about this location…"
              className="input resize-y"
            />
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
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-900 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save business
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
          .input:focus { border-color: #06b6d4; }
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
