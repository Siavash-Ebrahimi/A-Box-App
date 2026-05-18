// A-Box — Professional product introduction deck
// Run: node build_intro_deck.js
// Output: A-Box_Introduction.pptx

const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.title = "A-Box — AI agent for smarter location decisions";
pres.company = "A-Box";

// ===== Palette =====
const NAVY      = "0B1220";   // main dark background
const NAVY_DEEP = "070D1B";   // deeper accent shape
const PANEL     = "111A2E";   // light card on dark
const ICE       = "CADCFC";   // soft light text
const WHITE     = "FFFFFF";
const MUTED     = "8A91B5";
const AMBER     = "F59E0B";   // Business section accent (matches UI)
const EMERALD   = "10B981";   // Property section accent
const CYAN      = "06B6D4";   // Agent Hub section accent
const GOLD      = "FFD700";
const SILVER    = "C0C0C0";
const BRONZE    = "CD7F32";

const FONT_H = "Calibri";
const FONT_B = "Calibri";

// ===== Reusable helpers =====
function chip(s, x, y, color = AMBER) {
  s.addText("●", {
    x, y: y + 0.05, w: 0.25, h: 0.3,
    fontFace: FONT_H, fontSize: 12, color, valign: "middle",
  });
}

function sectionLabel(s, label, color = AMBER) {
  s.addText(label, {
    x: 0.7, y: 0.45, w: 8, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color, charSpacing: 8,
  });
}

function slideTitle(s, title, color = WHITE) {
  s.addText(title, {
    x: 0.7, y: 0.85, w: 12, h: 0.95,
    fontFace: FONT_H, fontSize: 34, bold: true, color,
  });
}

// ============================================================
// SLIDE 1 — TITLE
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  // Decorative rings (mimic the AI orb on the real home screen)
  s.addShape("ellipse", { x: 9.2, y: -0.8, w: 6.0, h: 6.0, fill: { color: NAVY_DEEP }, line: { type: "none" } });
  s.addShape("ellipse", { x: 10.0, y: 0.0,  w: 4.4, h: 4.4, fill: { color: "0F1A30" }, line: { type: "none" } });
  s.addShape("ellipse", { x: 11.2, y: 1.2,  w: 2.0, h: 2.0, fill: { color: AMBER }, line: { type: "none" } });
  s.addShape("ellipse", { x: 11.55, y: 1.55, w: 1.3, h: 1.3, fill: { color: CYAN }, line: { type: "none" } });

  // Brand
  s.addText("A", {
    x: 0.7, y: 1.8, w: 1.0, h: 1.6,
    fontFace: FONT_H, fontSize: 90, bold: true, color: AMBER,
  });
  s.addText("-Box", {
    x: 1.6, y: 1.8, w: 5, h: 1.6,
    fontFace: FONT_H, fontSize: 90, bold: true, color: WHITE,
  });

  s.addText("AI agent for smarter location decisions.", {
    x: 0.7, y: 3.8, w: 11, h: 0.6,
    fontFace: FONT_H, fontSize: 26, color: ICE,
  });
  s.addText("Property  ·  Business  ·  Agent Hub", {
    x: 0.7, y: 4.4, w: 11, h: 0.5,
    fontFace: FONT_B, fontSize: 18, italic: true, color: AMBER, charSpacing: 4,
  });

  s.addText("Product Introduction", {
    x: 0.7, y: 6.7, w: 6, h: 0.4,
    fontFace: FONT_B, fontSize: 12, color: MUTED, charSpacing: 6,
  });
}

