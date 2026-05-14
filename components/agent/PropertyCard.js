"use client";

import { formatPrice } from "@/lib/agent/mockProperties";

const TYPE_BADGE = {
  apartment: { label: "Apartment", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  villa: { label: "Villa", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  townhouse: { label: "Townhouse", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  studio: { label: "Studio", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  penthouse: { label: "Penthouse", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  office: { label: "Office", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
};

export default function PropertyCard({
  property,
  isFavourite,
  onToggleFavourite,
  onSendToAI,
}) {
  const badge = TYPE_BADGE[property.type] || TYPE_BADGE.apartment;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 overflow-hidden flex flex-col hover:border-slate-500 transition">
      <div className="relative aspect-[5/3] bg-slate-800">
        <img
          src={property.image}
          alt={property.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${badge.color}`}>
            {badge.label}
          </span>
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
            property.listing === "sale"
              ? "bg-amber-500 text-slate-900"
              : "bg-slate-800 text-slate-200 border border-slate-600"
          }`}>
            {property.listing === "sale" ? "For Sale" : "For Rent"}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleFavourite}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full backdrop-blur flex items-center justify-center transition ${
            isFavourite ? "bg-rose-500 text-white" : "bg-slate-900/70 text-slate-300 hover:text-rose-400"
          }`}
          aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isFavourite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <div className="font-semibold text-sm text-slate-100 leading-tight">{property.title}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">{property.building} · {property.area}</div>

        <div className="mt-2 text-amber-300 font-semibold tabular-nums text-sm">
          {formatPrice(property)}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1 text-[10.5px] text-slate-400">
          <div>🛏 <span className="text-slate-200">{property.beds || "Studio"}</span></div>
          <div>🛁 <span className="text-slate-200">{property.baths}</span></div>
          <div>📐 <span className="text-slate-200">{property.area_sqft.toLocaleString()} ft²</span></div>
        </div>

        {property.distance != null ? (
          <div className="mt-2 text-[10px] text-slate-500">
            ~{property.distance < 1000 ? `${property.distance} m` : `${(property.distance / 1000).toFixed(1)} km`} from {property.matchedZone?.label || "zone"}
          </div>
        ) : null}

        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            onClick={onSendToAI}
            className="flex-1 px-2 py-1.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-[11px] font-semibold transition"
            title="Share this property in the AI customer chat"
          >
            Send to AI →
          </button>
          <a
            href={`tel:${property.agentPhone.replace(/\s/g, "")}`}
            className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold transition"
            title={`Call ${property.agent}`}
          >
            📞
          </a>
        </div>
      </div>
    </div>
  );
}
