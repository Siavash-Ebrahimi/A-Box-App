// Geo Intelligence MVP — 2-minute pitch deck
// Run: node build_pitch_deck.js
// Output: Geo_Intelligence_MVP_Pitch.pptx

const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.title = "Geo Intelligence MVP";
pres.company = "Geo Intelligence";

// Midnight Executive palette + warm accent
const NAVY = "1E2761";
const NAVY_DEEP = "151B4A";
const ICE = "CADCFC";
const WHITE = "FFFFFF";
const ACCENT = "F9A826"; // warm gold accent
const MUTED = "8A91B5";
const GOLD = "FFD700";
const SILVER = "C0C0C0";
const BRONZE = "CD7F32";

const FONT_H = "Calibri";
const FONT_B = "Calibri";

// ============================================================
// SLIDE 1 — TITLE
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  // Big circular motif (top-right) — repeated visual motif across deck
  s.addShape("ellipse", { x: 10.2, y: -1.5, w: 5.5, h: 5.5, fill: { color: NAVY_DEEP }, line: { type: "none" } });
  s.addShape("ellipse", { x: 11.8, y: 0.4, w: 2.2, h: 2.2, fill: { color: ACCENT }, line: { type: "none" } });

  s.addText("GEO INTELLIGENCE", {
    x: 0.7, y: 2.4, w: 9.5, h: 0.5,
    fontFace: FONT_H, fontSize: 18, bold: true, color: ACCENT, charSpacing: 8,
  });
  s.addText("Where should you open your shop?", {
    x: 0.7, y: 3.0, w: 11, h: 1.6,
    fontFace: FONT_H, fontSize: 54, bold: true, color: WHITE,
  });
  s.addText("An AI-assisted location intelligence MVP", {
    x: 0.7, y: 4.7, w: 10, h: 0.5,
    fontFace: FONT_B, fontSize: 20, color: ICE, italic: true,
  });

  s.addText("2-minute briefing", {
    x: 0.7, y: 6.6, w: 4, h: 0.4,
    fontFace: FONT_B, fontSize: 12, color: MUTED, charSpacing: 4,
  });
}

// ============================================================
// SLIDE 2 — WHAT IT DOES
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  s.addText("WHAT IT DOES", {
    x: 0.7, y: 0.5, w: 6, h: 0.4,
    fontFace: FONT_H, fontSize: 13, bold: true, color: ACCENT, charSpacing: 6,
  });
  s.addText("Picks the best street for your business.", {
    x: 0.7, y: 0.95, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 36, bold: true, color: NAVY,
  });

  // 3 step icons
  const steps = [
    { n: "1", title: "User picks", body: "City + business type + radius (2–5 km)" },
    { n: "2", title: "We analyze", body: "Every street, competitor, anchor, transit stop" },
    { n: "3", title: "We rank", body: "Gold / Silver / Bronze streets on a live map" },
  ];
  const yTop = 2.8;
  const xStart = 0.7;
  const colW = 4.0;
  const gap = 0.2;

  steps.forEach((step, i) => {
    const x = xStart + i * (colW + gap);

    // Card
    s.addShape("roundRect", {
      x, y: yTop, w: colW, h: 3.4,
      fill: { color: "F8F9FF" },
      line: { color: ICE, width: 1 },
      rectRadius: 0.15,
    });

    // Numbered circle
    s.addShape("ellipse", {
      x: x + 0.35, y: yTop + 0.35, w: 0.9, h: 0.9,
      fill: { color: NAVY }, line: { type: "none" },
    });
    s.addText(step.n, {
      x: x + 0.35, y: yTop + 0.35, w: 0.9, h: 0.9,
      fontFace: FONT_H, fontSize: 28, bold: true, color: ACCENT,
      align: "center", valign: "middle",
    });

    s.addText(step.title, {
      x: x + 0.3, y: yTop + 1.5, w: colW - 0.6, h: 0.5,
      fontFace: FONT_H, fontSize: 22, bold: true, color: NAVY,
    });
    s.addText(step.body, {
      x: x + 0.3, y: yTop + 2.05, w: colW - 0.6, h: 1.2,
      fontFace: FONT_B, fontSize: 15, color: "374151",
    });
  });

  s.addText("Built from a single PRD. Live and running locally today.", {
    x: 0.7, y: 6.5, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 13, italic: true, color: MUTED,
  });
}