// ============================================================
// SLIDE 2 — THE PROBLEM / THE PROMISE
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  sectionLabel(s, "THE PROBLEM");
  slideTitle(s, "Real-estate and retail decisions still rely on guesswork.", "111827");

  // Three pain rows
  const pains = [
    { num: "01", h: "Property buyers", b: "Browse dozens of listings without a way to compare areas side-by-side." },
    { num: "02", h: "Business owners", b: "Pick streets by gut feel — no view of competitors, footfall, or anchors." },
    { num: "03", h: "Real-estate agents", b: "Juggle deals across multiple zones in spreadsheets and notebooks." },
  ];
  const yTop = 2.4;
  pains.forEach((p, i) => {
    const y = yTop + i * 1.15;
    s.addText(p.num, {
      x: 0.7, y, w: 1.1, h: 0.9,
      fontFace: FONT_H, fontSize: 48, bold: true, color: AMBER, valign: "middle",
    });
    s.addText(p.h, {
      x: 1.9, y, w: 4.0, h: 0.5,
      fontFace: FONT_H, fontSize: 20, bold: true, color: "111827", valign: "top",
    });
    s.addText(p.b, {
      x: 1.9, y: y + 0.45, w: 10.5, h: 0.6,
      fontFace: FONT_B, fontSize: 14, color: "374151", valign: "top",
    });
  });

  // Promise strip
  s.addShape("rect", { x: 0.7, y: 6.3, w: 11.95, h: 0.7, fill: { color: "F3F4F6" }, line: { type: "none" } });
  s.addText("A-Box gives all three the same toolkit: real data + AI + a single map.", {
    x: 0.9, y: 6.3, w: 11.7, h: 0.7,
    fontFace: FONT_H, fontSize: 16, bold: true, italic: true, color: "111827", valign: "middle",
  });
}

// ============================================================
// SLIDE 3 — THREE SECTIONS OVERVIEW
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  sectionLabel(s, "THE PRODUCT");
  slideTitle(s, "One app. Three audiences.", "111827");

  const cards = [
    { title: "Property", subtitle: "For buyers & renters", body: "Discover, filter, and compare two areas side-by-side. AI-written property comparison.", accent: EMERALD },
    { title: "Business", subtitle: "For entrepreneurs", body: "Find the best street to open. Gold / Silver / Bronze ranking on a live map.", accent: AMBER },
    { title: "Agent Hub", subtitle: "For real-estate agents", body: "Zones, favourites, personas, and an i-Case automation studio with an AI orchestrator.", accent: CYAN },
  ];

  const yTop = 2.4;
  const xStart = 0.7;
  const colW = 4.0;
  const gap = 0.2;

  cards.forEach((c, i) => {
    const x = xStart + i * (colW + gap);

    // Top accent bar
    s.addShape("rect", { x, y: yTop, w: colW, h: 0.18, fill: { color: c.accent }, line: { type: "none" } });

    // Card
    s.addShape("roundRect", {
      x, y: yTop + 0.18, w: colW, h: 4.0,
      fill: { color: "F8FAFC" }, line: { color: "E5E7EB", width: 1 },
      rectRadius: 0.1,
    });

    // Icon circle
    s.addShape("ellipse", {
      x: x + 0.3, y: yTop + 0.55, w: 0.7, h: 0.7,
      fill: { color: c.accent }, line: { type: "none" },
    });
    s.addText((i + 1).toString(), {
      x: x + 0.3, y: yTop + 0.55, w: 0.7, h: 0.7,
      fontFace: FONT_H, fontSize: 22, bold: true, color: WHITE, align: "center", valign: "middle",
    });

    s.addText(c.title, {
      x: x + 0.3, y: yTop + 1.4, w: colW - 0.6, h: 0.55,
      fontFace: FONT_H, fontSize: 26, bold: true, color: "111827",
    });
    s.addText(c.subtitle, {
      x: x + 0.3, y: yTop + 2.0, w: colW - 0.6, h: 0.4,
      fontFace: FONT_B, fontSize: 13, italic: true, color: c.accent,
    });
    s.addText(c.body, {
      x: x + 0.3, y: yTop + 2.55, w: colW - 0.6, h: 1.6,
      fontFace: FONT_B, fontSize: 14, color: "374151",
    });
  });

  s.addText("Each section is independent, but shares the same map, location picker, AI chain, and design system.", {
    x: 0.7, y: 6.8, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 13, italic: true, color: MUTED, align: "center",
  });
}

