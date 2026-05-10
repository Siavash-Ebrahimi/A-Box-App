// Enriched opportunity score. Inputs per street:
//   competitorCount      direct competitors of the chosen category on this street
//   commercialItems      all commercial businesses grouped on this street
//   transitNearby        transit stops within ~300m of the street centroid
//   anchorsNearby        crowd-magnet POIs (mall/school/hospital/hotel/mosque/park) within ~250m
//   residentialNearby    residential buildings within ~250m (catchment proxy)
//   highwayClass         OSM highway tag of the street ("primary", "residential", etc.)

export function scoreStreet({
  competitorCount,
  commercialItems,
  transitNearby = 0,
  anchorsNearby = 0,
  residentialNearby = 0,
  highwayClass = null,
}) {
  const variety = uniqueCategories(commercialItems);
  const density = commercialItems.length;

  const transitBonus      = Math.min(transitNearby * 15, 45);
  const anchorBonus       = Math.min(anchorsNearby * 12, 48);
  const residentialBonus  = Math.min(residentialNearby * 0.5, 25);
  const highwayBonus      = highwayBonusFor(highwayClass);

  const score =
    100
    - competitorCount * 18
    + variety * 2
    + Math.min(density, 30) * 1.5  // diminishing returns past 30
    + transitBonus
    + anchorBonus
    + residentialBonus
    + highwayBonus;

  return {
    score,
    breakdown: {
      competitors: competitorCount,
      variety,
      density,
      transit: transitNearby,
      anchors: anchorsNearby,
      residential: residentialNearby,
      highway: highwayClass,
      bonuses: {
        transit: transitBonus,
        anchors: anchorBonus,
        residential: residentialBonus,
        highway: highwayBonus,
      },
    },
    tier: classify(score),
  };
}

function highwayBonusFor(cls) {
  if (!cls) return 0;
  const base = cls.replace(/_link$/, "");
  switch (base) {
    case "trunk":         return 25;
    case "primary":       return 22;
    case "secondary":     return 15;
    case "tertiary":      return 8;
    case "pedestrian":    return 18;
    case "living_street": return 10;
    case "footway":       return 6;
    case "unclassified":  return 0;
    case "residential":   return -6;
    case "service":       return -12;
    case "cycleway":      return -10;
    default:              return 0;
  }
}

export function classify(score) {
  if (score >= 160) return "gold";
  if (score >= 110) return "silver";
  return "bronze";
}

function uniqueCategories(items) {
  const set = new Set();
  for (const it of items) set.add(it.category);
  return set.size;
}

export const TIER_COLORS = {
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
};
