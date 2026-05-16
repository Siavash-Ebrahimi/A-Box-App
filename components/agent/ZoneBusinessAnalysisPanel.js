"use client";

// Right-side analysis panel for the SELECTED zone's Business layer.
// Brings full parity with the home Business section (app/page.js):
//   - Tier counts (🥇 🥈 🥉)
//   - Successful Businesses Nearby (competitor insights paragraph)
//   - Business Analysis preview + Show Full Analysis button
//   - Top recommended spots
//   - Find a shop to rent / buy (agencies portals)
//   - Street ranking (Gold / Silver / Bronze sections of StreetCards)
//
// Renders only when a zone is selected AND has a real (non-summary) result.
// Hidden below xl screens to keep the layout usable on narrower viewports.

import { useState } from "react";
import StreetCard from "@/components/StreetCard";
import CompetitorInsightsModal from "@/components/CompetitorInsightsModal";
import { BUSINESS_CATEGORIES } from "./BusinessRibbon";

export default function ZoneBusinessAnalysisPanel({
  zone,
  zoneIndex,
  result,
  loading,
  category,
  onOpenFullReport,
}) {
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);

  if (!zone) return null;

  const categoryLabel = BUSINESS_CATEGORIES.find((c) => c.value === category)?.label || category;

  // A summary-only result means we have cached counts from a previous session
  // but no street geometry / report — guide the user to re-analyse.
  if (result?._summaryOnly && !loading) {
    return (
      <PanelShell zone={zone} zoneIndex={zoneIndex} categoryLabel={categoryLabel}>
        <div className="text-[12px] text-slate-400 leading-relaxed">
          A previous analysis is cached for this zone, but the full report data
          wasn't persisted. Click <strong className="text-cyan-300">↻ Re-analyse</strong> in
          the Business ribbon to bring it back.
        </div>
      </PanelShell>
    );
  }

  if (!loading && !result) {
    return (
      <PanelShell zone={zone} zoneIndex={zoneIndex} categoryLabel={categoryLabel}>
        <div className="text-[12px] text-slate-400 leading-relaxed">
          No business analysis yet for this zone. Open the
          <strong className="text-cyan-300"> Business</strong> ribbon, pick a category, and tap
          <strong className="text-cyan-300"> ▶ Analyse streets</strong> to surface the
          Gold / Silver / Bronze ranking, competitor insights, and recommended spots here.
        </div>
      </PanelShell>
    );
  }

  if (loading && !result) {
    return (
      <PanelShell zone={zone} zoneIndex={zoneIndex} categoryLabel={categoryLabel}>
        <Phase1Skeleton />
      </PanelShell>
    );
  }

  const tierCounts = {
    gold: (result.gold || []).length,
    silver: (result.silver || []).length,
    bronze: (result.bronze || []).length,
  };
  const streetsByTier = {
    gold: result.gold || [],
    silver: result.silver || [],
    bronze: result.bronze || [],
  };
  const enriching = !!(result.loadingOverview || result.loadingDetails);

  return (
    <PanelShell
      zone={zone}
      zoneIndex={zoneIndex}
      categoryLabel={categoryLabel}
      source={result.report?.source}
    >
      {/* Tier counts + meta summary */}
      <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1 pb-3 border-b border-slate-800">
        <span title="Gold streets">🥇 {tierCounts.gold}</span>
        <span title="Silver streets">🥈 {tierCounts.silver}</span>
        <span title="Bronze streets">🥉 {tierCounts.bronze}</span>
        <span className="ml-auto text-slate-500 tabular-nums">
          {result.meta?.totalCommercial ?? 0} businesses · {result.meta?.transitStops ?? 0} transit · {result.meta?.anchors ?? 0} anchors
        </span>
      </div>

      {/* Successful Businesses Nearby — competitor insights (mirrors main Business) */}
      {result.competitorInsights || result.loadingOverview ? (
        <SuccessfulBusinessesCard
          insights={result.competitorInsights}
          onReadMore={() => setShowCompetitorModal(true)}
        />
      ) : null}

      {/* Business Analysis preview + "Show Full Analysis" */}
      {result.report ? (
        <ReportPreview report={result.report} onShowFull={onOpenFullReport} />
      ) : result.loadingOverview ? (
        <ReportSkeleton />
      ) : null}

      {/* Recommendations */}
      {result.recommendations?.length ? (
        <RecommendationsBlock recs={result.recommendations} />
      ) : null}

      {/* Agencies */}
      {result.agencies ? <AgenciesBlock agencies={result.agencies} /> : null}

      {/* Street Ranking (Gold → Silver → Bronze with StreetCard) */}
      <StreetRankingBlock streets={streetsByTier} />

      {/* AI enrichment errors, if any */}
      {(result.overviewError || result.detailsError) ? (
        <div className="text-[11px] text-amber-300/80 leading-relaxed p-2.5 rounded border border-amber-500/30 bg-amber-500/5">
          {result.overviewError && result.detailsError
            ? "AI enrichment didn't finish in time. The street ranking is still accurate — re-run to retry the AI layers."
            : result.overviewError
              ? "The market-overview AI layer didn't finish in time."
              : "The per-street AI layer didn't finish in time."}
        </div>
      ) : null}

      {enriching ? (
        <div className="text-[10.5px] text-cyan-300/80 italic">
          AI report still writing in the background…
        </div>
      ) : null}

      {showCompetitorModal && result.competitorInsights ? (
        <CompetitorInsightsModal
          insights={result.competitorInsights}
          category={category}
          location={{
            latitude: zone.lat,
            longitude: zone.lng,
            city: zone.addressLabel?.split(",")[0] || "",
          }}
          onClose={() => setShowCompetitorModal(false)}
        />
      ) : null}
    </PanelShell>
  );
}