// ============================================================
// SLIDE 4 — PROPERTY SECTION
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  // Side rail to identify section
  s.addShape("rect", { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: EMERALD }, line: { type: "none" } });

  sectionLabel(s, "SECTION 1  ·  PROPERTY", EMERALD);
  slideTitle(s, "Discover properties. Compare two areas. Decide.", "111827");

  // Left: 3-phase flow
  const phases = [
    { n: "Picker",  text: "Drop a pin or use IP to choose the search location." },
    { n: "Explore", text: "Filter by Rent / Sell / Airbnb. Browse property pins inside the radius." },
    { n: "Compare", text: "Add a 2nd circle, pick one property from each, get an AI-written comparison report." },
  ];
  const yTop = 2.4;
  phases.forEach((p, i) => {
    const y = yTop + i * 1.05;
    s.addShape("ellipse", {
      x: 0.7, y: y + 0.15, w: 0.6, h: 0.6,
      fill: { color: EMERALD }, line: { type: "none" },
    });
    s.addText((i + 1).toString(), {
      x: 0.7, y: y + 0.15, w: 0.6, h: 0.6,
      fontFace: FONT_H, fontSize: 18, bold: true, color: WHITE, align: "center", valign: "middle",
    });
    s.addText(p.n, {
      x: 1.45, y, w: 2.2, h: 0.45,
      fontFace: FONT_H, fontSize: 18, bold: true, color: "111827",
    });
    s.addText(p.text, {
      x: 1.45, y: y + 0.45, w: 6.2, h: 0.6,
      fontFace: FONT_B, fontSize: 13, color: "374151",
    });
  });

  // Right: key features card
  s.addShape("roundRect", {
    x: 8.4, y: 2.4, w: 4.3, h: 3.5,
    fill: { color: "ECFDF5" }, line: { color: EMERALD, width: 1 },
    rectRadius: 0.12,
  });
  s.addText("KEY FEATURES", {
    x: 8.6, y: 2.55, w: 4, h: 0.3,
    fontFace: FONT_H, fontSize: 11, bold: true, color: EMERALD, charSpacing: 4,
  });
  const feats = [
    "Two-area map comparison",
    "Filter by listing type",
    "Add your own property pin",
    "Synthetic top-up for sparse data",
    "AI side-by-side compare report",
  ];
  feats.forEach((f, i) => {
    const y = 3.0 + i * 0.5;
    s.addText("✓", {
      x: 8.6, y, w: 0.3, h: 0.35,
      fontFace: FONT_H, fontSize: 14, bold: true, color: EMERALD, valign: "middle",
    });
    s.addText(f, {
      x: 8.9, y, w: 3.8, h: 0.35,
      fontFace: FONT_B, fontSize: 13, color: "111827", valign: "middle",
    });
  });

  // Bottom strip
  s.addText("Powered by:  /api/property-compare  ·  OpenRouter LLM chain  ·  localStorage persistence", {
    x: 0.7, y: 6.5, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 12, italic: true, color: MUTED,
  });
}

// ============================================================
// SLIDE 5 — BUSINESS SECTION
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  s.addShape("rect", { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: AMBER }, line: { type: "none" } });

  sectionLabel(s, "SECTION 2  ·  BUSINESS", AMBER);
  slideTitle(s, "Find the best street to open your business.", "111827");

  // Subtitle line
  s.addText("Gold / Silver / Bronze ranking from real OpenStreetMap data.", {
    x: 0.7, y: 1.7, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 16, italic: true, color: MUTED,
  });

  // Tier cards (mimics the actual UI)
  const tiers = [
    { name: "GOLD",   score: "≥ 160", line: "Prime location. Prioritise.",     color: GOLD,   text: "111827" },
    { name: "SILVER", score: "110-159", line: "Viable backup.",                 color: SILVER, text: "111827" },
    { name: "BRONZE", score: "< 110",  line: "Too quiet or saturated.",         color: BRONZE, text: WHITE },
  ];
  const yTop = 2.5;
  const xStart = 0.7;
  const cardW = 3.4;
  const gap = 0.2;

  tiers.forEach((t, i) => {
    const x = xStart + i * (cardW + gap);
    s.addShape("roundRect", {
      x, y: yTop, w: cardW, h: 2.4,
      fill: { color: t.color }, line: { type: "none" },
      rectRadius: 0.15,
    });
    s.addText(t.name, {
      x: x + 0.25, y: yTop + 0.25, w: cardW - 0.5, h: 0.6,
      fontFace: FONT_H, fontSize: 28, bold: true, color: t.text, charSpacing: 4,
    });
    s.addText("score " + t.score, {
      x: x + 0.25, y: yTop + 0.9, w: cardW - 0.5, h: 0.4,
      fontFace: FONT_B, fontSize: 14, italic: true, color: t.text,
    });
    s.addText(t.line, {
      x: x + 0.25, y: yTop + 1.4, w: cardW - 0.5, h: 0.8,
      fontFace: FONT_B, fontSize: 13, color: t.text,
    });
  });

  // Right column: inputs that decide the score
  const xR = 11.3;
  s.addShape("roundRect", {
    x: xR, y: yTop, w: 1.4, h: 2.4,
    fill: { color: NAVY }, line: { type: "none" }, rectRadius: 0.15,
  });
  s.addText("8", {
    x: xR, y: yTop + 0.15, w: 1.4, h: 0.9,
    fontFace: FONT_H, fontSize: 60, bold: true, color: AMBER, align: "center",
  });
  s.addText("business\ncategories", {
    x: xR, y: yTop + 1.1, w: 1.4, h: 0.9,
    fontFace: FONT_B, fontSize: 11, color: ICE, align: "center",
  });

  // Bottom row — key features
  const feats = [
    { h: "8 categories",       v: "Salon, Bakery, Café, Clothing, Restaurant, Grocery, Pharmacy, Barber." },
    { h: "Live OSM data",      v: "Competitors, transit, anchors, residential, road class." },
    { h: "3-phase analysis",   v: "Map appears first, AI commentary fills in afterwards." },
    { h: "Top-3 recommended pins", v: "Category-weighted spots. Map shows why each was chosen." },
  ];
  const yF = 5.4;
  const colWF = (12 / 4) - 0.1;
  feats.forEach((f, i) => {
    const x = 0.7 + i * (colWF + 0.05);
    s.addShape("rect", { x, y: yF, w: 0.06, h: 1.0, fill: { color: AMBER }, line: { type: "none" } });
    s.addText(f.h, {
      x: x + 0.18, y: yF, w: colWF - 0.2, h: 0.4,
      fontFace: FONT_H, fontSize: 13, bold: true, color: "111827",
    });
    s.addText(f.v, {
      x: x + 0.18, y: yF + 0.4, w: colWF - 0.2, h: 0.7,
      fontFace: FONT_B, fontSize: 11, color: "374151",
    });
  });
}

