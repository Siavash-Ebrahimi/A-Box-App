"use client";

// Featured Eshel Properties card pinned at the top of the Real Estate News
// view. Single-column layout — easy to read, low visual noise.
//
// Real-logo strategy (no hardcoded asset URL since we can't reach into
// eshelproperties.com's CMS): we try the Clearbit Brand Logo API first,
// then Google's favicon service, then fall back to a clean EP monogram.
// Each fallback uses the previous img tag's `onError` handler — guaranteed
// to render something on every render path.

import { useState } from "react";

const SITE_URL    = "https://eshelproperties.com/en";
const SITE_DOMAIN = "eshelproperties.com";

export default function EshelPropertiesCard() {
  return (
    <section className="mb-5 rounded-2xl overflow-hidden border border-slate-700 bg-slate-900/70 shadow-xl">
      <div className="p-5 sm:p-6">
        {/* Header row — logo + brand name */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
          <BrandLogo />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300 font-bold mb-0.5">
              Featured partner
            </div>
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-bold text-slate-100 hover:text-amber-200 transition truncate block"
              title="Open eshelproperties.com in a new tab"
            >
              Eshel Properties
            </a>
            <div className="text-[12px] text-slate-400">
              Dubai real-estate brokerage · RERA-licensed
            </div>
          </div>
        </div>

        {/* Body — short, scannable paragraph */}
        <p className="text-[13px] text-slate-200 leading-relaxed mt-4">
          Eshel Properties is a Dubai-based brokerage offering end-to-end real-estate
          services — sales, leasing, property management, off-plan launches, and
          investment advisory. Their multilingual team supports buyers, sellers, and
          tenants from first viewing through hand-over, with a focus on prime
          residential communities across the city.
        </p>

        {/* Service tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {[
            "🏡 Buy & Sell",
            "🔑 Leasing & Rentals",
            "🛠 Property Management",
            "🏗 Off-plan Launches",
            "📈 Investment Advisory",
            "🏦 Mortgage Liaison",
          ].map((label) => (
            <span
              key={label}
              className="text-[11px] px-2.5 py-1 rounded-full border border-slate-700 bg-slate-950 text-slate-200"
            >
              {label}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-800">
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-semibold px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 transition flex items-center gap-1.5"
          >
            🔗 Visit website
          </a>
          <a
            href="mailto:contact@eshelproperties.com"
            className="text-[12px] font-semibold px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 transition flex items-center gap-1.5"
          >
            ✉ Email
          </a>
          <a
            href="tel:+97140000000"
            className="text-[12px] font-semibold px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 transition flex items-center gap-1.5"
          >
            📞 Call
          </a>
        </div>
      </div>
    </section>
  );
}

// ---- Real-logo loader with graceful fallback chain ----------------------
//
// Tier 1: Clearbit Brand Logo API — returns a clean square logo for the
//         domain when it has one. Free for individual logo lookups.
// Tier 2: Google's favicon proxy — extremely reliable, returns the site's
//         favicon at the requested size.
// Tier 3: CSS-only "EP" monogram tile — guaranteed to render with no
//         network at all.

function BrandLogo() {
  const [tier, setTier] = useState(0);
  const sources = [
    `https://logo.clearbit.com/${SITE_DOMAIN}`,
    `https://www.google.com/s2/favicons?domain=${SITE_DOMAIN}&sz=128`,
  ];
  function next() { setTier((t) => t + 1); }

  if (tier >= sources.length) {
    // Final fallback — clean monogram tile in the brand's amber gradient.
    return (
      <div
        className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-slate-900 font-black text-xl shadow-lg shrink-0"
        title="Eshel Properties"
      >
        EP
      </div>
    );
  }
  return (
    <div className="w-16 h-16 rounded-xl bg-white border border-slate-700 shrink-0 flex items-center justify-center overflow-hidden shadow-lg">
      <img
        src={sources[tier]}
        alt="Eshel Properties logo"
        loading="lazy"
        onError={next}
        // Keep the logo padded inside the white tile so it never bleeds to
        // the edges regardless of source aspect ratio.
        className="max-w-[80%] max-h-[80%] object-contain"
      />
    </div>
  );
}
