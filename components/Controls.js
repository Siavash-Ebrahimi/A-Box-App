"use client";

const CATEGORIES = [
  { value: "mens_salon", label: "Men's Salon" },
  { value: "barber_shop", label: "Barber Shop" },
  { value: "bakery", label: "Bakery" },
  { value: "coffee_shop", label: "Coffee Shop" },
  { value: "clothing_store", label: "Clothing Store" },
  { value: "restaurant", label: "Restaurant" },
  { value: "grocery_store", label: "Grocery Store" },
  { value: "pharmacy", label: "Pharmacy" },
];

const RADII = [
  { value: 500, label: "500 m" },
  { value: 1000, label: "1 km" },
  { value: 1500, label: "1.5 km" },
];

export default function Controls({
  location,
  category,
  radius,
  loading,
  onCategoryChange,
  onRadiusChange,
  onAnalyze,
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-wider">Detected Location</div>
        <div className="text-sm">
          {location ? (
            <>
              <span className="font-medium">{location.city || "Unknown"}</span>
              {location.country ? <span className="text-slate-400">, {location.country}</span> : null}
              <div className="text-xs text-slate-500 mt-0.5">
                {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
                {location.source ? <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{location.source}</span> : null}
              </div>
            </>
          ) : (
            <span className="text-slate-500">Detecting…</span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Business Category</label>
        <select
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Search Radius</label>
        <div className="grid grid-cols-3 gap-2">
          {RADII.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onRadiusChange(r.value)}
              className={`text-xs py-2 rounded border transition ${
                radius === r.value
                  ? "border-amber-500 bg-amber-500/10 text-amber-300"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={loading || !location}
        onClick={onAnalyze}
        className="w-full py-2.5 rounded font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "Analyzing…" : "Analyze Streets"}
      </button>
    </div>
  );
}