// ============================================================
// SLIDE 6 — AGENT HUB SECTION
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  s.addShape("rect", { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: CYAN }, line: { type: "none" } });

  sectionLabel(s, "SECTION 3  ·  AGENT HUB", CYAN);
  slideTitle(s, "A workspace for real-estate agents.", "111827");

  // Five view tiles
  const views = [
    { h: "Dashboard",       b: "Overview of zones, i-Cases and quick chat starters." },
    { h: "Areas (Zones)",   b: "Named map circles the agent watches. Reverse-geocoded labels." },
    { h: "Properties",      b: "Filter by zone, favourite, send to AI chat." },
    { h: "Common Projects", b: "Cross-zone overlap — properties shared by multiple zones." },
    { h: "Chat",            b: "Multi-persona AI conversations (Buyer / Seller / Investor)." },
  ];

  const yTop = 2.3;
  const xStart = 0.7;
  const colW = 2.4;
  const gap = 0.1;

  views.forEach((v, i) => {
    const x = xStart + i * (colW + gap);
    s.addShape("roundRect", {
      x, y: yTop, w: colW, h: 2.4,
      fill: { color: "ECFEFF" }, line: { color: CYAN, width: 1 },
      rectRadius: 0.1,
    });
    s.addShape("ellipse", {
      x: x + 0.2, y: yTop + 0.25, w: 0.5, h: 0.5,
      fill: { color: CYAN }, line: { type: "none" },
    });
    s.addText((i + 1).toString(), {
      x: x + 0.2, y: yTop + 0.25, w: 0.5, h: 0.5,
      fontFace: FONT_H, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle",
    });
    s.addText(v.h, {
      x: x + 0.2, y: yTop + 0.85, w: colW - 0.4, h: 0.5,
      fontFace: FONT_H, fontSize: 15, bold: true, color: "111827",
    });
    s.addText(v.b, {
      x: x + 0.2, y: yTop + 1.35, w: colW - 0.4, h: 0.9,
      fontFace: FONT_B, fontSize: 11, color: "374151",
    });
  });

  // Flagship feature callout — i-Case
  s.addShape("roundRect", {
    x: 0.7, y: 5.1, w: 12.0, h: 1.9,
    fill: { color: NAVY }, line: { type: "none" }, rectRadius: 0.12,
  });
  s.addText("FLAGSHIP", {
    x: 1.0, y: 5.25, w: 2, h: 0.3,
    fontFace: FONT_H, fontSize: 11, bold: true, color: CYAN, charSpacing: 6,
  });
  s.addText("i-Case Workspace — visual automation studio with an AI orchestrator.", {
    x: 1.0, y: 5.55, w: 11.5, h: 0.5,
    fontFace: FONT_H, fontSize: 20, bold: true, color: WHITE,
  });
  s.addText("Agent describes a workflow in plain English → LLM returns a chat reply AND a structured list of actions that mutate the workspace (add zone, drop node, connect, run compare).", {
    x: 1.0, y: 6.1, w: 11.5, h: 0.85,
    fontFace: FONT_B, fontSize: 13, italic: true, color: ICE,
  });
}

