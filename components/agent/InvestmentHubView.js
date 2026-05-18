"use client";

// Investment Hub — the third major Agent Hub section.
// Surfaces curated investment opportunities the A-Box team has vetted.
// Three big hero cards (Franchise / Vending / Water-From-Air), each opens a
// portal modal with a deeper pitch, a quick stat grid, included perks, and
// an "Express interest" CTA. Centered max-width layout so the page feels
// premium and built for investors.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import TranslateButtons from "@/components/TranslateButtons";

const OPPORTUNITIES = [
  {
    key: "franchise",
    title: "Franchise Opportunities",
    tagline:
      "Established brands ready to expand in Dubai — matched to your zones, capital, and footfall.",
    icon: "🏛️",
    color: "#f59e0b",
    accent: "from-amber-500/30 via-amber-500/10 to-transparent",
    // On-topic inline SVG illustration — guaranteed to render, no external
    // network dependency, clearly identifies the category.
    Illustration: FranchiseIllustration,
    bullets: [
      "50+ vetted F&B, retail, and services brands",
      "Capital window AED 250K → 5M",
      "Full training, territorial protection & supply chain",
    ],
    stats: [
      { label: "Brands available", value: "50+" },
      { label: "Capital range",    value: "AED 250K – 5M" },
      { label: "Avg. setup",       value: "8 weeks" },
      { label: "Target IRR",       value: "22 – 35%" },
    ],
    overview: `Skip the cold-start risk. Our franchise desk matches you to
brands that already perform in markets similar to Dubai, then handles the
territorial filing, lease sourcing, fit-out coordination and staff training
end-to-end. You bring the capital and the appetite — we plug you into a
playbook that has proven unit economics.`,
    included: [
      "Brand-fit interview + capital matching",
      "Zone-level footfall + competition report",
      "Term-sheet negotiation with the franchisor",
      "Fit-out partner shortlist + tendering",
      "Soft-launch marketing & opening playbook",
      "First-90-days operational hand-holding",
    ],
    cta: "Browse franchise brands →",
  },
  {
    key: "vending",
    title: "Vending Machine Investment",
    tagline:
      "Passive-income vending placements across Dubai's highest-footfall zones — fully managed.",
    icon: "🥤",
    color: "#06b6d4",
    accent: "from-cyan-500/30 via-cyan-500/10 to-transparent",
    Illustration: VendingIllustration,
    bullets: [
      "From AED 15K per smart machine",
      "Placement, restocking & cashless POS handled for you",
      "18 – 24% est. annual yield on a portfolio of 5+",
    ],
    stats: [
      { label: "Ticket",          value: "From AED 15K" },
      { label: "Est. annual yield", value: "18 – 24%" },
      { label: "Footfall pool",   value: "120+ sites" },
      { label: "Payback (typ.)",  value: "30 – 42 mo" },
    ],
    overview: `We've contracted shelf-space at offices, residential towers,
co-working clusters and transit hubs across Dubai. You buy the machines, we
handle the placement, restocking, telemetry, cashless POS, and revenue
share with the property. Monthly statements + a live dashboard so you can
see every cup.`,
    included: [
      "Pre-qualified sites with footfall data",
      "Choice of snack / hot drink / fresh / PPE machines",
      "24/7 telemetry, low-stock alerts, restock SLAs",
      "Cashless POS + monthly revenue reconciliation",
      "Annual repositioning at no cost if a site underperforms",
      "Insurance + maintenance bundled",
    ],
    cta: "See vending plans →",
  },
  {
    key: "water_from_air",
    title: "Water From Air Investment",
    tagline:
      "Atmospheric water generators for offices, sites, and remote ops — a real ROI in a region thirsty for water.",
    icon: "💧",
    color: "#22d3ee",
    accent: "from-sky-500/30 via-cyan-500/10 to-transparent",
    Illustration: WaterAirIllustration,
    bullets: [
      "From AED 60K per AWG unit",
      "Off-grid potable water — 30L to 5,000L / day",
      "30-month payback typical · carbon-positive product",
    ],
    stats: [
      { label: "Ticket",           value: "From AED 60K" },
      { label: "Output",           value: "30 – 5,000 L/day" },
      { label: "Payback (typ.)",   value: "~30 months" },
      { label: "Buyer pool",       value: "Sites · clinics · villas" },
    ],
    overview: `Atmospheric water generators pull humidity out of the air and
output mineral-balanced potable water. In Dubai's climate they earn their
keep — replacing bottled-water deliveries, off-setting site logistics, and
opening up remote-site contracts (oilfields, construction camps, rural
villas) where pipes don't reach. We lease them to operators on multi-year
contracts and pay you a fixed monthly yield.`,
    included: [
      "Site survey + sizing (30L household → 5,000L industrial)",
      "Installation, commissioning, and operator hand-over",
      "12-year warranty + scheduled servicing",
      "Multi-year offtake contracts with vetted operators",
      "Quarterly performance reports + monthly distribution",
      "Optional carbon-credit registration",
    ],
    cta: "Explore AWG units →",
  },
];

