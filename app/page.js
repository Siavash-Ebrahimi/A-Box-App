"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Controls from "@/components/Controls";
import StreetCard from "@/components/StreetCard";
import LocationPicker from "@/components/LocationPicker";
import HomeScreen from "@/components/HomeScreen";
import AnalysisReport from "@/components/AnalysisReport";
import CompetitorInsightsModal from "@/components/CompetitorInsightsModal";

// Leaflet only renders client-side.
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Page() {
  const [phase, setPhase] = useState("home");             // "home" | "picker" | "analyzing"
  const [location, setLocation] = useState(null);
  const [category, setCategory] = useState("mens_salon");
  const [radius, setRadius] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [focused, setFocused] = useState(null);
  const [showCompetitorModal, setShowCompetitorModal] = useState(false);

  function handleLocationChosen(loc) {
    setLocation(loc);
    setPhase("analyzing");
    setResult(null);
    setError(null);
    setFocused(null);
  }

  function changeLocation() {
    setPhase("picker");
    setResult(null);
    setError(null);
    setFocused(null);
    setLoading(false);
  }

  function goHome() {
    setPhase("home");
    setResult(null);
    setError(null);
    setFocused(null);
    setLoading(false);
    setLocation(null);
  }

  // Three-phase analysis to keep every individual request well inside Vercel's 60s limit:
  //   Phase 1 (/api/analyze)          — Overpass + scoring + ranking. Sequential.
  //   Phase 2 (/api/enrich-overview)  — Big-picture LLM (report + insights + agencies). Parallel with Phase 3.
  //   Phase 3 (/api/enrich-details)   — Per-street + per-spot LLM. Parallel with Phase 2.
  // Either Phase 2 or Phase 3 can fail without affecting the other; the UI fills in
  // whichever layers succeed.
  async function analyze() {
    if (!location) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setFocused(null);

    try {
      // --- Phase 1: data ---
      const phase1Res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          radius,
          businessType: category,
          cityHint: location.city || null,
        }),
      });
      const phase1Data = await safeJson(phase1Res, "analysis");
      if (!phase1Res.ok) throw new Error(phase1Data?.error || `Analysis failed (HTTP ${phase1Res.status})`);

      const initial = { ...phase1Data, loadingOverview: true, loadingDetails: true };
      setResult(initial);
      setLoading(false);

      // Build the payload shared by Phase 2 and Phase 3.
      const all = [
        ...(phase1Data.gold || []),
        ...(phase1Data.silver || []),
        ...(phase1Data.bronze || []),
      ];
      const topStreets = all.slice(0, 5).map((s) => ({
        street: s.street,
        tier: s.tier,
        score: s.score,
        breakdown: s.breakdown,
        highway: s.highway,
        center: s.center,
      }));
      const ctx = phase1Data.enrichContext || {};
      const meta = phase1Data.meta || {};
      const recommendations = phase1Data.recommendations || [];

      // --- Phase 2: overview (best-effort) ---
      fetch("/api/enrich-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ctx, topStreets, meta }),
      })
        .then((res) => safeJson(res, "overview").then((data) => ({ res, data })))
        .then(({ res, data }) => {
          if (!res.ok) throw new Error(data?.error || `Overview failed (HTTP ${res.status})`);
          setResult((prev) => mergeOverview(prev, data));
        })
        .catch((err) => {
          setResult((prev) =>
            prev
              ? { ...prev, loadingOverview: false, overviewError: err.message || "Overview unavailable" }
              : prev,
          );
        });

      // --- Phase 3: details (best-effort, runs in parallel with Phase 2) ---
      fetch("/api/enrich-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ctx, topStreets, recommendations }),
      })
        .then((res) => safeJson(res, "details").then((data) => ({ res, data })))
        .then(({ res, data }) => {
          if (!res.ok) throw new Error(data?.error || `Details failed (HTTP ${res.status})`);
          setResult((prev) => mergeDetails(prev, data));
        })
        .catch((err) => {
          setResult((prev) =>
            prev
              ? { ...prev, loadingDetails: false, detailsError: err.message || "Details unavailable" }
              : prev,
          );
        });
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  const streets = useMemo(() => {
    if (!result) return { gold: [], silver: [], bronze: [] };
    return { gold: result.gold || [], silver: result.silver || [], bronze: result.bronze || [] };
  }, [result]);

  const tierCounts = {
    gold: streets.gold.length,
    silver: streets.silver.length,
    bronze: streets.bronze.length,
  };

  if (phase === "home") {
    return <HomeScreen onChooseBusiness={() => setPhase("picker")} />;
  }
  if (phase === "picker") {
    return (
      <LocationPicker
        onLocationChosen={handleLocationChosen}
        onBackToHome={goHome}
      />
    );
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <aside className="w-[340px] shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
        <header className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <button
                type="button"
                onClick={goHome}
                className="text-lg font-semibold tracking-tight hover:opacity-80 transition"
                title="Back to A-Box home"
              >
                <span className="text-amber-400">A</span>-Box
              </button>
              <p className="text-xs text-slate-400 mt-0.5">
                Find the best streets to open your business.
              </p>
            </div>
            {result?.meta?.ai ? (
              <span
                className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap"
                title={result.meta.ai.model || ""}
              >
                AI: {result.meta.ai.provider}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={changeLocation}
            className="mt-3 w-full text-xs px-3 py-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 transition flex items-center justify-center gap-2"
          >
            ← Change location
          </button>
        </header>

        <div className="px-5 py-4 border-b border-slate-800">
          <Controls
            location={location}
            category={category}
            radius={radius}
            loading={loading}
            onCategoryChange={setCategory}
            onRadiusChange={setRadius}
            onAnalyze={analyze}
          />
        </div>

        {error ? (
          <div className="mx-5 my-3 p-3 rounded border border-red-700 bg-red-900/30 text-red-200 text-xs">
            {error}
          </div>
        ) : null}

        {/* Standalone Recommendation block removed — Final Recommendation now lives in
            the AI Analytics Report on the right panel. */}

        {result && (result.loadingOverview || result.loadingDetails) ? (
          <div className="mx-5 my-3 p-3 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 text-xs leading-relaxed">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold">
                {phaseLabel(result)}
              </span>
            </div>
            <div className="mt-1.5 text-slate-200">
              The street map is ready. Analysis layers fill in as they arrive —
              <span className="text-cyan-200"> {layersDoneOf(result)} of 3 layers complete</span>.
            </div>
          </div>
        ) : null}

        {/* Successful Businesses Nearby — appears once Phase 1 is done; the *content*
            of the LLM-written insight upgrades automatically when Phase 2 (overview) returns. */}
        {result && (result.competitorInsights || result.loadingOverview) ? (
          <div className="mx-5 my-3 p-3 rounded border border-slate-700 bg-slate-900/60 text-slate-200 text-xs leading-relaxed">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CompetitorPinIcon />
                <span>Successful Businesses Nearby</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap">
                {result.competitorInsights?.source || "loading…"}
              </span>
            </div>
            {result.competitorInsights ? (
              <>
                <div className="text-slate-200 leading-snug clamp-5">
                  {result.competitorInsights.summary}
                </div>
                {result.competitorInsights.details ? (
                  <button
                    type="button"
                    onClick={() => setShowCompetitorModal(true)}
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
        ) : null}

        {result ? (
          <div className="px-5 py-2 text-[11px] text-slate-400 border-b border-slate-800 flex flex-wrap gap-x-3 gap-y-1">
            <span>🥇 {tierCounts.gold}</span>
            <span>🥈 {tierCounts.silver}</span>
            <span>🥉 {tierCounts.bronze}</span>
            <span className="ml-auto text-slate-500">
              {result.meta?.totalCommercial} businesses · {result.meta?.transitStops} transit · {result.meta?.anchors} anchors
            </span>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-3 space-y-4">
          {!result && !loading ? (
            <div className="text-xs text-slate-500 leading-relaxed">
              Pick a category and radius, then click <span className="text-amber-400">Analyze Streets</span>.
              The system fetches real businesses from OpenStreetMap, groups them by street, scores them,
              and ranks the area into Gold / Silver / Bronze tiers.
            </div>
          ) : null}

          {loading ? <AnalyzingProgress /> : null}

          {result && (streets.gold.length || streets.silver.length || streets.bronze.length) ? (
            <div>
              <h2 className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-3">
                Street Ranking
              </h2>
              {Object.entries(streets).map(([tier, list]) =>
                list.length === 0 ? null : (
                  <section key={tier} className="mb-4 last:mb-0">
                    <h3 className={`tier-${tier} text-xs uppercase tracking-wider font-semibold mb-2`}>
                      {tier} · {list.length}
                    </h3>
                    <div className="space-y-2">
                      {list.map((s, idx) => (
                        <StreetCard
                          key={s.street}
                          street={s}
                          rank={idx + 1}
                          isFocused={focused?.street === s.street}
                          onFocus={() => setFocused(s)}
                        />
                      ))}
                    </div>
                  </section>
                ),
              )}
            </div>
          ) : null}
        </div>
      </aside>

      {/* Map */}
      <main className="flex-1 relative">
        {location ? (
          <MapView
            center={location}
            radius={radius}
            streets={streets}
            focused={focused}
            onSelectStreet={setFocused}
            recommendations={result?.recommendations || []}
            agencies={result?.agencies || null}
            loading={loading}
            enriching={!!(result?.loadingOverview || result?.loadingDetails)}
            phaseDone={result ? layersDoneOf(result) : 0}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No location set.
          </div>
        )}
      </main>

      {/* Right-side AI report panel */}
      <AnalysisReport result={result} category={category} loading={loading} location={location} />

      {/* Competitor Insights "More details" modal */}
      {showCompetitorModal && result?.competitorInsights ? (
        <CompetitorInsightsModal
          insights={result.competitorInsights}
          category={category}
          location={location}
          onClose={() => setShowCompetitorModal(false)}
        />
      ) : null}
    </div>
  );
}

// How many of the 3 layers (Phase 1 / overview / details) have finished.
// Used to drive the "X of 3 layers complete" message in the sidebar banner.
function layersDoneOf(result) {
  if (!result) return 0;
  let n = 1; // Phase 1 always done if we have a result
  if (!result.loadingOverview) n++;
  if (!result.loadingDetails) n++;
  return n;
}

// Short status label that reflects the most informative still-running phase.
function phaseLabel(result) {
  if (!result) return "Step 1 of 3 · Reading the map";
  if (result.loadingOverview && result.loadingDetails) {
    return "Steps 2 & 3 of 3 · AI is writing your analysis";
  }
  if (result.loadingOverview) return "Step 2 of 3 · Generating market overview";
  if (result.loadingDetails) return "Step 3 of 3 · Writing per-street insights";
  return "Analysis complete";
}

// Tolerant JSON reader: if the server returns plain text (Vercel timeout, gateway error,
// etc.), we surface a useful, actionable message instead of "Unexpected token 'A'".
async function safeJson(res, label = "request") {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 504 || res.status === 502 || text.startsWith("An error")) {
      throw new Error(
        `The ${label} took too long and was cut off by the server (likely a 60-second timeout). Try a smaller radius (500 m) or retry — second attempts are usually faster.`,
      );
    }
    throw new Error(
      `Server returned a non-JSON response (HTTP ${res.status}). First 120 chars: ${text.slice(0, 120)}`,
    );
  }
}

// Merge Phase-2 overview response into the result. Anything Phase 2 didn't produce
// keeps the Phase-1 fallback so the UI stays usable.
function mergeOverview(prev, data) {
  if (!prev) return prev;
  return {
    ...prev,
    report: data.report || prev.report,
    competitorInsights: data.competitorInsights || prev.competitorInsights,
    successFactors: data.successFactors || prev.successFactors,
    agencies: data.agencies || prev.agencies,
    loadingOverview: false,
    overviewError: null,
  };
}

// Merge Phase-3 details response into the result. Upgrades the template per-street
// paragraphs with LLM-written ones, and attaches "why this spot" reasoning to each rec.
function mergeDetails(prev, data) {
  if (!prev) return prev;
  const byStreet = new Map((data.explanations || []).map((e) => [e.street, e]));
  const upgrade = (s) => {
    const m = byStreet.get(s.street);
    return m ? { ...s, explanation: m.text, explanationSource: m.source } : s;
  };
  return {
    ...prev,
    gold: (prev.gold || []).map(upgrade),
    silver: (prev.silver || []).map(upgrade),
    bronze: (prev.bronze || []).map(upgrade),
    recommendations: (prev.recommendations || []).map((r, i) => {
      const reason = data.recReasons?.[i];
      return reason ? { ...r, reason: reason.text, reasonSource: reason.source } : r;
    }),
    loadingDetails: false,
    detailsError: null,
  };
}

// Inline copy of the red drop-pin used on the map (the `comp-pin` shape) — kept as a small
// SVG so the section header can show the same icon users see on the map.
function CompetitorPinIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 28 32" aria-hidden="true">
      <path
        d="M14 2 C 6.5 2 2 6.5 2 13.5 C 2 22 14 30 14 30 C 14 30 26 22 26 13.5 C 26 6.5 21.5 2 14 2 Z"
        fill="#ef4444"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="13" r="3.5" fill="#ffffff" />
    </svg>
  );
}

// Phase-1 progress message. Phase 2 (overview) and Phase 3 (details) progress appear
// as separate banners once Phase 1 finishes — the user sees the analysis fill in
// layer by layer across the 3 phases.
const STAGES = [
  { until: 999, text: "Step 1 of 3 · Reading the map" },
];
const SOFT_ETA_SECONDS = 25;

function AnalyzingProgress() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const message = STAGES[0].text;
  const pct = Math.min(95, Math.round((seconds / SOFT_ETA_SECONDS) * 100));
  const mm = String(Math.floor(seconds / 60));
  const ss = String(seconds % 60).padStart(2, "0");
  // Cycle dots: "", ".", "..", "..."
  const dots = ".".repeat((seconds % 4));

  return (
    <div className="text-xs text-slate-300">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-slate-200 font-medium">{message}{dots}</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <span className="tabular-nums">T+ {mm}:{ss}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