// ============================================================
// SLIDE 7 — TECH STACK
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  sectionLabel(s, "TECHNOLOGY");
  slideTitle(s, "Modern, production-ready, zero-cost stack.", "111827");

  const rows = [
    { label: "Frontend",        value: "Next.js 14 (App Router) + React 18" },
    { label: "Styling",         value: "Tailwind CSS" },
    { label: "Maps",            value: "Leaflet + react-leaflet" },
    { label: "Backend",         value: "Next.js API Routes (Node.js)" },
    { label: "Geographic Data", value: "OpenStreetMap (Overpass + Nominatim)" },
    { label: "AI Layer",        value: "OpenRouter → Ollama → template fallback" },
    { label: "Persistence",     value: "Browser localStorage (no backend / no signup)" },
  ];

  const yTop = 2.3;
  const rowH = 0.55;
  const xLeft = 0.7;
  const labelW = 2.8;
  const valueW = 6.5;

  rows.forEach((r, i) => {
    const y = yTop + i * rowH;
    s.addShape("ellipse", { x: xLeft, y: y + 0.13, w: 0.3, h: 0.3, fill: { color: AMBER }, line: { type: "none" } });
    s.addText(r.label.toUpperCase(), {
      x: xLeft + 0.45, y, w: labelW, h: rowH,
      fontFace: FONT_H, fontSize: 12, bold: true, color: MUTED, valign: "middle", charSpacing: 4,
    });
    s.addText(r.value, {
      x: xLeft + 0.45 + labelW, y, w: valueW, h: rowH,
      fontFace: FONT_H, fontSize: 17, bold: true, color: "111827", valign: "middle",
    });
  });

  // Cost panel
  s.addShape("roundRect", {
    x: 10.4, y: 2.3, w: 2.3, h: 2.5,
    fill: { color: NAVY }, line: { type: "none" }, rectRadius: 0.15,
  });
  s.addText("RUNNING COST", {
    x: 10.4, y: 2.5, w: 2.3, h: 0.4,
    fontFace: FONT_H, fontSize: 11, bold: true, color: ICE, align: "center", charSpacing: 4,
  });
  s.addText("$0", {
    x: 10.4, y: 2.85, w: 2.3, h: 1.3,
    fontFace: FONT_H, fontSize: 80, bold: true, color: AMBER, align: "center",
  });
  s.addText("No API keys.\nNo billing.", {
    x: 10.4, y: 4.15, w: 2.3, h: 0.6,
    fontFace: FONT_B, fontSize: 11, color: ICE, align: "center",
  });

  // API endpoints summary
  s.addShape("roundRect", {
    x: 10.4, y: 5.0, w: 2.3, h: 1.5,
    fill: { color: "F3F4F6" }, line: { type: "none" }, rectRadius: 0.15,
  });
  s.addText("9", {
    x: 10.4, y: 5.0, w: 2.3, h: 0.8,
    fontFace: FONT_H, fontSize: 50, bold: true, color: NAVY, align: "center",
  });
  s.addText("API endpoints powering\nthe 3 sections", {
    x: 10.4, y: 5.8, w: 2.3, h: 0.6,
    fontFace: FONT_B, fontSize: 11, color: "374151", align: "center",
  });

  // Bottom note
  s.addText("Everything runs on free, public services. Paid APIs are the next investment step.", {
    x: 0.7, y: 6.7, w: 9.6, h: 0.4,
    fontFace: FONT_B, fontSize: 13, italic: true, color: MUTED,
  });
}

