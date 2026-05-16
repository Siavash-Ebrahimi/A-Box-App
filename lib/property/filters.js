// The listing-type filter palette on the Property + Agent Hub sidebars.
// Each filter takes the full property and decides if it matches — this is more
// expressive than just checking the activities array because shop/manufacture
// filters depend on both `type` and `listing`.
//
// Match order matters for `primaryFilterForProperty`: the FIRST filter that
// matches sets the pin colour, so put more specific filters before generic ones.

export const PROPERTY_FILTERS = [
  {
    value: "rent",
    label: "For Rent",
    icon: "📅",
    color: "#06b6d4",
    matches: (p) =>
      p.listing === "rent" &&
      !["retail", "warehouse", "office", "hotel"].includes(p.type),
  },
  {
    value: "sell",
    label: "For Sale",
    icon: "💰",
    color: "#f59e0b",
    matches: (p) =>
      p.listing === "sale" &&
      !["retail", "warehouse"].includes(p.type),
  },
  {
    value: "buy",
    label: "Buy",
    icon: "🏷️",
    color: "#10b981",
    matches: (p) =>
      p.listing === "sale" &&
      !["retail", "warehouse", "office", "hotel"].includes(p.type),
  },
  {
    value: "airbnb",
    label: "Airbnb",
    icon: "🏖️",
    color: "#ec4899",
    matches: (p) => (p.activities || []).includes("airbnb"),
  },
  {
    value: "hotel",
    label: "Hotel",
    icon: "🏨",
    color: "#a855f7",
    matches: (p) => p.type === "hotel",
  },
  {
    value: "short_stay",
    label: "Short Stay",
    icon: "⏱️",
    color: "#f43f5e",
    matches: (p) => (p.activities || []).includes("airbnb"),
  },
  // New filters (Shop / Manufacture, rent + sale)
  {
    value: "shop_rent",
    label: "Shop For Rent",
    icon: "🛍️",
    color: "#22d3ee",
    matches: (p) => p.type === "retail" && p.listing === "rent",
  },
  {
    value: "shop_sell",
    label: "Shop For Sale",
    icon: "🏪",
    color: "#fbbf24",
    matches: (p) => p.type === "retail" && p.listing === "sale",
  },
  {
    value: "mfg_rent",
    label: "Manufacture · Rent",
    icon: "🏭",
    color: "#fb7185",
    matches: (p) => p.type === "warehouse" && p.listing === "rent",
  },
  {
    value: "mfg_sell",
    label: "Manufacture · Sale",
    icon: "🔧",
    color: "#a78bfa",
    matches: (p) => p.type === "warehouse" && p.listing === "sale",
  },
];

export const PROPERTY_FILTER_BY_VALUE = Object.fromEntries(
  PROPERTY_FILTERS.map((f) => [f.value, f]),
);

// Returns the FIRST filter that matches a property — used to pick a marker colour.
export function primaryFilterForProperty(property) {
  for (const f of PROPERTY_FILTERS) {
    if (f.matches(property)) return f;
  }
  return null;
}

// A property matches the active filters if at least one selected filter accepts it.
// An empty selection is treated as "show all".
export function matchesSelectedFilters(property, selectedSet) {
  if (!selectedSet || selectedSet.size === 0) return true;
  for (const f of PROPERTY_FILTERS) {
    if (selectedSet.has(f.value) && f.matches(property)) return true;
  }
  return false;
}