// ============================================================
// SLIDE 3 — TECH STACK (the main ask)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  s.addText("TECH STACK", {
    x: 0.7, y: 0.5, w: 6, h: 0.4,
    fontFace: FONT_H, fontSize: 13, bold: true, color: ACCENT, charSpacing: 6,
  });
  s.addText("Modern, free, production-ready.", {
    x: 0.7, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_H, fontSize: 32, bold: true, color: NAVY,
  });

  const rows = [
    { label: "Frontend", value: "Next.js 14 + React 18" },
    { label: "Styling", value: "Tailwind CSS" },
    { label: "Maps", value: "Leaflet + react-leaflet" },
    { label: "Backend", value: "Next.js API Routes (Node.js)" },
    { label: "Geo Data", value: "OpenStreetMap (Overpass + Nominatim)" },
    { label: "AI Layer", value: "OpenRouter → Ollama → template fallback" },
  ];

  const yTop = 2.3;
  const rowH = 0.7;
  const xLeft = 0.7;
  const labelW = 2.6;
  const valueW = 8.4;

  rows.forEach((r, i) => {
    const y = yTop + i * rowH;

    // Small accent circle (visual motif from slide 1)
    s.addShape("ellipse", {
      x: xLeft, y: y + 0.18, w: 0.35, h: 0.35,
      fill: { color: ACCENT }, line: { type: "none" },
    });

    s.addText(r.label.toUpperCase(), {
      x: xLeft + 0.55, y, w: labelW, h: rowH,
      fontFace: FONT_H, fontSize: 14, bold: true, color: MUTED,
      valign: "middle", charSpacing: 4,
    });
    s.addText(r.value, {
      x: xLeft + 0.55 + labelW, y, w: valueW, h: rowH,
      fontFace: FONT_H, fontSize: 20, bold: true, color: NAVY,
      valign: "middle",
    });
  });

  // Cost callout (right column)
  s.addShape("roundRect", {
    x: 9.7, y: 2.3, w: 3.0, h: 2.6,
    fill: { color: NAVY }, line: { type: "none" },
    rectRadius: 0.15,
  });
  s.addText("COST TODAY", {
    x: 9.85, y: 2.5, w: 2.7, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color: ICE, charSpacing: 4,
  });
  s.addText("$0", {
    x: 9.85, y: 2.9, w: 2.7, h: 1.4,
    fontFace: FONT_H, fontSize: 90, bold: true, color: ACCENT, align: "center",
  });
  s.addText("No API keys.\nNo billing.", {
    x: 9.85, y: 4.3, w: 2.7, h: 0.6,
    fontFace: FONT_B, fontSize: 13, color: ICE, align: "center",
  });
}

