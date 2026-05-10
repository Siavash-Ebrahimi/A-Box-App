"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AnalysisPieChart from "./AnalysisPieChart";

const REPORT_SECTION_ORDER = [
  "Area Analysis",
  "Market Insights",
  "Competitor Analysis",
  "Final Recommendation",
];

// Full Analysis modal — opens from the right-panel "Show Full Analysis" button.
// Contains: branded header, pie chart, all 4 report sections (with proper formatting),
// and Print + Download PDF buttons (both call window.print(); the OS dialog has a
// "Save as PDF" destination on every modern OS).

export default function FullAnalysisModal({ result, category, location, onClose }) {
  // Render into a React portal directly under document.body. This makes the modal
  // a SIBLING of the page content rather than a deep descendant, which lets the
  // print CSS cleanly hide everything else with display:none (no layout gaps).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
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
  if (!mounted) return null;

  const top = result?.gold?.[0] || result?.silver?.[0] || result?.bronze?.[0] || null;
  const allSections = orderedSections(result?.report?.sections || []);
  // Split out the Final Recommendation section so we can merge it visually with the
  // numbered Recommended Spots into one combined "IV. Final Recommendation" section.
  const finalIdx = allSections.findIndex((s) =>
    s.heading.toLowerCase().includes("final recommendation"),
  );
  const sectionsBeforeFinal = finalIdx >= 0 ? allSections.slice(0, finalIdx) : allSections;
  const finalRecSection = finalIdx >= 0 ? allSections[finalIdx] : null;
  const sectionsAfterFinal = finalIdx >= 0 ? allSections.slice(finalIdx + 1) : [];
  const generatedAt = new Date().toLocaleString();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full Business Analysis"
      data-print-root="full-analysis"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:static print:block print:bg-white print:p-0 print:items-stretch"
      onClick={onClose}
    >
      <div
        className="printable-modal max-w-4xl w-full max-h-[92vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col print:max-w-none print:max-h-none print:overflow-visible print:block print:border-0 print:shadow-none print:rounded-none print:bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Branded header */}
        <header className="px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-3 print-hide">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-lg font-bold">A</span>
              <span className="text-slate-200 font-semibold">-Box · Business Analysis</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {location?.city || "Selected location"} · {humanCategory(category)} · generated {generatedAt}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-lg w-8 h-8 rounded hover:bg-slate-800 transition flex items-center justify-center"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {/* Print-only header (visible only on the printed PDF/page). */}
        <div className="hidden print:block">
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>A-Box · Business Analysis</h1>
          <div style={{ fontSize: 11, marginBottom: 12 }}>
            {location?.city || "Selected location"} · {humanCategory(category)} · {generatedAt}
          </div>
          <hr style={{ border: 0, borderTop: "1px solid #cbd5e1", marginBottom: 12 }} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-6 print:flex-none print:overflow-visible print:block print:px-0 print:py-0 print:h-auto print:max-h-none">
          {/* Sections I, II, III (Area / Market / Competitor) */}
          {sectionsBeforeFinal.map((s, i) => (
            <section key={i} className="print:break-inside-avoid">
              <h2 className="text-amber-300 font-semibold text-base mb-2">
                {romanFor(i)}. {s.heading}
              </h2>
              <div className="text-[13.5px] text-slate-200 leading-relaxed">
                {paragraphsWithBold(s.body)}
              </div>
            </section>
          ))}

          {/* Section IV — Final Recommendation MERGED with Recommended Spots */}
          {(finalRecSection || result?.recommendations?.length) ? (
            <section className="print:break-inside-avoid">
              <h2 className="text-amber-300 font-semibold text-base mb-2">
                {romanFor(sectionsBeforeFinal.length)}. Final Recommendation
              </h2>
              {finalRecSection ? (
                <div className="text-[13.5px] text-slate-200 leading-relaxed mb-4">
                  {paragraphsWithBold(finalRecSection.body)}
                </div>
              ) : null}

              {result?.recommendations?.length ? (
                <>
                  <h3 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mt-4 mb-2">
                    Recommended spots in detail
                  </h3>
                  <p className="text-[12.5px] text-slate-300 leading-relaxed mb-3">
                    The three numbered locations below distil the analysis above into specific,
                    actionable openings — each is a logical opening point on a top-tier street,
                    chosen for proximity to footfall drivers and a meaningful gap from existing
                    direct competitors.
                  </p>
                  <div className="space-y-2.5">
                    {result.recommendations.map((r, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 print:bg-white print:border-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500 text-white font-bold text-xs shrink-0 print:bg-amber-600">
                            {i + 1}
                          </span>
                          <span className="text-sm font-semibold text-slate-100">{r.street}</span>
                          <span className="text-xs text-slate-400 ml-auto">
                            {r.tier?.toUpperCase()} · score {r.score}
                            {r.highway ? ` · ${r.highway}` : ""}
                          </span>
                        </div>
                        <div className="text-[12px] text-slate-300 mt-1.5 leading-snug">
                          <strong className="text-slate-200">Snapshot: </strong>{r.summary}
                        </div>
                        {r.reason ? (
                          <div className="text-[12px] text-slate-300 mt-1.5 leading-relaxed">
                            <strong className="text-cyan-300 print:text-amber-700">Why this spot: </strong>
                            {r.reason}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          {/* Any extra trailing sections the LLM happened to produce */}
          {sectionsAfterFinal.map((s, i) => (
            <section key={`after-${i}`} className="print:break-inside-avoid">
              <h2 className="text-amber-300 font-semibold text-base mb-2">
                {romanFor(sectionsBeforeFinal.length + 1 + i)}. {s.heading}
              </h2>
              <div className="text-[13.5px] text-slate-200 leading-relaxed">
                {paragraphsWithBold(s.body)}
              </div>
            </section>
          ))}

          {/* Pie chart — moved to the END of the analysis so the prose stands first. */}
          {top ? (
            <section className="p-4 rounded-lg border border-slate-800 bg-slate-950/60 print:break-inside-avoid print:border-slate-300">
              <h2 className="text-amber-300 font-semibold text-base mb-3">
                {romanFor(sectionsBeforeFinal.length + 1 + sectionsAfterFinal.length)}. Score Composition — Top Street
              </h2>
              <p className="text-[12.5px] text-slate-300 leading-relaxed mb-4">
                The chart breaks down how the top street&apos;s opportunity score was assembled.
                Each slice is one factor&apos;s point contribution; the donut centre shows the
                final score. Streets above 160 are <strong className="text-amber-300">Gold</strong>,
                110–159 are <strong className="text-slate-300">Silver</strong>, below 110 are
                <strong className="text-orange-400"> Bronze</strong>.
              </p>
              <AnalysisPieChart topStreet={top} title="" />
              <div className="mt-5 pt-4 border-t border-slate-800 print:border-slate-300">
                <h3 className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  How each element is calculated
                </h3>
                <ul className="space-y-1.5 text-[12px] text-slate-300 leading-relaxed">
                  <li>
                    <strong className="text-slate-100">Base score (100):</strong> every street
                    starts at 100 — a neutral baseline before the area&apos;s actual signals
                    push it up or down.
                  </li>
                  <li>
                    <strong className="text-slate-100">Commercial density:</strong> total active
                    businesses on the street, capped at 30 (×&nbsp;1.5 pts each). Density signals
                    proven foot traffic, but with diminishing returns past 30 to avoid rewarding
                    pure congestion.
                  </li>
                  <li>
                    <strong className="text-slate-100">Category variety:</strong> distinct
                    business types nearby (×&nbsp;2 pts). Mixed retail draws cross-traffic; a
                    diverse street outperforms a mono-culture.
                  </li>
                  <li>
                    <strong className="text-slate-100">Transit access:</strong> public transit
                    stops within 300 m (×&nbsp;15 pts each, capped at 45). Transit injects
                    repeat, scheduled footfall.
                  </li>
                  <li>
                    <strong className="text-slate-100">Anchor POIs:</strong> malls, schools,
                    hospitals, hotels, mosques, parks within 250 m (×&nbsp;12 pts each, capped
                    at 48). These are the primary footfall magnets retail relies on.
                  </li>
                  <li>
                    <strong className="text-slate-100">Residential catchment:</strong>{" "}
                    residential buildings within 250 m (×&nbsp;0.5 pts each, capped at 25).
                    Captures the &quot;live-here, shop-here&quot; loop that sustains everyday
                    categories.
                  </li>
                  <li>
                    <strong className="text-slate-100">Road class:</strong> primary road
                    +22 pts, secondary +15, tertiary +8, pedestrian +18; residential −6,
                    service −12. Visibility and accessibility scale with road class.
                  </li>
                  <li>
                    <strong className="text-red-400">Competitor penalty:</strong> each direct
                    competitor on the street subtracts about 18 pts (scaled by the
                    category&apos;s competition sensitivity — e.g. coffee tolerates clusters,
                    grocery does not).
                  </li>
                </ul>
              </div>
            </section>
          ) : null}

          <div className="text-[10px] text-slate-500 leading-relaxed pt-2 border-t border-slate-800 print:text-slate-700 print:border-slate-300">
            Generated by A-Box using OpenStreetMap data and AI-driven scoring. Findings are
            informational; verify on a site visit before committing to a lease.
          </div>
        </div>

        {/* Footer with Print + PDF buttons */}
        <footer className="px-6 py-3 border-t border-slate-800 flex gap-2 print-hide">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 text-sm px-4 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold transition"
          >
            ⬇ Download PDF
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 text-sm px-4 py-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold transition"
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

function orderedSections(sections) {
  if (!sections || sections.length === 0) return [];
  const map = new Map(sections.map((s) => [s.heading.toLowerCase().trim(), s]));
  const out = [];
  for (const target of REPORT_SECTION_ORDER) {
    const exact = map.get(target.toLowerCase());
    if (exact) {
      out.push(exact);
      continue;
    }
    const partial = sections.find((s) =>
      s.heading.toLowerCase().includes(target.toLowerCase().split(" ")[0]),
    );
    if (partial && !out.includes(partial)) out.push(partial);
  }
  // Append any extra sections not already covered.
  for (const s of sections) if (!out.includes(s)) out.push(s);
  return out;
}

function romanFor(i) {
  return ["I", "II", "III", "IV", "V", "VI", "VII"][i] || String(i + 1);
}

function humanCategory(cat) {
  const map = {
    mens_salon: "Men's Salon",
    barber_shop: "Barber Shop",
    bakery: "Bakery",
    coffee_shop: "Coffee Shop",
    clothing_store: "Clothing Store",
    restaurant: "Restaurant",
    grocery_store: "Grocery Store",
    pharmacy: "Pharmacy",
  };
  return map[cat] || cat;
}

function paragraphsWithBold(text) {
  if (!text) return null;
  const paras = text.split(/\n\n+/).filter(Boolean);
  return paras.map((para, i) => (
    <p key={i} className="mb-2 last:mb-0">
      {boldSpans(para)}
    </p>
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
