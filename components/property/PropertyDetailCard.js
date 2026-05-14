"use client";

import { formatPrice } from "@/lib/agent/mockProperties";
import { primaryFilterForProperty } from "@/lib/property/filters";

// Slide-in detail panel for a single property. Anchored to the right edge of the
// map. Contains everything the spec asked for: pricing, features, location
// insights, investment angles, short-term vs long-term notes, and "Pick for
// comparison" actions wired to the compare-mode slot picker.

export default function PropertyDetailCard({
  property,
  onClose,
  // Compare-mode wiring
  compareMode,           // bool
  comparePick1Id,        // currently selected for slot 1
  comparePick2Id,        // currently selected for slot 2
  canPickForArea1,       // true if this property falls in area 1
  canPickForArea2,       // true if this property falls in area 2
  onPickForCompare,      // (slotIndex) => void
}) {
  if (!property) return null;
  const filter = primaryFilterForProperty(property);
  const pricePerSqft = property.price && property.area_sqft
    ? Math.round(property.price / property.area_sqft)
    : null;

  const isPick1 = comparePick1Id === property.id;
  const isPick2 = comparePick2Id === property.id;

  return (
    <div className="absolute right-3 top-3 bottom-3 z-[600] w-[380px] max-w-[92vw] rounded-lg border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
      <header className="relative">
        <div className="aspect-[5/3] bg-slate-800 overflow-hidden">
          <img
            src={property.image}
            alt={property.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-900/90 backdrop-blur text-slate-200 hover:text-white hover:bg-slate-800 flex items-center justify-center"
          aria-label="Close"
        >
          ✕
        </button>
        <div className="absolute top-2 left-2 flex gap-1">
          {filter ? (
            <span
              className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded backdrop-blur"
              style={{ background: `${filter.color}d0`, color: "#0b1220" }}
            >
              {filter.icon} {filter.label}
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-4">
        {/* Title + headline price */}
        <div>
          <h3 className="text-base font-semibold text-slate-100 leading-tight">
            {property.title}
          </h3>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {property.building} · {property.area}
          </div>
          <div className="mt-2 text-lg font-bold text-amber-300 tabular-nums">
            {formatPrice(property)}
            {pricePerSqft ? (
              <span className="ml-2 text-[11px] font-normal text-slate-400">
                AED {pricePerSqft.toLocaleString()}/sqft
              </span>
            ) : null}
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <Stat label="Bedrooms" value={property.beds || "Studio"} />
          <Stat label="Bathrooms" value={property.baths} />
          <Stat label="Area" value={`${property.area_sqft.toLocaleString()} ft²`} />
          <Stat label="Type" value={cap(property.type)} />
          <Stat label="Listing" value={property.listing === "rent" ? "Rent" : "Sale"} />
          <Stat label="Built" value={property.yearBuilt} />
        </div>

        {/* Features */}
        {property.features?.length ? (
          <Section title="Features & amenities">
            <div className="flex flex-wrap gap-1">
              {property.features.map((f, i) => (
                <span
                  key={i}
                  className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700"
                >
                  {f}
                </span>
              ))}
            </div>
          </Section>
        ) : null}

        {/* Location insight (heuristic from area metadata) */}
        <Section title="Location insights">
          <div className="text-[11.5px] text-slate-300 leading-relaxed">
            {locationInsight(property)}
          </div>
        </Section>

        {/* Investment angle */}
        <Section title="Investment analysis">
          <div className="text-[11.5px] text-slate-300 leading-relaxed">
            {investmentInsight(property)}
          </div>
        </Section>

        {/* Short-term vs long-term */}
        <Section title="Short-term vs long-term">
          <div className="text-[11.5px] text-slate-300 leading-relaxed">
            {usageInsight(property)}
          </div>
        </Section>

        {/* Agent */}
        <Section title="Listing agent">
          <div className="flex items-center justify-between text-[11.5px] text-slate-300">
            <span>
              <strong className="text-slate-100">{property.agent}</strong>
              <br />
              <span className="text-slate-400">{property.agentPhone}</span>
            </span>
            <a
              href={`tel:${property.agentPhone.replace(/\s/g, "")}`}
              className="text-xs px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
              title={`Call ${property.agent}`}
            >
              📞 Call
            </a>
          </div>
        </Section>
      </div>

      {/* Compare-mode action bar */}
      {compareMode ? (
        <footer className="px-4 py-3 border-t border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
            Add to comparison
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!canPickForArea1}
              onClick={() => onPickForCompare?.(1)}
              className={`text-[11.5px] font-semibold px-2.5 py-1.5 rounded border transition ${
                isPick1
                  ? "border-blue-500 bg-blue-500/20 text-blue-200"
                  : canPickForArea1
                    ? "border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200"
                    : "border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed"
              }`}
            >
              {isPick1 ? "✓ Picked as Area 1" : "Pick for Area 1"}
            </button>
            <button
              type="button"
              disabled={!canPickForArea2}
              onClick={() => onPickForCompare?.(2)}
              className={`text-[11.5px] font-semibold px-2.5 py-1.5 rounded border transition ${
                isPick2
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-200"
                  : canPickForArea2
                    ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200"
                    : "border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed"
              }`}
            >
              {isPick2 ? "✓ Picked as Area 2" : "Pick for Area 2"}
            </button>
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 leading-snug">
            A property can only be picked for the area it falls inside. Pick one from each
            area to enable the AI comparison report.
          </div>
        </footer>
      ) : null}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
        {title}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950 p-2">
      <div className="text-[9.5px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-[12.5px] text-slate-100 font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : "—";
}

// --- Heuristic copy generators (no LLM) so the panel is informative even offline.

function locationInsight(p) {
  const map = {
    "Dubai Marina": "Waterfront district with the Marina Walk, tram access, JBR beach within walking distance, and a dense bar/restaurant strip. Strong tourist and young-professional footfall.",
    "Downtown Dubai": "Premium central district anchored by Burj Khalifa and Dubai Mall, walking distance to Opera and DIFC, well served by the red metro line.",
    "Business Bay": "Mixed office + residential canal-front district between Downtown and Al Quoz; metro access, fast Sheikh Zayed Road link, growing F&B scene.",
    "JVC":          "Master-planned family district with parks, schools, and affordable price-per-sqft. Less transit, very car-dependent.",
    "Palm Jumeirah": "Iconic gated peninsula with private beaches, monorail spine, and Atlantis/One&Only anchors. Premium prices, low inventory.",
    "Arabian Ranches": "Suburban villa community oriented around the golf course and family amenities. Long but reliable commute on Sheikh Mohammed Bin Zayed Road.",
    "Al Quoz":      "Mixed industrial / creative-warehouse district; established for art galleries, manufacturing, and large showrooms.",
    "Dubai Investment Park": "Industrial / logistics district with warehouses, light manufacturing, and Expo City access.",
  };
  return map[p.area] || "A Dubai sub-market with its own price point and demand profile — check transit, parking, and anchor proximity in person.";
}

function investmentInsight(p) {
  if (p.listing === "sale") {
    const yieldGuess = p.area_sqft > 2500 ? "4-5% gross" : p.type === "studio" ? "7-9% gross" : "5-7% gross";
    return `Typical ${yieldGuess} rental yield for similar units in ${p.area}. Capital appreciation profile depends on developer track record and upcoming infrastructure (metro extensions, master-plan completions). Confirm service charge per sqft before modelling net yield.`;
  }
  return `Rented at ${formatPrice(p)} — benchmark this against the 3 closest comparable listings before signing. Rent rises in Dubai are capped by the RERA index; ask the landlord for the prior year's contract value.`;
}

function usageInsight(p) {
  const acts = p.activities || [];
  const lines = [];
  if (acts.includes("airbnb") || (p.features || []).join(" ").toLowerCase().includes("short-term")) {
    lines.push("Building permits short-term let, so Airbnb / DTCM-licensed daily rentals are an option — typically 1.5-2x long-term gross income net of management.");
  }
  if (p.type === "studio") {
    lines.push("Studios are the easiest unit to fill year-round and the easiest to flip — they suit investors prioritising liquidity over total return.");
  }
  if (p.type === "villa" || p.type === "townhouse") {
    lines.push("Villas/townhouses serve family long-term tenants — lower turnover, but heavier maintenance and longer void periods between tenancies.");
  }
  if (p.type === "office" || p.type === "warehouse" || p.type === "retail") {
    lines.push("Commercial inventory typically signs 1-3 year leases with annual escalators; tenant quality matters more than headline rent.");
  }
  if (lines.length === 0) {
    lines.push("Long-term rental is the default play here. Short-term let depends on building-owner association rules — verify before assuming.");
  }
  return lines.join(" ");
}