export default function InvestmentHubView({ profile }) {
  const [open, setOpen] = useState(null); // opportunity key being shown in the modal

  const opp = open ? OPPORTUNITIES.find((o) => o.key === open) : null;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="px-8 py-8 max-w-6xl mx-auto">
        {/* Hero header */}
        <header className="text-center mb-9">
          <div className="text-[10px] uppercase tracking-[0.22em] text-amber-300 font-semibold mb-2">
            A-Box · Capital
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
            Investment Hub
          </h1>
          <p className="text-sm text-slate-400 mt-3 max-w-2xl mx-auto leading-relaxed">
            Curated, vetted investment opportunities across Dubai — picked by our team and
            matched to your working zones. Each card opens a deeper brief with included
            perks, indicative returns, and a one-click way to express interest.
          </p>
          {profile?.name ? (
            <div className="mt-3 text-[11px] text-slate-500">
              Hi {profile.name.split(" ")[0]} — pick a category below to discover the
              opportunities our partners are opening this quarter.
            </div>
          ) : null}
        </header>

        {/* Three opportunity cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {OPPORTUNITIES.map((o) => (
            <OpportunityCard key={o.key} opportunity={o} onOpen={() => setOpen(o.key)} />
          ))}
        </div>

        {/* Footer reassurance copy */}
        <div className="mt-10 rounded-xl border border-slate-700 bg-slate-900/40 p-5 text-center">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
            Why A-Box Capital
          </div>
          <div className="text-[12.5px] text-slate-200 leading-relaxed max-w-2xl mx-auto">
            Every opportunity here is vetted against the same Gold/Silver/Bronze methodology
            you already use for your zones — footfall, competition, transit access, anchor
            density. We surface the numbers; you decide.
          </div>
        </div>
      </div>

      {opp ? <OpportunityModal opportunity={opp} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

// ----- Card --------------------------------------------------------------

function OpportunityCard({ opportunity, onOpen }) {
  const { title, tagline, icon, color, accent, Illustration, bullets, stats, cta } = opportunity;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left rounded-2xl overflow-hidden border border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:shadow-2xl transition-all hover:-translate-y-0.5 flex flex-col"
      style={{ boxShadow: `0 12px 30px -18px ${color}55` }}
    >
      {/* Inline SVG hero — guaranteed to render, clearly on-topic. */}
      <div className="relative h-44 overflow-hidden">
        <div className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-500">
          <Illustration />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-slate-950/0" />
        {/* Big glyph badge in the top-left */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-lg"
            style={{ background: `${color}30`, border: `1px solid ${color}90` }}
          >
            {icon}
          </span>
        </div>
        {/* Title pinned to bottom of the hero */}
        <div className="absolute bottom-3 left-4 right-4">
          <div className="text-[10px] uppercase tracking-wider font-bold opacity-90" style={{ color }}>
            Investment opportunity
          </div>
          <h2 className="text-lg font-bold text-slate-100 leading-tight">{title}</h2>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-[12.5px] text-slate-300 leading-relaxed">{tagline}</p>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {stats.slice(0, 4).map((s) => (
            <div key={s.label} className="rounded-lg bg-slate-950/70 border border-slate-800 px-2.5 py-2">
              <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold">
                {s.label}
              </div>
              <div className="text-[12px] font-bold text-slate-100 mt-0.5 tabular-nums">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Bullets */}
        <ul className="mt-4 space-y-1.5 flex-1">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[11.5px] text-slate-300 leading-snug">
              <span className="shrink-0 mt-0.5" style={{ color }}>▸</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div
          className="mt-4 w-full text-center text-[12.5px] font-semibold py-2.5 rounded-lg transition group-hover:scale-[1.01]"
          style={{
            background: `${color}22`,
            border: `1px solid ${color}80`,
            color,
          }}
        >
          {cta}
        </div>
      </div>
    </button>
  );
}

// ----- Modal -------------------------------------------------------------

function OpportunityModal({ opportunity, onClose }) {
  const [mounted, setMounted] = useState(false);
  // Translation surface for the long "overview" pitch.
  const [shownOverview, setShownOverview] = useState(opportunity.overview);
  const [rtl, setRtl] = useState(false);
  const [interested, setInterested] = useState(false);

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

  useEffect(() => {
    setShownOverview(opportunity.overview);
    setRtl(false);
    setInterested(false);
  }, [opportunity.key, opportunity.overview]);

  if (!mounted) return null;
  const { title, icon, color, accent, Illustration, stats, included, cta } = opportunity;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — investment brief`}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-3xl w-full max-h-[92vh] bg-slate-900 border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ borderColor: `${color}66` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero */}
        <div className="relative h-48 shrink-0">
          <div className="absolute inset-0 w-full h-full">
            <Illustration />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-slate-900/0" />
          <div className="absolute top-3 right-3">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-200 bg-slate-900/70 hover:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center text-base"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="absolute bottom-4 left-5 right-5 flex items-end gap-3">
            <span
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-lg"
              style={{ background: `${color}30`, border: `1px solid ${color}` }}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color }}>
                Investment brief
              </div>
              <h2 className="text-xl font-bold text-slate-100 truncate">{title}</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg bg-slate-950/70 border border-slate-800 px-3 py-2.5">
                <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold">
                  {s.label}
                </div>
                <div className="text-[13px] font-bold text-slate-100 mt-0.5 tabular-nums">
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Overview with translation */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color }}>
                Overview
              </div>
              <TranslateButtons
                text={opportunity.overview}
                onTranslated={(t, _lang, isRtl) => { setShownOverview(t); setRtl(isRtl); }}
                compact
              />
            </div>
            <div
              dir={rtl ? "rtl" : "ltr"}
              className="text-[12.5px] text-slate-200 leading-relaxed whitespace-pre-line"
            >
              {shownOverview}
            </div>
          </section>

          {/* Included */}
          <section>
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color }}>
              What's included
            </div>
            <ul className="space-y-1.5">
              {included.map((line) => (
                <li key={line} className="flex items-start gap-2 text-[12px] text-slate-200 leading-snug">
                  <span className="shrink-0 mt-0.5" style={{ color }}>✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Disclaimer */}
          <div className="text-[10.5px] text-slate-500 leading-relaxed italic">
            Figures are indicative. Final terms are confirmed in the brief sent after you
            express interest. Capital at risk; no guarantee of returns.
          </div>
        </div>

        {/* Footer CTA */}
        <footer className="px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setInterested(true)}
            disabled={interested}
            className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg transition disabled:cursor-default"
            style={
              interested
                ? { background: "#0f172a", border: "1px solid #10b981", color: "#6ee7b7" }
                : { background: color, color: "#0f172a" }
            }
          >
            {interested
              ? "✓ Interest registered — our team will be in touch within 1 business day."
              : cta.replace(/ →$/, "") + " · Express interest"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 transition"
          >
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

// ----- Inline SVG illustrations ------------------------------------------
//
// Why SVG instead of stock photos: SVG is guaranteed to render (no 404, no
// CORS, no quota), scales crisply to any device pixel ratio, and lets us
// match each card's brand colour exactly. The illustrations are deliberately
// simple — bold shapes that read instantly as "franchise row of shops",
// "vending machine", "atmospheric water generator".

function FranchiseIllustration() {
  return (
    <svg
      viewBox="0 0 1200 480"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className="block w-full h-full"
    >
      <defs>
        <linearGradient id="franchise-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="60%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id="franchise-pave" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>
      {/* Sky + pavement */}
      <rect width="1200" height="360" fill="url(#franchise-sky)" />
      <rect y="360" width="1200" height="120" fill="url(#franchise-pave)" />
      {/* Sun */}
      <circle cx="960" cy="90" r="46" fill="#fff" opacity="0.85" />
      <circle cx="960" cy="90" r="32" fill="#fbbf24" />

      {/* Shop 1 — Café (red awning) */}
      <g>
        <rect x="60" y="160" width="320" height="200" fill="#92400e" />
        <rect x="60" y="200" width="320" height="6" fill="#7c2d12" />
        <polygon points="60,160 380,160 360,210 80,210" fill="#dc2626" />
        {/* awning stripes */}
        <line x1="120" y1="160" x2="100" y2="210" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        <line x1="180" y1="160" x2="160" y2="210" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        <line x1="240" y1="160" x2="220" y2="210" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        <line x1="300" y1="160" x2="280" y2="210" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        <line x1="360" y1="160" x2="340" y2="210" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        {/* sign */}
        <rect x="90" y="120" width="260" height="42" fill="#7c2d12" />
        <text x="220" y="150" textAnchor="middle" fontFamily="Verdana, sans-serif" fontSize="22" fontWeight="bold" fill="#fef3c7">CAFÉ</text>
        {/* window + door */}
        <rect x="90" y="240" width="160" height="100" fill="#fde68a" stroke="#7c2d12" strokeWidth="4" />
        <line x1="170" y1="240" x2="170" y2="340" stroke="#7c2d12" strokeWidth="4" />
        <line x1="90" y1="290" x2="250" y2="290" stroke="#7c2d12" strokeWidth="4" />
        <rect x="270" y="240" width="90" height="120" fill="#7c2d12" />
        <circle cx="345" cy="300" r="4" fill="#fbbf24" />
      </g>

      {/* Shop 2 — Bakery (green awning, taller) */}
      <g>
        <rect x="420" y="120" width="360" height="240" fill="#78350f" />
        <polygon points="420,120 780,120 760,180 440,180" fill="#16a34a" />
        <line x1="480" y1="120" x2="460" y2="180" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        <line x1="540" y1="120" x2="520" y2="180" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        <line x1="600" y1="120" x2="580" y2="180" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        <line x1="660" y1="120" x2="640" y2="180" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        <line x1="720" y1="120" x2="700" y2="180" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        {/* sign */}
        <rect x="450" y="80" width="300" height="42" fill="#14532d" />
        <text x="600" y="110" textAnchor="middle" fontFamily="Verdana, sans-serif" fontSize="22" fontWeight="bold" fill="#fef3c7">BAKERY</text>
        {/* windows + door */}
        <rect x="450" y="210" width="110" height="120" fill="#fde68a" stroke="#14532d" strokeWidth="4" />
        <line x1="450" y1="270" x2="560" y2="270" stroke="#14532d" strokeWidth="4" />
        <line x1="505" y1="210" x2="505" y2="330" stroke="#14532d" strokeWidth="4" />
        <rect x="580" y="210" width="90" height="150" fill="#14532d" />
        <circle cx="655" cy="290" r="4" fill="#fbbf24" />
        <rect x="690" y="210" width="80" height="120" fill="#fde68a" stroke="#14532d" strokeWidth="4" />
        {/* awning support */}
      </g>

      {/* Shop 3 — Coffee (cyan awning) */}
      <g>
        <rect x="820" y="170" width="320" height="190" fill="#92400e" />
        <polygon points="820,170 1140,170 1120,220 840,220" fill="#0e7490" />
        <line x1="880" y1="170" x2="860" y2="220" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        <line x1="940" y1="170" x2="920" y2="220" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        <line x1="1000" y1="170" x2="980" y2="220" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        <line x1="1060" y1="170" x2="1040" y2="220" stroke="#fff" strokeOpacity="0.6" strokeWidth="6" />
        {/* sign */}
        <rect x="850" y="130" width="260" height="42" fill="#0c4a6e" />
        <text x="980" y="160" textAnchor="middle" fontFamily="Verdana, sans-serif" fontSize="22" fontWeight="bold" fill="#fef3c7">COFFEE</text>
        {/* window + door */}
        <rect x="850" y="250" width="150" height="90" fill="#fde68a" stroke="#0c4a6e" strokeWidth="4" />
        <line x1="925" y1="250" x2="925" y2="340" stroke="#0c4a6e" strokeWidth="4" />
        <rect x="1020" y="250" width="90" height="110" fill="#0c4a6e" />
        <circle cx="1095" cy="305" r="4" fill="#fbbf24" />
      </g>

      {/* People silhouettes on pavement for life */}
      <g fill="#1f2937" opacity="0.55">
        <circle cx="200" cy="400" r="10" />
        <rect x="190" y="408" width="20" height="34" rx="4" />
        <circle cx="540" cy="395" r="9" />
        <rect x="531" y="402" width="18" height="32" rx="4" />
        <circle cx="900" cy="402" r="10" />
        <rect x="890" y="410" width="20" height="32" rx="4" />
      </g>
    </svg>
  );
}

function VendingIllustration() {
  return (
    <svg
      viewBox="0 0 1200 480"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className="block w-full h-full"
    >
      <defs>
        <linearGradient id="vending-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#083344" />
          <stop offset="100%" stopColor="#155e75" />
        </linearGradient>
        <linearGradient id="vending-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="vending-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0e7490" />
          <stop offset="60%" stopColor="#155e75" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      <rect width="1200" height="480" fill="url(#vending-bg)" />

      {/* Floor shadow */}
      <ellipse cx="600" cy="450" rx="320" ry="14" fill="#000" opacity="0.4" />

      {/* Machine body */}
      <rect x="380" y="40" width="440" height="400" rx="14" fill="url(#vending-body)" stroke="#94a3b8" strokeWidth="3" />
      {/* Top brand bar */}
      <rect x="380" y="40" width="440" height="50" rx="14" fill="#0891b2" />
      <text x="600" y="74" textAnchor="middle" fontFamily="Verdana, sans-serif" fontSize="22" fontWeight="bold" fill="#fff" letterSpacing="6">VEND</text>

      {/* Glass display window */}
      <rect x="400" y="100" width="320" height="240" rx="6" fill="url(#vending-glass)" stroke="#475569" strokeWidth="3" />
      {/* Product slots — 3 rows × 4 cols */}
      {Array.from({ length: 3 }).map((_, row) => (
        Array.from({ length: 4 }).map((__, col) => {
          const colors = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#fb923c", "#22d3ee", "#facc15", "#4ade80", "#818cf8", "#fda4af"];
          const id = row * 4 + col;
          const fill = colors[id % colors.length];
          const x = 418 + col * 76;
          const y = 116 + row * 78;
          return (
            <g key={id}>
              {/* shelf */}
              <line x1={400} y1={y + 66} x2={720} y2={y + 66} stroke="#475569" strokeWidth="2" opacity="0.5" />
              {/* bottle */}
              <rect x={x + 8} y={y + 4} width="46" height="58" rx="5" fill={fill} stroke="#0f172a" strokeWidth="1.5" />
              <rect x={x + 22} y={y - 4} width="18" height="10" rx="2" fill={fill} stroke="#0f172a" strokeWidth="1.5" />
              <rect x={x + 14} y={y + 26} width="34" height="14" fill="#fff" opacity="0.7" />
            </g>
          );
        })
      ))}

      {/* Right control column: keypad + card reader */}
      <rect x="740" y="110" width="68" height="120" rx="6" fill="#334155" stroke="#0f172a" strokeWidth="2" />
      {Array.from({ length: 4 }).map((_, r) => (
        Array.from({ length: 3 }).map((__, c) => {
          const id = r * 3 + c;
          return (
            <rect
              key={`btn-${id}`}
              x={748 + c * 17}
              y={120 + r * 26}
              width="14" height="20" rx="3"
              fill="#cbd5e1"
              stroke="#0f172a"
              strokeWidth="1"
            />
          );
        })
      ))}
      {/* card reader slot */}
      <rect x="746" y="240" width="56" height="36" rx="4" fill="#0f172a" />
      <rect x="752" y="250" width="44" height="6" fill="#0891b2" />
      <text x="774" y="270" textAnchor="middle" fontFamily="Verdana, sans-serif" fontSize="9" fill="#0891b2" fontWeight="bold">PAY</text>

      {/* Dispenser slot at bottom */}
      <rect x="400" y="356" width="320" height="60" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
      <rect x="420" y="372" width="280" height="28" rx="2" fill="#0f172a" />

      {/* Coin slot indicator */}
      <rect x="740" y="290" width="68" height="38" rx="4" fill="#0f172a" />
      <text x="774" y="314" textAnchor="middle" fontFamily="Verdana, sans-serif" fontSize="11" fill="#22d3ee" fontWeight="bold">A1</text>
    </svg>
  );
}

function WaterAirIllustration() {
  return (
    <svg
      viewBox="0 0 1200 480"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      className="block w-full h-full"
    >
      <defs>
        <linearGradient id="water-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
        <linearGradient id="water-unit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <rect width="1200" height="480" fill="url(#water-sky)" />

      {/* Soft clouds */}
      <g fill="#fff" opacity="0.7">
        <ellipse cx="180" cy="90" rx="80" ry="22" />
        <ellipse cx="240" cy="80" rx="60" ry="18" />
        <ellipse cx="900" cy="60" rx="90" ry="22" />
        <ellipse cx="980" cy="70" rx="60" ry="18" />
      </g>

      {/* Air-intake arrows above the unit */}
      <g stroke="#0369a1" strokeWidth="3" fill="none" opacity="0.6">
        <path d="M 540 80 q 30 30 0 60" markerEnd="url(#arrowDown)" />
        <path d="M 600 70 q 30 30 0 70" markerEnd="url(#arrowDown)" />
        <path d="M 660 80 q 30 30 0 60" markerEnd="url(#arrowDown)" />
      </g>
      <defs>
        <marker id="arrowDown" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0369a1" />
        </marker>
      </defs>

      {/* Ground */}
      <rect y="420" width="1200" height="60" fill="#0c4a6e" opacity="0.5" />

      {/* AWG unit body */}
      <rect x="430" y="160" width="340" height="240" rx="14" fill="url(#water-unit)" stroke="#475569" strokeWidth="3" />
      {/* top vent grille */}
      <rect x="450" y="170" width="300" height="40" rx="6" fill="#1e293b" />
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={`vent-${i}`}
          x1={460 + i * 24} y1="178" x2={460 + i * 24} y2="202"
          stroke="#64748b" strokeWidth="2"
        />
      ))}

      {/* Display panel */}
      <rect x="460" y="230" width="180" height="60" rx="6" fill="#082f49" stroke="#0c4a6e" strokeWidth="2" />
      <text x="475" y="252" fontFamily="Verdana, sans-serif" fontSize="11" fontWeight="bold" fill="#7dd3fc">AWG · LIVE</text>
      <text x="475" y="278" fontFamily="Verdana, sans-serif" fontSize="20" fontWeight="bold" fill="#22d3ee">42°C · 68% RH</text>

      {/* Indicator lights */}
      <circle cx="690" cy="248" r="8" fill="#22c55e" />
      <circle cx="715" cy="248" r="8" fill="#fbbf24" />
      <circle cx="740" cy="248" r="8" fill="#0ea5e9" />

      {/* Brand label */}
      <text x="600" y="320" textAnchor="middle" fontFamily="Verdana, sans-serif" fontSize="22" fontWeight="bold" fill="#0c4a6e" letterSpacing="4">A-BOX · AWG</text>
      <text x="600" y="346" textAnchor="middle" fontFamily="Verdana, sans-serif" fontSize="11" fill="#475569">Atmospheric Water Generator</text>

      {/* Faucet + water stream */}
      <rect x="590" y="370" width="20" height="20" fill="#475569" />
      <rect x="565" y="386" width="70" height="14" rx="3" fill="#334155" />

      {/* Water stream */}
      <path d="M 600 400 Q 600 425 600 440" stroke="#22d3ee" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Splash droplets */}
      <circle cx="592" cy="448" r="3" fill="#22d3ee" />
      <circle cx="608" cy="446" r="2.5" fill="#67e8f9" />
      <circle cx="600" cy="455" r="4" fill="#22d3ee" />

      {/* Glass cup */}
      <path d="M 562 420 L 568 460 L 632 460 L 638 420 Z" fill="#cffafe" stroke="#67e8f9" strokeWidth="2" />
      <rect x="568" y="420" width="64" height="22" fill="#22d3ee" opacity="0.55" />

      {/* Big water droplet badge top-right */}
      <g transform="translate(1050, 130)">
        <path d="M 0 0 C -30 35 -45 60 -45 80 a 45 45 0 0 0 90 0 c 0 -20 -15 -45 -45 -80 z" fill="#22d3ee" stroke="#fff" strokeWidth="3" />
        <ellipse cx="-12" cy="60" rx="10" ry="14" fill="#fff" opacity="0.45" />
      </g>
    </svg>
  );
}
