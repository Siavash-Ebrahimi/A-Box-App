// Category-specific weights that drive how we pick the BEST point on a top street.
// Different businesses thrive next to different anchors, with different sensitivity to
// competitors and to residential vs. commercial mix. These weights encode that.
//
// anchorWeights:        multiplier per anchor type — higher = more relevant to this category
// transitWeight:        multiplier for transit-stops bonus
// residentialWeight:    multiplier for residential-density bonus
// competitionPenalty:   multiplier for the "too close to competitor" penalty (1 = neutral)
// minClearance:         meters — the recommendation will avoid being closer than this to a direct competitor
// notes:                short hint shown to the user about what drives success for this category

export const CATEGORY_WEIGHTS = {
  mens_salon: {
    anchorWeights: { mosque: 1.2, hotel: 0.6, school: 0.5, hospital: 0.3, mall: 0.5, park: 0.3, "place of worship": 1.0, "sports centre": 0.8, stadium: 0.4 },
    transitWeight: 0.7,
    residentialWeight: 0.9,
    competitionPenalty: 1.2,
    minClearance: 80,
    notes: "Mens grooming relies on mosque adjacency in MENA cities, repeat residential clientele, and male-frequented anchors (gyms, offices).",
  },
  barber_shop: {
    anchorWeights: { mosque: 1.0, school: 0.6, "place of worship": 0.9, hospital: 0.3, mall: 0.3, park: 0.4, "sports centre": 0.7 },
    transitWeight: 0.4,
    residentialWeight: 1.4,
    competitionPenalty: 1.0,
    minClearance: 100,
    notes: "Barbers depend on neighbourhood loyalty — heavy residential weighting matters more than transit footfall.",
  },
  bakery: {
    anchorWeights: { school: 1.2, mosque: 0.7, mall: 0.5, hospital: 0.4, hotel: 0.5, park: 0.4 },
    transitWeight: 1.0,
    residentialWeight: 1.1,
    competitionPenalty: 1.3,
    minClearance: 120,
    notes: "Bakeries thrive on morning commuter routes and school proximity; bakeries cannibalize each other quickly.",
  },
  coffee_shop: {
    anchorWeights: { mall: 1.0, hotel: 1.2, school: 0.9 /* universities */, hospital: 0.4, "sports centre": 0.5, park: 0.6 },
    transitWeight: 1.2,
    residentialWeight: 0.5,
    competitionPenalty: 0.85, // cluster effect is healthy for coffee
    minClearance: 80,
    notes: "Coffee shops want offices, transit, hotels, and universities; some cluster competition is actually positive.",
  },
  clothing_store: {
    anchorWeights: { mall: 1.6, hotel: 0.8, "sports centre": 0.4, school: 0.3 },
    transitWeight: 0.7,
    residentialWeight: 0.4,
    competitionPenalty: 0.5, // strong cluster benefit
    minClearance: 60,
    notes: "Clothing stores cluster on retail strips or inside malls — solo locations underperform.",
  },
  restaurant: {
    anchorWeights: { hotel: 1.3, mall: 0.9, park: 0.6, "sports centre": 0.5, stadium: 0.6, school: 0.3 },
    transitWeight: 0.9,
    residentialWeight: 0.7,
    competitionPenalty: 0.7, // food clusters help
    minClearance: 70,
    notes: "Restaurants benefit from being in dining districts and near hotels, parks, entertainment.",
  },
  grocery_store: {
    anchorWeights: { mosque: 0.9, school: 0.6, mall: 0.3, hospital: 0.4 },
    transitWeight: 0.5,
    residentialWeight: 1.6,
    competitionPenalty: 1.5,
    minClearance: 200, // people choose the closest grocery, so meaningful gap matters
    notes: "Grocery is residential-driven. People shop at the closest store — a meaningful gap from competitors is critical.",
  },
  pharmacy: {
    anchorWeights: { hospital: 1.6, school: 0.5, mosque: 0.4, mall: 0.6, hotel: 0.4 },
    transitWeight: 0.6,
    residentialWeight: 1.1,
    competitionPenalty: 1.3,
    minClearance: 150,
    notes: "Pharmacies live next to hospitals, clinics, and dense residential. Many cities also enforce regulatory minimum distances.",
  },
};

export function weightsFor(category) {
  return CATEGORY_WEIGHTS[category] || {
    anchorWeights: {},
    transitWeight: 1.0,
    residentialWeight: 1.0,
    competitionPenalty: 1.0,
    minClearance: 80,
    notes: "",
  };
}
