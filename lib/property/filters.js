// The six listing-type filters the spec calls for on the Property discovery sidebar.
// Each filter maps to one or more activities on a property (see lib/agent/mockProperties.js).
// "Short Stay" is functionally an alias of Airbnb in our mock dataset — both are
// kept so the UI matches the spec, but they hit the same underlying activity bucket.

export const PROPERTY_FILTERS = [
  {
    value: "rent",
    label: "For Rent",
    icon: "📅",
    color: "#06b6d4",   // cyan
    matches: (acts) => acts.includes("rent"),
  },
  {
    value: "sell",
    label: "For Sale",
    icon: "💰",
    color: "#f59e0b",   // amber
    matches: (acts) => acts.includes("sell"),
  },
  {
    value: "buy",
    label: "Buy",
    icon: "🏷️",
    color: "#10b981",   // emerald (buyer-side view of "sale" inventory)
    matches: (acts) => acts.includes("buy"),
  },
  {
    value: "airbnb",
    label: "Airbnb",
    icon: "🏖️",
    color: "#ec4899",   // rose
    matches: (acts) => acts.includes("airbnb"),
  },
  {
    value: "hotel",
    label: "Hotel",
    icon: "🏨",
    color: "#a855f7",   // purple
    matches: (acts) => acts.includes("hotel"),
  },
  {
    value: "short_stay",
    label: "Short Stay",
    icon: "⏱️",
    color: "#f43f5e",   // rose-strong — distinct from Airbnb pin for readability
    matches: (acts) => acts.includes("airbnb"), // alias of Airbnb in our dataset
  },
];

export const PROPERTY_FILTER_BY_VALUE = Object.fromEntries(
  PROPERTY_FILTERS.map((f) => [f.value, f]),
);

// Returns the FIRST filter that matches the property — used to pick a marker colour.
// Order matches PROPERTY_FILTERS so "For Sale" beats "Buy" beats "Airbnb" etc.
export function primaryFilterForProperty(property) {
  const acts = property.activities || [];
  for (const f of PROPERTY_FILTERS) {
    if (f.matches(acts)) return f;
  }
  return null;
}

// A property matches the active filters if at least one selected filter accepts it.
// An empty selection is treated as "show all".
export function matchesSelectedFilters(property, selectedSet) {
  if (!selectedSet || selectedSet.size === 0) return true;
  const acts = property.activities || [];
  for (const f of PROPERTY_FILTERS) {
    if (selectedSet.has(f.value) && f.matches(acts)) return true;
  }
  return false;
}