// ============================================================
// SLIDE 4 — HOW IT WORKS
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  s.addText("HOW IT WORKS", {
    x: 0.7, y: 0.5, w: 6, h: 0.4,
    fontFace: FONT_H, fontSize: 13, bold: true, color: ACCENT, charSpacing: 6,
  });
  s.addText("Data → Math → AI Narrative.", {
    x: 0.7, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_H, fontSize: 32, bold: true, color: NAVY,
  });

  // Three big stages
  const stages = [
    {
      title: "1.  OSM Data",
      sub: "Free, global",
      body: "Pull every business, transit stop, anchor POI (mall, school, hospital, mosque, park) & residential building inside the radius.",
      color: NAVY,
    },
    {
      title: "2.  Scoring",
      sub: "Pure math, no AI",
      body: "100 − (competitors×18) + variety + density + transit + anchors + residential + road class.",
      color: "2C5F89",
    },
    {
      title: "3.  LLM Narrative",
      sub: "OpenRouter (free models)",
      body: "AI only writes the story: per-street notes, executive report, recommendation reasoning, competitor insights, property portals.",
      color: ACCENT,
    },
  ];

  const yTop = 2.3;
  const xStart = 0.7;
  const colW = 4.0;
  const gap = 0.2;

  stages.forEach((st, i) => {
    const x = xStart + i * (colW + gap);

    // Header strip
    s.addShape("roundRect", {
      x, y: yTop, w: colW, h: 1.0,
      fill: { color: st.color }, line: { type: "none" },
      rectRadius: 0.12,
    });
    s.addText(st.title, {
      x: x + 0.3, y: yTop + 0.1, w: colW - 0.6, h: 0.5,
      fontFace: FONT_H, fontSize: 22, bold: true, color: WHITE,
    });
    s.addText(st.sub, {
      x: x + 0.3, y: yTop + 0.55, w: colW - 0.6, h: 0.35,
      fontFace: FONT_B, fontSize: 12, italic: true, color: i === 2 ? NAVY : ICE,
    });

    // Body card
    s.addShape("roundRect", {
      x, y: yTop + 1.05, w: colW, h: 3.2,
      fill: { color: "F8F9FF" }, line: { color: ICE, width: 1 },
      rectRadius: 0.12,
    });
    s.addText(st.body, {
      x: x + 0.3, y: yTop + 1.2, w: colW - 0.6, h: 2.9,
      fontFace: FONT_B, fontSize: 14, color: "1f2937",
    });
  });

  // Mental model
  s.addText("The code measures the street. The AI describes the measurement.", {
    x: 0.7, y: 6.4, w: 12, h: 0.6,
    fontFace: FONT_H, fontSize: 16, italic: true, bold: true, color: NAVY, align: "center",
  });
}

// ============================================================
// SLIDE 5 — GOLD / SILVER / BRONZE
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  s.addText("THE OUTPUT", {
    x: 0.7, y: 0.5, w: 6, h: 0.4,
    fontFace: FONT_H, fontSize: 13, bold: true, color: ACCENT, charSpacing: 6,
  });
  s.addText("Every street gets a tier.", {
    x: 0.7, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_H, fontSize: 32, bold: true, color: NAVY,
  });

  const tiers = [
    { name: "GOLD", color: GOLD, score: "≥ 160", line: "Prime location. Prioritise on the site visit.", textColor: NAVY },
    { name: "SILVER", color: SILVER, score: "110 – 159", line: "Viable backup. Tougher competition for attention.", textColor: NAVY },
    { name: "BRONZE", color: BRONZE, score: "< 110", line: "Too quiet, or already saturated. Deprioritise.", textColor: WHITE },
  ];

  const yTop = 2.4;
  const xStart = 0.7;
  const cardW = 4.0;
  const gap = 0.2;

  tiers.forEach((t, i) => {
    const x = xStart + i * (cardW + gap);

    s.addShape("roundRect", {
      x, y: yTop, w: cardW, h: 3.6,
      fill: { color: t.color }, line: { type: "none" },
      rectRadius: 0.18,
    });

    s.addText(t.name, {
      x: x + 0.3, y: yTop + 0.4, w: cardW - 0.6, h: 0.8,
      fontFace: FONT_H, fontSize: 36, bold: true, color: t.textColor, charSpacing: 4,
    });
    s.addText("score " + t.score, {
      x: x + 0.3, y: yTop + 1.3, w: cardW - 0.6, h: 0.5,
      fontFace: FONT_B, fontSize: 16, color: t.textColor, italic: true,
    });
    s.addText(t.line, {
      x: x + 0.3, y: yTop + 2.1, w: cardW - 0.6, h: 1.3,
      fontFace: FONT_B, fontSize: 15, color: t.textColor,
    });
  });

  s.addText("Inputs per street: competitors · variety · density · transit · anchors · residential · road class.", {
    x: 0.7, y: 6.4, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 13, italic: true, color: MUTED, align: "center",
  });
}