// ----- Shell --------------------------------------------------------------

function PanelShell({ zone, zoneIndex, categoryLabel, source, children }) {
  return (
    <aside
      className="w-[360px] shrink-0 border-l border-slate-800 bg-slate-950 hidden xl:flex flex-col"
      id="zone-business-analysis"
    >
      <header className="px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
            Business Analysis · Zone {zoneIndex + 1}
          </div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-100 truncate mt-0.5">
            {zone.label || "Working zone"}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            For: {categoryLabel || "—"}
          </p>
        </div>
        {source ? (
          <span
            className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap shrink-0"
            title={source}
          >
            {source}
          </span>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-5">
        {children}
      </div>
    </aside>
  );
}

// ----- Phase 1 skeleton (waiting for /api/analyze) -----------------------

function Phase1Skeleton() {
  return (
    <div>
      <div className="text-xs text-slate-300 flex items-center gap-2 mb-3">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>Step 1 of 3 · Reading the map</span>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-11/12 bg-slate-800 rounded animate-pulse" />
        <div className="h-2.5 w-full bg-slate-800 rounded animate-pulse" />
        <div className="h-2.5 w-3/4 bg-slate-800 rounded animate-pulse" />
        <div className="h-2.5 w-4/5 bg-slate-800 rounded animate-pulse" />
      </div>
    </div>
  );
}

// ----- Successful Businesses Nearby --------------------------------------

function SuccessfulBusinessesCard({ insights, onReadMore }) {
  return (
    <div className="rounded border border-slate-700 bg-slate-900/60 text-slate-200 text-xs p-3 leading-relaxed">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <CompetitorPinIcon />
          <span>Successful Businesses Nearby</span>
        </div>
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap">
          {insights?.source || "loading…"}
        </span>
      </div>
      {insights ? (
        <>
          <div className="text-slate-200 leading-snug" style={{ display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {insights.summary}
          </div>
          {insights.details ? (
            <button
              type="button"
              onClick={onReadMore}
              className="mt-2 text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
            >
              Read More →
            </button>
          ) : null}
        </>
      ) : (
        <div className="space-y-1.5">
          <div className="h-2.5 w-11/12 bg-slate-800 rounded animate-pulse" />
          <div className="h-2.5 w-full bg-slate-800 rounded animate-pulse" />
          <div className="h-2.5 w-3/4 bg-slate-800 rounded animate-pulse" />
        </div>
      )}
    </div>
  );
}

function CompetitorPinIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 28 32" aria-hidden="true">
      <path
        d="M14 2 C 6.5 2 2 6.5 2 13.5 C 2 22 14 30 14 30 C 14 30 26 22 26 13.5 C 26 6.5 21.5 2 14 2 Z"
        fill="#ef4444" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round"
      />
      <circle cx="14" cy="13" r="3.5" fill="#ffffff" />
    </svg>
  );
}

// ----- Report preview (Area Analysis first paragraph + CTA) --------------

function ReportPreview({ report, onShowFull }) {
  const sections = report?.sections || [];
  if (sections.length === 0) return null;
  const area = sections.find((s) => s.heading?.toLowerCase().includes("area")) || sections[0];
  const firstParagraph = (area.body || "").split(/\n\n+/)[0] || area.body || "";
  return (
    <section className="p-4 rounded-lg border border-slate-700 bg-slate-900/40">
      <div className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold mb-2">
        Business Analysis
      </div>
      <div
        className="text-[12.5px] text-slate-200 leading-relaxed"
        style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
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

function ReportSkeleton() {
  return (
    <section className="p-4 rounded-lg border border-slate-700 bg-slate-900/40 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold">
        Business Analysis
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 w-11/12 bg-slate-700/60 rounded animate-pulse" />
        <div className="h-2.5 w-full bg-slate-700/60 rounded animate-pulse" />
        <div className="h-2.5 w-3/4 bg-slate-700/60 rounded animate-pulse" />
        <div className="h-2.5 w-4/5 bg-slate-700/60 rounded animate-pulse" />
      </div>
      <div className="text-[10px] text-slate-500 mt-1 italic">AI is writing the report…</div>
    </section>
  );
}

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

// ----- Recommendations list ----------------------------------------------

function RecommendationsBlock({ recs }) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
        Top {recs.length} recommended spots
      </h3>
      <div className="space-y-2">
        {recs.map((r, i) => (
          <div key={i} className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white font-bold text-[11px] shrink-0">
                {i + 1}
              </span>
              <span className="text-xs font-semibold text-slate-100 truncate">{r.street}</span>
            </div>
            <div className="text-[10.5px] text-slate-400 mt-1">
              {r.tier?.toUpperCase()} · score {r.score}{r.highway ? ` · ${r.highway}` : ""}
            </div>
            <div className="text-[11px] text-slate-300 mt-1.5 leading-snug">{r.summary}</div>
            {r.reason ? (
              <details className="mt-2">
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
      <div className="text-[10px] text-slate-500 mt-2">
        Numbered cyan stars are pinned on the map — click any star for full details.
      </div>
    </div>
  );
}

// ----- Agencies / Find a shop to rent / buy ------------------------------

function AgenciesBlock({ agencies }) {
  const list = agencies?.agencies || [];
  if (list.length === 0) {
    if (agencies?.source === "error" || agencies?.source === "skipped" || agencies?.source === "template") {
      return (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
            Find a shop to rent / buy
          </h3>
          <div className="text-[11px] text-slate-500 leading-relaxed">
            Property-agency lookup needs the OpenRouter LLM. Set <code className="text-slate-400">OPENROUTER_API_KEY</code> in <code className="text-slate-400">.env.local</code>.
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
          <div key={i} className="p-2.5 rounded-lg border border-slate-700 bg-slate-900/40">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-100 truncate">{a.name}</div>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap">
                {a.listingType}
              </span>
            </div>
            {a.note ? (
              <div className="text-[11px] text-slate-300 mt-1 leading-snug">{a.note}</div>
            ) : null}
            <div className="flex flex-wrap gap-2 mt-2">
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
      <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">
        AI-suggested portals/agencies. Listings live on their sites — verify there before contacting.
      </div>
    </div>
  );
}

// ----- Street Ranking ----------------------------------------------------

function StreetRankingBlock({ streets }) {
  const hasAny = (streets.gold.length + streets.silver.length + streets.bronze.length) > 0;
  if (!hasAny) return null;
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
        Street Ranking
      </h3>
      {["gold", "silver", "bronze"].map((tier) => {
        const list = streets[tier];
        if (list.length === 0) return null;
        return (
          <section key={tier} className="mb-4 last:mb-0">
            <h4 className={`tier-${tier} text-xs uppercase tracking-wider font-semibold mb-2`}>
              {tier} · {list.length}
            </h4>
            <div className="space-y-2">
              {list.map((s, idx) => (
                <StreetCard key={s.street} street={s} rank={idx + 1} isFocused={false} onFocus={() => {}} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
