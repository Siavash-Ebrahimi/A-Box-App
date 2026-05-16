"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Modal for creating (or renaming) an i-Case. Two fields only:
//   - short name (required)
//   - short description (optional but encouraged)
// On Create, the parent (Agent Hub page) persists the new i-Case and routes the
// user to its dedicated workspace at /agent-hub/case/[id]. All rule-authoring
// happens inside the workspace, not in this modal — keeping the create step a
// 5-second action.

export default function ICaseBuilder({ existing, onClose, onSave }) {
  const editing = !!existing;
  const [name, setName] = useState(existing?.name || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [mounted, setMounted] = useState(false);

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

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      ...(existing || {}),
      name: name.trim(),
      description: description.trim(),
    });
    onClose();
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Rename i-Case" : "Create i-Case"}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {editing ? "Rename i-Case" : "Create new i-Case"}
            </h2>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Give your automation a short name and one-line description. You'll build the
              actual workflow on the next screen.
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

        <div className="px-5 py-4 space-y-4">
          <section>
            <Label>Short name *</Label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marina Welcome"
              autoFocus
              maxLength={60}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </section>

          <section>
            <Label>Short description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Welcome new leads landing in Marina, send a property snapshot, notify Sam."
              rows={3}
              maxLength={240}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
            />
            <div className="text-[10.5px] text-slate-500 mt-1 text-right tabular-nums">
              {description.length}/240
            </div>
          </section>
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
            disabled={!name.trim()}
            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editing ? "Save name" : "Create & open workspace →"}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

function Label({ children }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
      {children}
    </div>
  );
}
