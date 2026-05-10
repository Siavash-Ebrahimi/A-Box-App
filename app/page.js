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

  async function analyze() {
    if (!location) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setFocused(null);
    try {
      const res = await fetch("/api/analyze", {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
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

        {result?.competitorInsights ? (
          <div className="mx-5 my-3 p-3 rounded border border-slate-700 bg-slate-900/60 text-slate-200 text-xs leading-relaxed">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CompetitorPinIcon />
                <span>Successful Businesses Nearby</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap">
                {result.competitorInsights.source}
              </span>
            </div>
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

// User-friendly messages — no technical jargon. The user just wants to know we're working.
const STAGES = [
  { until: 999, text: "Please wait, we are processing your request" },
];
const SOFT_ETA_SECONDS = 45;

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