// ============================================================
// SLIDE 6 — NEXT STEP / RECOMMENDATION
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  // Visual motif again
  s.addShape("ellipse", { x: -1.5, y: 5.5, w: 4.5, h: 4.5, fill: { color: NAVY_DEEP }, line: { type: "none" } });
  s.addShape("ellipse", { x: 11.5, y: -1.5, w: 3.5, h: 3.5, fill: { color: ACCENT }, line: { type: "none" } });

  s.addText("NEXT STEP", {
    x: 0.7, y: 0.5, w: 6, h: 0.4,
    fontFace: FONT_H, fontSize: 13, bold: true, color: ACCENT, charSpacing: 6,
  });
  s.addText("From MVP to production.", {
    x: 0.7, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_H, fontSize: 36, bold: true, color: WHITE,
  });

  const upgrades = [
    { k: "AI", v: "GPT-5 or Claude Opus 4.7", why: "Sharper analyst writing" },
    { k: "Places", v: "Google Places + Foursquare", why: "Real ratings, hours, popularity" },
    { k: "Footfall", v: "SafeGraph / Placer.ai", why: "Hourly foot-traffic by demographic" },
    { k: "Listings", v: "Property Finder / Bayut API", why: "Live shop-for-rent inventory" },
  ];

  const yTop = 2.4;
  const rowH = 0.85;

  upgrades.forEach((u, i) => {
    const y = yTop + i * rowH;
    s.addShape("ellipse", {
      x: 0.7, y: y + 0.22, w: 0.4, h: 0.4,
      fill: { color: ACCENT }, line: { type: "none" },
    });
    s.addText(u.k.toUpperCase(), {
      x: 1.25, y, w: 1.7, h: rowH,
      fontFace: FONT_H, fontSize: 13, bold: true, color: ICE,
      valign: "middle", charSpacing: 4,
    });
    s.addText(u.v, {
      x: 2.95, y, w: 5.2, h: rowH,
      fontFace: FONT_H, fontSize: 20, bold: true, color: WHITE,
      valign: "middle",
    });
    s.addText(u.why, {
      x: 8.2, y, w: 4.6, h: rowH,
      fontFace: FONT_B, fontSize: 15, italic: true, color: ICE,
      valign: "middle",
    });
  });

  s.addText("MVP validates the idea at $0.  Paid data turns it into a decision-grade tool.", {
    x: 0.7, y: 6.4, w: 12, h: 0.6,
    fontFace: FONT_H, fontSize: 16, bold: true, italic: true, color: ACCENT, align: "center",
  });
}

// ============================================================
// SLIDE 7 — CLOSING
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  s.addShape("ellipse", { x: 10.5, y: 4.5, w: 4.0, h: 4.0, fill: { color: ICE }, line: { type: "none" } });
  s.addShape("ellipse", { x: -1.0, y: -1.0, w: 3.5, h: 3.5, fill: { color: NAVY }, line: { type: "none" } });
  s.addShape("ellipse", { x: 0.3, y: 0.3, w: 1.4, h: 1.4, fill: { color: ACCENT }, line: { type: "none" } });

  s.addText("Thank you.", {
    x: 0.7, y: 3.0, w: 12, h: 1.4,
    fontFace: FONT_H, fontSize: 72, bold: true, color: NAVY,
  });
  s.addText("Questions?", {
    x: 0.7, y: 4.3, w: 12, h: 0.8,
    fontFace: FONT_B, fontSize: 28, italic: true, color: MUTED,
  });
}

// ============================================================
// SAVE
// ============================================================
pres.writeFile({ fileName: "Geo_Intelligence_MVP_Pitch.pptx" }).then((fn) => {
  console.log("Wrote: " + fn);
});
