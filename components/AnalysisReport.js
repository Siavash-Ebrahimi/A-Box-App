"use client";

import { useEffect, useState } from "react";
import FullAnalysisModal from "./FullAnalysisModal";

const REPORT_SECTION_ORDER = [
  "Area Analysis",
  "Market Insights",
  "Competitor Analysis",
  "Final Recommendation",
];

export default function AnalysisReport({ result, category, loading, location }) {
  const [showFull, setShowFull] = useState(false);

  // Hide the right panel entirely until the user has clicked "Analyze Streets" at least once.
  if (!loading && !result) {
    return null;
  }

  return (
    <>
      <aside
        className="w-[360px] shrink-0 border-l border-slate-800 bg-slate-950 hidden xl:flex flex-col"
        id="ai-report"
      >
        <header className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-200">AI Analytics Report</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Professional area analysis.</p>
          </div>
          {result?.report?.source ? (
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap">
              {result.report.source}
            </span>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-5">
          {/* Skeleton appears whenever AI-content is still being generated:
              either Phase 1 (`loading`) or Phase 2 (`result.enriching`). */}
          {loading || (result && result.enriching && !result.report) ? <ReportSkeleton /> : null}

          {!loading && result ? (
            <>
              {result.report ? (
                <ReportPreview
                  sections={result.report?.sections}
                  onShowFull={() => setShowFull(true)}
                />
              ) : null}
              {result.recommendations?.length ? (
                <RecommendationsList recs={result.recommendations} />
              ) : null}
              {result.agencies ? <PropertyAgencies agencies={result.agencies} /> : null}
              {result.enrichError ? (
                <div className="text-[11px] text-amber-300/80 leading-relaxed p-2.5 rounded border border-amber-500/30 bg-amber-500/5">
                  AI enrichment didn't finish in time, so the executive report and detailed
                  reasoning aren't available. The street ranking and recommendations are
                  still fully accurate. Re-run the analysis to retry the AI content.
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </aside>

      {showFull ? (
        <FullAnalysisModal
          result={result}
          category={category}
          location={location}
          onClose={() => setShowFull(false)}
        />
      ) : null}
    </>
  );
}

// First-paragraph preview of the report (Area Analysis), with a button that opens the
// full Business Analysis in a modal (pie chart + all 4 sections + Print/PDF).
function ReportPreview({ sections, onShowFull }) {
  if (!sections || sections.length === 0) return null;

  // Prefer Area Analysis as the preview; fall back to whatever is first.
  const area = sections.find((s) => s.heading.toLowerCase().includes("area")) || sections[0];
  const firstParagraph = (area.body || "").split(/\n\n+/)[0] || area.body || "";

  return (
    <section className="p-4 rounded-lg border border-slate-700 bg-slate-900/40">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold">
          Business Analysis
        </h3>
      </div>
      <div className="text-[12.5px] text-slate-200 leading-relaxed clamp-4">
        {boldSpans(firstParagraph)}
      </div>
      <button
        type="button"
        onClick={onShowFull}
        className="mt-3 w-full text-xs px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold transition"
      >
        Show Full Analysis →
      </button>
      <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">
        Full analysis includes a score-composition pie chart, area / market / competitor /
        recommendation sections, and Print + Download PDF actions.
      </div>
    </section>
  );
}

// Animated placeholder for the 4 sections while the LLM is still working.
// We progressively reveal them one at a time so the user sees structured progress.
function ReportSkeleton() {
  const [revealed, setRevealed] = useState(1);
  useEffect(() => {
    const id = setInterval(() => {
      setRevealed((n) => Math.min(REPORT_SECTION_ORDER.length, n + 1));
    }, 5500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-400 leading-relaxed flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        Please wait, we are processing your request…
      </div>
      {REPORT_SECTION_ORDER.map((heading, i) => {
        const isRevealed = i < revealed;
        return (
          <div
            key={heading}
            className={`p-3 rounded-lg border ${
              isRevealed
                ? "border-slate-700 bg-slate-900/40"
                : "border-slate-800 bg-slate-900/20 opacity-40"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-amber-300 mb-2 font-semibold">
              {heading}
            </div>
            {isRevealed ? (
              <div className="space-y-1.5">
                <div className="h-2.5 w-11/12 bg-slate-700/60 rounded animate-pulse" />
                <div className="h-2.5 w-full bg-slate-700/60 rounded animate-pulse" />
                <div className="h-2.5 w-4/5 bg-slate-700/60 rounded animate-pulse" />
                <div className="h-2.5 w-3/5 bg-slate-700/60 rounded animate-pulse" />
              </div>
            ) : (
              <div className="text-[10px] text-slate-600">queued…</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Lightweight inline-bold renderer (used by the preview).
function boldSpans(text) {
  const out = [];
  let last = 0;
  const re = /\*\*([^*]+)\*\*/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<strong key={m.index} className="text-amber-300 font-semibold">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function RecommendationsList({ recs }) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
        Top {recs.length} recommended spots
      </h3>
      <div className="space-y-2">
        {recs.map((r, i) => (
          <div key={i} className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/5 break-inside-avoid">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white font-bold text-[11px] shrink-0">
                {i + 1}
              </span>
              <span className="text-xs font-semibold text-slate-100 truncate">{r.street}</span>
            </div>
            <div className="text-[10.5px] text-slate-400 mt-1">
              {r.tier?.toUpperCase()} · score {r.score}
              {r.highway ? ` · ${r.highway}` : ""}
            </div>
            <div className="text-[11px] text-slate-300 mt-1.5 leading-snug">{r.summary}</div>
            {r.reason ? (
              <details className="mt-2 group">
                <summary className="text-[10px] uppercase tracking-wider text-cyan-300 cursor-pointer hover:text-cyan-200 select-none">
                  Why this location was recommended
                </summary>
                <div className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                  {r.reason}
                </div>
                {r.reasonSource && r.reasonSource !== "template" ? (
                  <div className="text-[10px] text-slate-500 mt-1">analysis by {r.reasonSource}</div>
                ) : null}
              </details>
            ) : null}
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-500 mt-2 ai-report-print-hide">
        Same numbered cyan stars are pinned on the map — click any star for full details.
      </div>
    </div>
  );
}

function PropertyAgencies({ agencies }) {
  const list = agencies?.agencies || [];
  if (list.length === 0) {
    if (agencies?.source === "error" || agencies?.source === "skipped" || agencies?.source === "template") {
      return (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
            Find a shop to rent / buy
          </h3>
          <div className="text-[11px] text-slate-500 leading-relaxed">
            Property-agency lookup needs the OpenRouter LLM. Set <code className="text-slate-400">OPENROUTER_API_KEY</code> in <code className="text-slate-400">.env.local</code> and re-run.
          </div>
        </div>
      );
    }
    return null;
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Find a shop to rent / buy
        </h3>
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
          {agencies.source}
        </span>
      </div>
      <div className="space-y-2">
        {list.map((a, i) => (
          <div key={i} className="p-2.5 rounded-lg border border-slate-700 bg-slate-900/40 break-inside-avoid">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-100 truncate">{a.name}</div>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap">
                {a.listingType}
              </span>
            </div>
            {a.note ? (
              <div className="text-[11px] text-slate-300 mt-1 leading-snug">{a.note}</div>
            ) : null}
            <div className="flex flex-wrap gap-2 mt-2 ai-report-print-hide">
              <a
                href={a.searchUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[11px] px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 transition"
              >
                Search shops →
              </a>
              {a.searchUrl !== a.homepage ? (
                <a
                  href={a.homepage}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
                >
                  Homepage
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-slate-500 mt-2 leading-relaxed ai-report-print-hide">
        AI-suggested portals/agencies. Listings live on their sites — verify there before contacting.
      </div>
    </div>
  );
}
