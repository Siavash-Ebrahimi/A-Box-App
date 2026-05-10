"use client";

// Compact card. The full analysis paragraph + breakdown + businesses list now appear
// only when the user clicks (this card or the polyline on the map).
// `rank` is the 1-based position within the tier (Gold 1/2/3, Silver 1/2/3, Bronze 1/2/3).

export default function StreetCard({ street, rank, onFocus, isFocused }) {
  const { tier, score, breakdown, highway } = street;
  const competitorCount = street.businesses.filter((b) => b.isCompetitor).length;

  return (
    <button
      type="button"
      onClick={onFocus}
      className={`w-full text-left px-3 py-2 rounded border transition flex items-start gap-2.5 ${
        isFocused
          ? "border-amber-500 bg-slate-800"
          : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
      }`}
    >
      {rank ? <RankBadge rank={rank} tier={tier} /> : null}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-[13px] truncate">{street.street}</div>
          <span className={`tier-pill ${tier}`}>{tier}</span>
        </div>
        <div className="mt-1 text-[10.5px] text-slate-400 flex items-center gap-2 flex-wrap">
          <span>Score <span className="text-slate-200 font-semibold">{Math.round(score)}</span></span>
          {highway ? <span className="text-slate-500">· {highway}</span> : null}
          <span className="text-slate-500">·</span>
          <span>Competitors: <span className="text-slate-200">{competitorCount}</span></span>
        </div>
      </div>
    </button>
  );
}

// Rank badge — coloured to match the street's tier so the visual hierarchy
// reads "Gold #1" at a glance.
function RankBadge({ rank, tier }) {
  const tierStyle = {
    gold:   "bg-amber-500/20  text-amber-300  border-amber-500/40",
    silver: "bg-slate-400/15  text-slate-200  border-slate-400/40",
    bronze: "bg-orange-700/20 text-orange-300 border-orange-600/40",
  }[tier] || "bg-slate-700 text-slate-200 border-slate-600";
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-full border text-[11px] font-bold tabular-nums ${tierStyle}`}
      aria-label={`Rank ${rank} in ${tier} tier`}
    >
      {rank}
    </span>
  );
}
