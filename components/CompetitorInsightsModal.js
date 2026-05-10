"use client";

import { useEffect } from "react";

// Modal dialog opened when the user clicks "More details" under Competitor Insights.
// Shows the longer "details" body of the LLM-generated competitor success analysis.

export default function CompetitorInsightsModal({ insights, category, location, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Competitor Insights — full details"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Successful Businesses Nearby</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Why these businesses are thriving in {location?.city || "this area"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-lg w-7 h-7 rounded hover:bg-slate-800 transition flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
          <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
            {insights.details}
          </div>
          {insights.source && insights.source !== "template" ? (
            <div className="mt-4 text-[10px] text-slate-500">analysis by {insights.source}</div>
          ) : null}
        </div>

        <footer className="px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold transition"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
