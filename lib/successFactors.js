// Curated success factors per business category. Used as the deterministic baseline
// shown to every user, and as context for an optional LLM city-specific override.

import { CATEGORY_LABELS } from "./overpass.js";

const CURATED = {
  mens_salon: [
    "Heavy male foot traffic — near offices, gyms, mosques, or universities.",
    "1–2 competitors within 500 m signals demand without saturation; 5+ means the street is already saturated.",
    "Visible signage on a primary or pedestrian street; corner units perform better than mid-block.",
    "Walk-in convenience over destination — most haircuts are unplanned trips.",
    "Adjacent anchors that bring repeat male visits (gyms, barbershops, men's clothing).",
  ],
  barber_shop: [
    "Located on residential or mixed-use streets — barbershops live on neighbourhood loyalty.",
    "Catchment of 3,000+ residents within 500 m for a viable client base.",
    "Low rent matters more than premium frontage — margins are tight.",
    "Visibility to passers-by; 80 % of first visits come from people walking past.",
    "Avoid streets already carrying 3+ established barbers.",
  ],
  bakery: [
    "Morning foot traffic — near transit stops, schools, and residential blocks.",
    "Strong residential catchment within 300–500 m (recurring daily customers).",
    "Visibility from a busy footpath, with room for window display.",
    "Anchors that drive habitual visits: cafes, schools, mosques, supermarkets.",
    "Limited direct competition — bakeries cannibalise each other faster than most categories.",
  ],
  coffee_shop: [
    "High pedestrian footfall — offices, transit stops, universities, or co-working hubs nearby.",
    "Visibility from a primary or pedestrian street with seating space outside.",
    "Cluster effect: 1–2 cafes nearby is healthy; 4+ means the demand is being chased by everyone.",
    "Anchors that pull professionals: corporate towers, gyms, hotels, bookshops.",
    "Adequate residential catchment for evening / weekend traffic.",
  ],
  clothing_store: [
    "Either on a major retail strip (cluster with other clothing stores) or inside a mall — solo locations underperform.",
    "Frontage on a primary / secondary highway, ideally with parking nearby.",
    "Anchor magnets: malls, hotels, large supermarkets that bring shoppers in browsing mode.",
    "Diverse mix of nearby shops to encourage long browsing visits.",
    "Avoid pure residential streets — clothing is a destination purchase.",
  ],
  restaurant: [
    "High evening footfall — entertainment districts, hotels, parks, waterfronts.",
    "Diverse adjacent food options (3–5 restaurants nearby is ideal — it makes the street a 'food destination').",
    "Visibility on a primary, secondary, or pedestrian street; outdoor seating doubles capacity.",
    "Anchors that drive repeat dining: offices (lunch), hotels (tourists), cinemas, residential towers.",
    "Avoid streets already saturated with the same cuisine.",
  ],
  grocery_store: [
    "Strong residential catchment within 400 m — daily shopping behaviour.",
    "Convenient parking and easy access from a primary or secondary road.",
    "Limited direct supermarket competition within 500 m (people choose the closest).",
    "Adjacent footfall drivers: schools, mosques, transit stops.",
    "Visibility to traffic — most decisions are made en-route home.",
  ],
  pharmacy: [
    "Ground-floor visibility on a primary or secondary street with strong daytime footfall.",
    "Anchors that drive demand: hospitals, clinics, schools, residential towers.",
    "Sufficient gap from existing pharmacies (regulatory minimums apply in many cities).",
    "Adequate residential catchment for prescription refills and convenience needs.",
    "Convenient parking — many pharmacy visits are quick stops.",
  ],
};

export function curatedFactorsFor(category) {
  return CURATED[category] || [
    "Strong pedestrian footfall on the street.",
    "Reasonable distance from direct competitors.",
    "Anchors nearby that bring relevant customer traffic.",
    "Good visibility from the road and pedestrian flow.",
    "Healthy residential catchment within walking distance.",
  ];
}

export function buildCityFactorsPrompt(category, cityHint) {
  const label = CATEGORY_LABELS[category] || category;
  const where = cityHint || "the user's city";
  return `You are a local business consultant. List the TOP 3 success factors for opening a ${label} in ${where}.

Rules:
- Each factor MUST be one short bullet, max 16 words.
- Be specific to ${where} — climate, peak hours, customer behavior, regulations, cultural patterns.
- No preamble, no closing line, no numbering.

Output exactly 3 lines, each starting with "• ":
• <factor 1>
• <factor 2>
• <factor 3>`;
}
