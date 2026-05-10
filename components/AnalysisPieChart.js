"use client";

// Pie chart visualising how the score of the TOP recommended street is composed.
// Each slice is a positive contribution to the score (anchors, transit, residential,
// road class, density, variety, base 100). The competitor penalty is shown as a
// separate red counter-slice with a "−" label for clarity. Pure SVG, no deps.

const SLICE_COLORS = {
  base:        "#475569",
  density:     "#64748b",
  variety:     "#94a3b8",
  transit:     "#06b6d4",
  anchors:     "#a855f7",
  residential: "#10b981",
  highway:     "#f59e0b",
  competitors: "#ef4444",
};

export function buildPieData(topStreet) {
  if (!topStreet?.breakdown) return [];
  const bd = topStreet.breakdown;
  const b = bd.bonuses || {};

  const data = [
    { key: "base",        label: "Base score",         value: 100,                                        color: SLICE_COLORS.base },
    { key: "density",     label: "Commercial density", value: Math.round(Math.min(bd.density, 30) * 1.5), color: SLICE_COLORS.density },
    { key: "variety",     label: "Category variety",   value: Math.round(bd.variety * 2),                 color: SLICE_COLORS.variety },
    { key: "transit",     label: "Transit access",     value: Math.round(b.transit || 0),                 color: SLICE_COLORS.transit },
    { key: "anchors",     label: "Anchor POIs",        value: Math.round(b.anchors || 0),                 color: SLICE_COLORS.anchors },
    { key: "residential", label: "Residential",        value: Math.round(b.residential || 0),             color: SLICE_COLORS.residential },
    { key: "highway",     label: "Road class",         value: Math.round(b.highway || 0),                 color: SLICE_COLORS.highway },
  ].filter((d) => d.value > 0);

  // Competitor penalty is informative — render as a counter-slice in red.
  const compPenalty = Math.round(bd.competitors * 18);
  if (compPenalty > 0) {
    data.push({ key: "competitors", label: `Competitor penalty (${bd.competitors})`, value: compPenalty, color: SLICE_COLORS.competitors, negative: true });
  }
  return data;
}

export default function AnalysisPieChart({ topStreet, title = "Score composition" }) {
  const data = buildPieData(topStreet);
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = 100, cy = 110, r = 86;
  let cumAngle = -90;

  const slices = data.map((d) => {
    const angle = (d.value / total) * 360;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    const path =
      angle >= 359.99
        ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...d, path, pct: (d.value / total) * 100 };
  });

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
        {title}
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <svg viewBox="0 0 200 220" className="w-44 h-auto shrink-0" aria-label="Pie chart of score composition">
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} stroke="#0b1220" strokeWidth="1.5" />
          ))}
          <circle cx={cx} cy={cy} r={32} fill="#0b1220" stroke="#1e293b" strokeWidth="1" />
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize="14" fontWeight="700" fill="#fbbf24">
            {Math.round(topStreet.score)}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94a3b8">
            score
          </text>
        </svg>
        <ul className="flex-1 space-y-1.5 text-[11.5px] w-full">
          {slices.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
              <span className="flex-1 text-slate-200">{s.label}</span>
              <span className="tabular-nums text-slate-400">
                {s.negative ? "−" : ""}{s.value} pt · {Math.round(s.pct)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">
        Slices show how the top street's score is composed: base 100 + bonuses for density,
        variety, transit, anchor POIs, residential catchment, and road class — minus a penalty
        for direct competitors.
      </div>
    </div>
  );
}
