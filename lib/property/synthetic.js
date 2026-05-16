// Synthetic property generator — used by both the Property and Agent Hub views
// to GUARANTEE a few demo properties appear inside any picked radius (500 m /
// 1 km / 1.5 km), even when the real mock dataset is sparse for that exact spot.
//
// Properties are placed uniformly at random within the circle, with realistic
// Dubai-shaped data (type, listing, price, beds, baths, sqft). Each carries a
// `_synthetic: true` flag so the popup can disclose it's a demo entry.
//
// Generation is deterministic per (seed, salt) so the same area + radius + filter
// set always produces the same synthetic IDs — no shuffling on re-render.

const RENT_PRICE = {
  apartment: [60000, 200000],
  studio:    [40000, 90000],
  villa:     [180000, 500000],
  townhouse: [120000, 260000],
  office:    [120000, 400000],
  retail:    [70000, 220000],
  warehouse: [80000, 320000],
  hotel:     [180000, 600000],
};
const SALE_PRICE = {
  apartment: [800000, 4500000],
  studio:    [400000, 950000],
  villa:     [3500000, 15000000],
  townhouse: [2200000, 5500000],
  penthouse: [6000000, 25000000],
  office:    [1500000, 6000000],
  retail:    [900000, 3500000],
  warehouse: [1500000, 8000000],
};

const BUILDING_SUFFIX = ["Tower", "Residence", "Heights", "Lofts", "Park View", "Garden", "Plaza"];

// ---- deterministic random ----
function rand(seed, salt) {
  let h = 2166136261;
  const s = String(seed) + "|" + String(salt);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h / 0x100000000;
}
function pick(seed, salt, arr) {
  return arr[Math.floor(rand(seed, salt) * arr.length)];
}
function inRange(seed, salt, [min, max]) {
  return Math.round(min + rand(seed, salt) * (max - min));
}

// Map a filter value → (type, listing, activities). Used so a generated property
// is guaranteed to satisfy whichever filter the user has ticked.
function shapeForFilter(filterValue, seed, salt) {
  switch (filterValue) {
    case "shop_rent":
      return { type: "retail", listing: "rent", activities: ["rent"] };
    case "shop_sell":
      return { type: "retail", listing: "sale", activities: ["sell", "buy"] };
    case "mfg_rent":
      return { type: "warehouse", listing: "rent", activities: ["rent"] };
    case "mfg_sell":
      return { type: "warehouse", listing: "sale", activities: ["sell", "buy"] };
    case "hotel":
      return { type: "hotel", listing: "rent", activities: ["hotel"] };
    case "airbnb":
    case "short_stay": {
      const type = pick(seed, salt + ".t", ["studio", "apartment"]);
      return { type, listing: "rent", activities: ["rent", "airbnb"] };
    }
    case "rent": {
      const type = pick(seed, salt + ".t", ["apartment", "studio", "townhouse"]);
      return { type, listing: "rent", activities: ["rent"] };
    }
    case "sell":
    case "buy":
    default: {
      const type = pick(seed, salt + ".t", ["apartment", "villa", "townhouse", "studio"]);
      return { type, listing: "sale", activities: ["sell", "buy"] };
    }
  }
}

function generateOne({ center, radius, seed, salt, filterValue }) {
  // Uniform within circle: angle uniform, distance ∝ √u for uniform area.
  const angle = rand(seed, salt + ".a") * 2 * Math.PI;
  const dist = Math.sqrt(rand(seed, salt + ".d")) * radius * 0.85; // stay inside
  const earthR = 6378137;
  const dLat = ((dist * Math.cos(angle)) / earthR) * (180 / Math.PI);
  const dLng =
    ((dist * Math.sin(angle)) / earthR) *
    (180 / Math.PI) /
    Math.cos((center.lat * Math.PI) / 180);

  const { type, listing, activities } = shapeForFilter(filterValue, seed, salt);
  const priceRange = listing === "rent" ? RENT_PRICE[type] : SALE_PRICE[type];
  const price = inRange(seed, salt + ".p", priceRange || [800000, 3000000]);

  const isResidential = ["apartment", "studio", "villa", "townhouse", "penthouse"].includes(type);
  const beds = type === "studio" ? 0
    : !isResidential ? 0
    : type === "villa" ? inRange(seed, salt + ".b", [3, 5])
    : inRange(seed, salt + ".b", [1, 3]);
  const baths = beds === 0 ? 1 : Math.max(1, beds);
  const sqft = type === "studio" ? inRange(seed, salt + ".s", [380, 600])
    : type === "villa" ? inRange(seed, salt + ".s", [2800, 6000])
    : type === "warehouse" ? inRange(seed, salt + ".s", [2000, 8000])
    : type === "retail" ? inRange(seed, salt + ".s", [400, 1200])
    : type === "office" ? inRange(seed, salt + ".s", [800, 2500])
    : inRange(seed, salt + ".s", [750, 1800]);

  const labelType = type.charAt(0).toUpperCase() + type.slice(1);
  const bedLabel = type === "studio" ? "Studio" : beds ? `${beds}BR ` : "";
  const buildingName = `Demo ${pick(seed, salt + ".bld", BUILDING_SUFFIX)}`;

  return {
    id: `syn_${seed.replace(/[^A-Za-z0-9]/g, "").slice(0, 12)}_${salt}`,
    _synthetic: true,
    title: `${bedLabel}${labelType} — Demo`,
    type,
    listing,
    price,
    beds,
    baths,
    area_sqft: sqft,
    building: buildingName,
    area: "Demo Area",
    lat: center.lat + dLat,
    lng: center.lng + dLng,
    image: `https://picsum.photos/seed/syn_${salt}/600/360`,
    agent: "Eshel Properties",
    agentPhone: "+971 50 000 0000",
    features: ["Demo property", "Generated for this radius"],
    yearBuilt: 2022,
    status: "available",
    activities,
  };
}

// Top up the property list with synthetic dummies until we hit `target`.
// Cycles through `activeFilters` so each picked filter gets at least one
// synthetic when supplementation is needed.
export function fillWithSynthetics({
  properties,
  center,
  radius,
  target = 3,
  seed,
  activeFilters,
}) {
  if (!center || typeof center.lat !== "number" || typeof center.lng !== "number") return properties;
  if (!Array.isArray(properties)) properties = [];
  if (properties.length >= target) return properties;

  const need = target - properties.length;
  const filters = (activeFilters && activeFilters.length > 0) ? activeFilters : ["rent", "sell"];

  const synthetics = [];
  for (let i = 0; i < need; i++) {
    const filterValue = filters[i % filters.length];
    synthetics.push(
      generateOne({ center, radius, seed: String(seed), salt: `${i}_${filterValue}`, filterValue }),
    );
  }
  return [...properties, ...synthetics];
}
