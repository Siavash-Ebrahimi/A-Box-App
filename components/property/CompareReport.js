"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatPrice } from "@/lib/agent/mockProperties";
import TranslateButtons from "@/components/TranslateButtons";

// AI comparison report modal — fetched from /api/property-compare on open and
// rendered as 8 stacked sections, with the two property summaries pinned at the
// top so the reader always sees what's being compared. Print/PDF reuses the
// `printable-modal` class so we get the same multi-page-friendly print CSS as
// the Business Analysis modal.

export default function CompareReport({ propertyA, propertyB, onClose }) {
  // All hooks at the top — early returns come after the hook block to keep
  // the call order stable across renders.
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  // Translation surface — re-translates ALL section bodies in one bundle
  // round-trip when the user picks AR/FA, so the report stays internally
  // consistent.
  const [translatedBundle, setTranslatedBundle] = useState(null); // string[] | null
  const [rtl, setRtl] = useState(false);

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

  // Fire the LLM request once the modal mounts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/property-compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyA, propertyB }),
        });
        const text = await res.text();
        let data = null;
        try { data = JSON.parse(text); } catch {}
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setReport(data);
      } catch (e) {
        if (!cancelled) setError(e.message || "Couldn't generate the report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [propertyA?.id, propertyB?.id]);

  const sections = report?.sections || [];
  const originalBundle = useMemo(
    () => JSON.stringify(sections.map((s) => s.body || "")),
    [sections],
  );

  function handleTranslated(translatedText, _lang, isRtl) {
    setRtl(isRtl);
    if (!isRtl) { setTranslatedBundle(null); return; }
    try {
      const parsed = JSON.parse(translatedText);
      if (Array.isArray(parsed)) { setTranslatedBundle(parsed); return; }
    } catch {/* fall through */}
    // Fallback: dump the whole translated blob into section 0 so something shows.
    const fb = new Array(sections.length).fill("");
    fb[0] = translatedText;
    setTranslatedBundle(fb);
  }
  function bodyFor(i, original) {
    if (!rtl || !translatedBundle) return original;
    return translatedBundle[i] || original;
  }

  if (!mounted) return null;
  const generatedAt = new Date().toLocaleString();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Property comparison report"
      data-print-root="full-analysis"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:static print:block print:bg-white print:p-0 print:items-stretch"
      onClick={onClose}
    >
      <div
        className="printable-modal max-w-4xl w-full max-h-[92vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col print:max-w-none print:max-h-none print:overflow-visible print:block print:border-0 print:shadow-none print:rounded-none print:bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-3 print-hide">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-lg font-bold">A</span>
              <span className="text-slate-200 font-semibold">-Box · Property Comparison</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Generated {generatedAt}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {report ? (
              <TranslateButtons text={originalBundle} onTranslated={handleTranslated} compact />
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 text-lg w-8 h-8 rounded hover:bg-slate-800 flex items-center justify-center"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Print-only header */}
        <div className="hidden print:block">
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            A-Box · Property Comparison Report
          </h1>
          <div style={{ fontSize: 11, marginBottom: 12 }}>{generatedAt}</div>
          <hr style={{ border: 0, borderTop: "1px solid #cbd5e1", marginBottom: 12 }} />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-5 print:overflow-visible print:px-0 print:py-0 print:flex-none print:block print:max-h-none print:h-auto">
          {/* Pinned property summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:break-inside-avoid">
            <PropSummary p={propertyA} index={1} color="#3b82f6" />
            <PropSummary p={propertyB} index={2} color="#10b981" />
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="text-[12px] text-slate-400">
                The AI is comparing both properties — give it ~5–15 seconds.
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-1/3 bg-slate-800 rounded animate-pulse" />
                  <div className="h-2.5 w-full bg-slate-800 rounded animate-pulse" />
                  <div className="h-2.5 w-11/12 bg-slate-800 rounded animate-pulse" />
                  <div className="h-2.5 w-4/5 bg-slate-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-[12px] text-red-300 bg-red-900/30 border border-red-700/50 rounded p-3">
              {error} — try closing and re-opening this report.
            </div>
          ) : (
            <>
              {sections.map((s, i) => (
                <section key={i} className="print:break-inside-avoid">
                  <h2 className="text-amber-300 font-semibold text-base mb-2">
                    {roman(i)}. {s.heading}
                  </h2>
                  <div
                    dir={rtl ? "rtl" : "ltr"}
                    className="text-[13.5px] text-slate-200 leading-relaxed"
                  >
                    {rtl
                      ? <div className="whitespace-pre-wrap">{bodyFor(i, s.body)}</div>
                      : paragraphsWithBold(s.body)}
                  </div>
                </section>
              ))}

              <div className="text-[10px] text-slate-500 leading-relaxed pt-2 border-t border-slate-800 print:border-slate-300 print:text-slate-700">
                Generated by A-Box using AI analysis of the property data shown above.
                {report?.source && report.source !== "openrouter"
                  ? ` (Source: ${report.source})`
                  : ""} Verify all numbers and policy details with the listing agent before
                making any commitments.
              </div>
            </>
          )}
        </div>

        <footer className="px-6 py-3 border-t border-slate-800 flex gap-2 print-hide">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={loading || !!error}
            className="flex-1 text-sm px-4 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⬇ Download PDF
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={loading || !!error}
            className="flex-1 text-sm px-4 py-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🖨 Print Report
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2.5 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 transition"
          >
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function PropSummary({ p, index, color }) {
  if (!p) return null;
  return (
    <div className="rounded-lg border bg-slate-950/60 overflow-hidden" style={{ borderColor: `${color}55` }}>
      <div className="px-3 py-2 flex items-center gap-2" style={{ background: `${color}15` }}>
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
          style={{ background: color }}
        >
          {index}
        </span>
        <div className="text-[12px] uppercase tracking-wider text-slate-300 font-semibold">
          Property {index}
        </div>
      </div>
      <div className="p-3">
        <div className="text-[13px] font-semibold text-slate-100">{p.title}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">{p.building} · {p.area}</div>
        <div className="text-[13px] text-amber-300 font-bold tabular-nums mt-1">
          {formatPrice(p)}
        </div>
        <div className="text-[11px] text-slate-300 mt-1">
          {p.beds || "Studio"} BR · {p.baths} bath · {p.area_sqft.toLocaleString()} ft² ·
          built {p.yearBuilt}
        </div>
      </div>
    </div>
  );
}

function roman(i) { return ["I","II","III","IV","V","VI","VII","VIII","IX","X"][i] || String(i + 1); }

function paragraphsWithBold(text) {
  if (!text) return null;
  return text.split(/\n\n+/).filter(Boolean).map((para, i) => (
    <p key={i} className="mb-2 last:mb-0">{boldSpans(para)}</p>
  ));
}

function boldSpans(text) {
  const out = [];
  let last = 0;
  const re = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<strong key={m.index} className="text-amber-300 font-semibold print:text-amber-700">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
