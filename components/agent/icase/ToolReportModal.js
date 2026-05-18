"use client";

// Full-screen window for any single-tool report in the i-Case workspace
// (Find Property, Analyse Business, Suggest Business, Vending Finder,
// AI Analysis, etc). Mirrors the CompareReportModal pattern so the whole
// app's "report viewer" experience feels consistent:
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ [icon]  Tool name · subtitle           [EN AR FA] [Print] ✕ │
//   ├──────────────────────────────────────────────────────────────┤
//   │                                                              │
//   │  full report text — large, readable, scrollable             │
//   │                                                              │
//   ├──────────────────────────────────────────────────────────────┤
//   │ Sources used: #1 #2 #3                                      │
//   └──────────────────────────────────────────────────────────────┘

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import TranslateButtons from "@/components/TranslateButtons";

export default function ToolReportModal({
  title,                  // e.g. "AI Find Property"
  subtitle,               // e.g. "1-bed sea view, low floor, 2 baths…"
  icon = "🤖",            // tool icon
  accent = "#10b981",     // border / header tint
  text,                   // the full report body to render
  generatedAt,            // Date | number | null
  sources = [],           // optional list of upstream items used for the report
  onClose,
}) {
  const [mounted, setMounted] = useState(false);
  // Translation surface — defaults to the English original.
  const [shown, setShown] = useState(text);
  const [rtl, setRtl] = useState(false);
  useEffect(() => { setShown(text); setRtl(false); }, [text]);

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

  const tsLabel = generatedAt
    ? new Date(generatedAt).toLocaleString()
    : null;

  function handlePrint() { window.print(); }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — full report`}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-3xl w-full max-h-[92vh] bg-slate-900 border rounded-xl shadow-2xl overflow-hidden flex flex-col printable-modal"
        style={{ borderColor: `${accent}66` }}
      >
        <header
          className="px-5 py-3.5 border-b border-slate-800 flex items-start justify-between gap-3"
          style={{ background: `${accent}15` }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
              style={{ background: `${accent}33`, color: accent }}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color: accent }}>
                Tool report
              </div>
              <h2 className="text-base font-semibold text-slate-100 mt-0.5 truncate">{title}</h2>
              {subtitle ? (
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</div>
              ) : null}
              {tsLabel ? (
                <div className="text-[10.5px] text-slate-500 mt-0.5">Generated {tsLabel}</div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {text ? (
              <TranslateButtons
                text={text}
                onTranslated={(t, _lang, isRtl) => { setShown(t); setRtl(isRtl); }}
                compact
              />
            ) : null}
            <button
              type="button"
              onClick={handlePrint}
              className="text-[11px] px-2.5 py-1 rounded border bg-slate-900 hover:bg-slate-800 text-slate-200 transition"
              style={{ borderColor: `${accent}55` }}
            >
              🖨 Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 text-lg w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </header>

        <div
          className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 text-[13px] leading-relaxed text-slate-200 whitespace-pre-wrap"
          dir={rtl ? "rtl" : "ltr"}
        >
          {shown || (
            <div className="text-slate-500 italic">
              No report content yet — run the tool first, then come back.
            </div>
          )}
        </div>

        {sources.length > 0 ? (
          <footer className="px-6 py-3 border-t border-slate-800 bg-slate-950 text-[10.5px] text-slate-500 leading-relaxed">
            <strong className="text-slate-300">Sources used:</strong>{" "}
            {sources.map((s, i) => (
              <span key={i} className="text-slate-400">
                {i > 0 ? " · " : ""}{s}
              </span>
            ))}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