// ============================================================
// SLIDE 8 — ARCHITECTURE (HOW IT WORKS)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: NAVY };

  sectionLabel(s, "ARCHITECTURE", AMBER);
  slideTitle(s, "Data → Math → AI Narrative.", WHITE);

  // 3 stages
  const stages = [
    { title: "1.  OSM Data",       sub: "Free, global",            body: "Pull every business, transit stop, anchor (mall, school, hospital, mosque, park) and residential building inside the radius.", color: EMERALD },
    { title: "2.  Scoring Math",   sub: "Pure JS, no AI",          body: "100 - (competitors x 18) + variety + density + transit + anchors + residential + road class.", color: AMBER },
    { title: "3.  LLM Narrative",  sub: "OpenRouter chain",        body: "AI writes the story: per-street notes, executive report, recommendation reasoning, property portals.", color: CYAN },
  ];

  const yTop = 2.4;
  const xStart = 0.7;
  const colW = 4.0;
  const gap = 0.2;

  stages.forEach((st, i) => {
    const x = xStart + i * (colW + gap);

    s.addShape("roundRect", {
      x, y: yTop, w: colW, h: 1.0,
      fill: { color: st.color }, line: { type: "none" }, rectRadius: 0.12,
    });
    s.addText(st.title, {
      x: x + 0.3, y: yTop + 0.1, w: colW - 0.6, h: 0.5,
      fontFace: FONT_H, fontSize: 20, bold: true, color: i === 1 ? "111827" : WHITE,
    });
    s.addText(st.sub, {
      x: x + 0.3, y: yTop + 0.55, w: colW - 0.6, h: 0.35,
      fontFace: FONT_B, fontSize: 12, italic: true, color: i === 1 ? "111827" : WHITE,
    });

    s.addShape("roundRect", {
      x, y: yTop + 1.05, w: colW, h: 2.8,
      fill: { color: PANEL }, line: { color: "1f2937", width: 1 }, rectRadius: 0.12,
    });
    s.addText(st.body, {
      x: x + 0.3, y: yTop + 1.2, w: colW - 0.6, h: 2.5,
      fontFace: FONT_B, fontSize: 14, color: ICE,
    });
  });

  // Bottom — the mental model
  s.addShape("roundRect", {
    x: 0.7, y: 6.0, w: 12.0, h: 1.0,
    fill: { color: AMBER }, line: { type: "none" }, rectRadius: 0.12,
  });
  s.addText("The code measures the street. The AI describes the measurement.", {
    x: 0.7, y: 6.0, w: 12.0, h: 1.0,
    fontFace: FONT_H, fontSize: 18, bold: true, italic: true, color: NAVY, align: "center", valign: "middle",
  });
}

// ============================================================
// SLIDE 9 — CLOSING
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  // Decorative shapes — same orb motif as title
  s.addShape("ellipse", { x: 9.5, y: 4.0, w: 5.5, h: 5.5, fill: { color: "F3F4F6" }, line: { type: "none" } });
  s.addShape("ellipse", { x: 10.5, y: 5.0, w: 3.5, h: 3.5, fill: { color: "FEF3C7" }, line: { type: "none" } });
  s.addShape("ellipse", { x: 11.5, y: 6.0, w: 1.6, h: 1.6, fill: { color: AMBER }, line: { type: "none" } });

  s.addText("A-Box", {
    x: 0.7, y: 1.6, w: 11, h: 1.2,
    fontFace: FONT_H, fontSize: 66, bold: true, color: NAVY,
  });
  s.addText("Property  ·  Business  ·  Agent Hub", {
    x: 0.7, y: 2.85, w: 11, h: 0.6,
    fontFace: FONT_B, fontSize: 22, italic: true, color: AMBER,
  });

  s.addText("One product. Three audiences. One shared toolbox.", {
    x: 0.7, y: 4.0, w: 12, h: 0.6,
    fontFace: FONT_H, fontSize: 20, color: "374151",
  });

  s.addText("Thank you.", {
    x: 0.7, y: 5.4, w: 6, h: 0.8,
    fontFace: FONT_H, fontSize: 42, bold: true, color: NAVY,
  });
  s.addText("Questions?", {
    x: 0.7, y: 6.2, w: 6, h: 0.6,
    fontFace: FONT_B, fontSize: 20, italic: true, color: MUTED,
  });
}

// ===== Save =====
pres.writeFile({ fileName: "A-Box_Introduction.pptx" }).then((fn) => {
  console.log("Wrote: " + fn);
});
