// A-Box — Visually-branded product deck.
// Uses the app's actual graphic elements (AI orb, map markers, tier polylines,
// rank badges, pie chart) as design components on the slides.
// Run: node build_branded_deck.js
// Output: A-Box_Visual_Deck.pptx

const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.title = "A-Box — AI agent for smarter location decisions";
pres.company = "A-Box";

// ========== Palette (mirrors the running app) ==========
const SLATE_950  = "020617";  // app background
const SLATE_900  = "0F172A";
const SLATE_800  = "1E293B";
const SLATE_700  = "334155";
const SLATE_400  = "94A3B8";
const SLATE_500  = "64748B";
const SLATE_200  = "E2E8F0";
const WHITE      = "FFFFFF";

const AMBER_400  = "FBBF24";
const AMBER_500  = "F59E0B";
const AMBER_300  = "FCD34D";
const CYAN_500   = "06B6D4";
const CYAN_400   = "22D3EE";
const CYAN_300   = "67E8F9";
const EMERALD_500 = "10B981";
const EMERALD_400 = "34D399";
const PURPLE_500 = "A855F7";
const RED_500    = "EF4444";

const GOLD   = "FFD700";
const SILVER = "C0C0C0";
const BRONZE = "CD7F32";

const FONT_H = "Calibri";
const FONT_B = "Calibri";

// ============================================================
// REUSABLE COMPONENTS — drawn from the app's actual visuals
// ============================================================

// The pulsing AI Orb from the HomeScreen — concentric rings (amber/cyan/purple)
// + central gradient sphere. Static replica for the slide.
function drawAiOrb(s, cx, cy, scale = 1) {
  const r0 = 1.6 * scale;
  const r1 = 1.25 * scale;
  const r2 = 0.9 * scale;
  const r3 = 0.55 * scale;
  const r4 = 0.32 * scale;

  // Ring 1 (amber)
  s.addShape("ellipse", {
    x: cx - r0, y: cy - r0, w: r0 * 2, h: r0 * 2,
    fill: { type: "none" },
    line: { color: AMBER_500, width: 1.5, transparency: 60 },
  });
  // Ring 2 (cyan)
  s.addShape("ellipse", {
    x: cx - r1, y: cy - r1, w: r1 * 2, h: r1 * 2,
    fill: { type: "none" },
    line: { color: CYAN_500, width: 1.5, transparency: 60 },
  });
  // Ring 3 (purple)
  s.addShape("ellipse", {
    x: cx - r2, y: cy - r2, w: r2 * 2, h: r2 * 2,
    fill: { type: "none" },
    line: { color: PURPLE_500, width: 1.5, transparency: 60 },
  });
  // Outer gradient sphere — fake with two stacked ellipses
  s.addShape("ellipse", {
    x: cx - r3, y: cy - r3, w: r3 * 2, h: r3 * 2,
    fill: { color: AMBER_400 }, line: { color: WHITE, width: 1 },
  });
  s.addShape("ellipse", {
    x: cx - r3 * 0.85, y: cy - r3 * 0.7, w: r3 * 1.7, h: r3 * 1.7,
    fill: { color: CYAN_400 }, line: { type: "none" },
  });
  // Inner hot spot
  s.addShape("ellipse", {
    x: cx - r4, y: cy - r4, w: r4 * 2, h: r4 * 2,
    fill: { color: AMBER_300 }, line: { type: "none" },
  });
}

// The competitor red drop-pin (matches MapView's COMPETITOR_ICON)
function drawCompetitorPin(s, x, y, scale = 1) {
  // Pin body — teardrop made from ellipse + triangle
  const w = 0.35 * scale;
  const h = 0.45 * scale;
  s.addShape("ellipse", {
    x, y, w, h: w,
    fill: { color: RED_500 }, line: { color: WHITE, width: 1 },
  });
  s.addShape("triangle", {
    x: x + w * 0.18, y: y + w * 0.55, w: w * 0.64, h: h * 0.55,
    fill: { color: RED_500 }, line: { color: WHITE, width: 1 },
    flipV: true,
  });
  // White dot in center
  s.addShape("ellipse", {
    x: x + w * 0.32, y: y + w * 0.28, w: w * 0.36, h: w * 0.36,
    fill: { color: WHITE }, line: { type: "none" },
  });
}

// Cyan numbered star — the recommended spot marker
function drawRecStar(s, x, y, rank = "1", scale = 1) {
  const size = 0.7 * scale;
  s.addShape("star5", {
    x, y, w: size, h: size,
    fill: { color: CYAN_500 }, line: { color: WHITE, width: 2 },
  });
  s.addText(rank, {
    x, y, w: size, h: size,
    fontFace: FONT_H, fontSize: 14, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });
}

// Green storefront pin (shop opportunity)
function drawShopPin(s, x, y, scale = 1) {
  const w = 0.35 * scale;
  const h = 0.45 * scale;
  s.addShape("ellipse", {
    x, y, w, h: w,
    fill: { color: EMERALD_500 }, line: { color: WHITE, width: 1 },
  });
  s.addShape("triangle", {
    x: x + w * 0.18, y: y + w * 0.55, w: w * 0.64, h: h * 0.55,
    fill: { color: EMERALD_500 }, line: { color: WHITE, width: 1 },
    flipV: true,
  });
  // Storefront awning lines
  s.addShape("rect", {
    x: x + w * 0.22, y: y + w * 0.26, w: w * 0.55, h: w * 0.10,
    fill: { color: WHITE }, line: { type: "none" },
  });
  s.addShape("rect", {
    x: x + w * 0.22, y: y + w * 0.42, w: w * 0.15, h: w * 0.20,
    fill: { color: WHITE }, line: { type: "none" },
  });
  s.addShape("rect", {
    x: x + w * 0.42, y: y + w * 0.42, w: w * 0.15, h: w * 0.20,
    fill: { color: WHITE }, line: { type: "none" },
  });
}

// Rank badge — small colored circle with number (matches StreetCard)
function drawRankBadge(s, x, y, rank, tier, size = 0.45) {
  const color = tier === "gold" ? AMBER_500 : tier === "silver" ? SLATE_400 : "C2410C";
  s.addShape("ellipse", {
    x, y, w: size, h: size,
    fill: { color }, line: { color: WHITE, width: 1.2 },
  });
  s.addText(rank.toString(), {
    x, y, w: size, h: size,
    fontFace: FONT_H, fontSize: 12, bold: true, color: WHITE,
    align: "center", valign: "middle",
  });
}

// Tier pill — gold/silver/bronze rounded badge
function drawTierPill(s, x, y, w, h, tier) {
  const fill = tier === "gold" ? GOLD : tier === "silver" ? SILVER : BRONZE;
  const text = tier.toUpperCase();
  s.addShape("roundRect", {
    x, y, w, h,
    fill: { color: fill }, line: { type: "none" },
    rectRadius: h / 2,
  });
  s.addText(text, {
    x, y, w, h,
    fontFace: FONT_H, fontSize: 11, bold: true,
    color: tier === "bronze" ? WHITE : "111827",
    align: "center", valign: "middle", charSpacing: 2,
  });
}

// Subtle background glow (the slate-950 + amber/cyan blur halos from the app)
function drawDarkBackdrop(s) {
  s.background = { color: SLATE_950 };
  s.addShape("ellipse", {
    x: 5.5, y: -2, w: 7, h: 7,
    fill: { color: AMBER_500, transparency: 92 }, line: { type: "none" },
  });
  s.addShape("ellipse", {
    x: 9, y: 4.5, w: 5, h: 5,
    fill: { color: CYAN_500, transparency: 92 }, line: { type: "none" },
  });
}

// Section side-rail (one of the three section accent colors)
function drawSideRail(s, color) {
  s.addShape("rect", {
    x: 0, y: 0, w: 0.22, h: 7.5,
    fill: { color }, line: { type: "none" },
  });
}

// "Live AI ready" indicator (emerald dot + label) — appears on the home screen
function drawLiveBadge(s, x, y) {
  s.addShape("ellipse", {
    x, y: y + 0.07, w: 0.18, h: 0.18,
    fill: { color: EMERALD_400 }, line: { type: "none" },
  });
  s.addText("A-BOX IS READY", {
    x: x + 0.25, y, w: 2.3, h: 0.3,
    fontFace: FONT_H, fontSize: 10, bold: true, color: SLATE_400, charSpacing: 6,
  });
}

// Tier polyline strip — mimics the colored street lines on MapView
function drawTierLine(s, x, y, w, tier, withHalo = true) {
  const color = tier === "gold" ? GOLD : tier === "silver" ? SILVER : BRONZE;
  const weight = tier === "gold" ? 9 : tier === "silver" ? 7 : 6;
  if (withHalo) {
    s.addShape("rect", {
      x, y: y - 0.05, w, h: 0.18,
      fill: { color, transparency: 65 }, line: { type: "none" },
    });
  }
  s.addShape("rect", {
    x, y, w, h: weight / 100,
    fill: { color }, line: { type: "none" },
  });
}

// ============================================================
// SLIDE 1 — TITLE  (with the actual AI Orb)
// ============================================================
{
  const s = pres.addSlide();
  drawDarkBackdrop(s);

  // The AI orb on the right
  drawAiOrb(s, 10.3, 3.75, 1.0);

  // Brand
  s.addText("A", {
    x: 0.9, y: 2.0, w: 1.2, h: 1.8,
    fontFace: FONT_H, fontSize: 110, bold: true, color: AMBER_500,
  });
  s.addText("-Box", {
    x: 2.05, y: 2.0, w: 5, h: 1.8,
    fontFace: FONT_H, fontSize: 110, bold: true, color: WHITE,
  });
  s.addText("AI agent for smarter location decisions.", {
    x: 0.9, y: 4.0, w: 8.5, h: 0.6,
    fontFace: FONT_H, fontSize: 22, color: SLATE_200,
  });
  s.addText("Property  ·  Business  ·  Agent Hub", {
    x: 0.9, y: 4.55, w: 8.5, h: 0.5,
    fontFace: FONT_B, fontSize: 16, italic: true, color: AMBER_400, charSpacing: 4,
  });

  drawLiveBadge(s, 0.9, 6.5);
  s.addText("Product Introduction", {
    x: 9.5, y: 6.5, w: 3.2, h: 0.35,
    fontFace: FONT_B, fontSize: 11, color: SLATE_500, align: "right", charSpacing: 4,
  });
}

// ============================================================
// SLIDE 2 — THREE ENTRY BUTTONS (mirrors the actual HomeScreen)
// ============================================================
{
  const s = pres.addSlide();
  drawDarkBackdrop(s);

  s.addText("THE PRODUCT", {
    x: 0.7, y: 0.5, w: 6, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color: AMBER_400, charSpacing: 8,
  });
  s.addText("One app. Three sections.", {
    x: 0.7, y: 0.95, w: 12, h: 0.9,
    fontFace: FONT_H, fontSize: 34, bold: true, color: WHITE,
  });
  s.addText("These three buttons are what the user sees on the home screen — each opens a complete workflow.", {
    x: 0.7, y: 1.85, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 14, italic: true, color: SLATE_400,
  });

  // Three "buttons" mimicking the OptionButton component
  const buttons = [
    { accent: EMERALD_500, title: "Property",  sub: "Buy · Sell · Rent · Airbnb",        body: "Discover properties and compare two areas side-by-side.", icon: "house" },
    { accent: AMBER_500,   title: "Business",  sub: "Find the best street to open",       body: "Gold / Silver / Bronze street ranking from live OSM data.", icon: "business" },
    { accent: CYAN_500,    title: "Agent Hub", sub: "Tools for real-estate agents",       body: "Zones, properties, personas, and an AI-driven automation studio.", icon: "agent" },
  ];

  const yTop = 2.6;
  const xStart = 0.7;
  const colW = 4.0;
  const gap = 0.2;

  buttons.forEach((b, i) => {
    const x = xStart + i * (colW + gap);

    // Card — dark panel with accent border (matches OptionButton component)
    s.addShape("roundRect", {
      x, y: yTop, w: colW, h: 3.7,
      fill: { color: SLATE_900 },
      line: { color: b.accent, width: 1.5, transparency: 30 },
      rectRadius: 0.18,
    });

    // Icon tile
    s.addShape("roundRect", {
      x: x + 0.35, y: yTop + 0.35, w: 0.8, h: 0.8,
      fill: { color: b.accent, transparency: 75 }, line: { type: "none" },
      rectRadius: 0.1,
    });
    // Draw the icon
    if (b.icon === "house") {
      // House shape
      s.addShape("triangle", { x: x + 0.5, y: yTop + 0.48, w: 0.5, h: 0.35, fill: { color: b.accent }, line: { type: "none" } });
      s.addShape("rect",     { x: x + 0.58, y: yTop + 0.78, w: 0.34, h: 0.32, fill: { color: b.accent }, line: { type: "none" } });
    } else if (b.icon === "business") {
      // Briefcase
      s.addShape("roundRect", { x: x + 0.45, y: yTop + 0.65, w: 0.6, h: 0.4, fill: { color: b.accent }, line: { type: "none" }, rectRadius: 0.05 });
      s.addShape("rect",      { x: x + 0.62, y: yTop + 0.5, w: 0.26, h: 0.18, fill: { color: b.accent }, line: { type: "none" } });
    } else {
      // Agent (two heads)
      s.addShape("ellipse", { x: x + 0.45, y: yTop + 0.5, w: 0.32, h: 0.32, fill: { color: b.accent }, line: { type: "none" } });
      s.addShape("ellipse", { x: x + 0.73, y: yTop + 0.6, w: 0.26, h: 0.26, fill: { color: b.accent }, line: { type: "none" } });
      s.addShape("roundRect", { x: x + 0.4, y: yTop + 0.85, w: 0.65, h: 0.25, fill: { color: b.accent }, line: { type: "none" }, rectRadius: 0.05 });
    }

    s.addText(b.title, {
      x: x + 0.35, y: yTop + 1.4, w: colW - 0.7, h: 0.55,
      fontFace: FONT_H, fontSize: 26, bold: true, color: WHITE,
    });
    s.addText(b.sub, {
      x: x + 0.35, y: yTop + 2.0, w: colW - 0.7, h: 0.4,
      fontFace: FONT_B, fontSize: 13, italic: true, color: SLATE_400,
    });
    s.addText(b.body, {
      x: x + 0.35, y: yTop + 2.45, w: colW - 0.7, h: 0.8,
      fontFace: FONT_B, fontSize: 13, color: SLATE_200,
    });

    s.addText("START →", {
      x: x + 0.35, y: yTop + 3.25, w: colW - 0.7, h: 0.3,
      fontFace: FONT_H, fontSize: 11, bold: true, color: b.accent, charSpacing: 4,
    });
  });

  s.addText("A-Box uses AI and OpenStreetMap data — no fake listings, no hidden fees.", {
    x: 0.7, y: 6.7, w: 12, h: 0.35,
    fontFace: FONT_B, fontSize: 11, italic: true, color: SLATE_500, align: "center",
  });
}

// ============================================================
// SLIDE 3 — PROPERTY SECTION (with property pins on a map)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  drawSideRail(s, EMERALD_500);

  s.addText("SECTION 1  ·  PROPERTY", {
    x: 0.7, y: 0.5, w: 8, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color: EMERALD_500, charSpacing: 8,
  });
  s.addText("Discover. Compare. Decide.", {
    x: 0.7, y: 0.95, w: 12, h: 0.85,
    fontFace: FONT_H, fontSize: 32, bold: true, color: SLATE_900,
  });

  // Left side — the 3 phases as numbered pills
  const phases = [
    { n: "1", h: "Picker",  b: "Drop a pin or use IP location to start." },
    { n: "2", h: "Explore", b: "Filter by Rent / Sell / Airbnb. Browse pins inside the radius." },
    { n: "3", h: "Compare", b: "Add a 2nd area, pick one property from each, get an AI comparison report." },
  ];
  const yTop = 2.4;
  phases.forEach((p, i) => {
    const y = yTop + i * 1.1;
    s.addShape("ellipse", {
      x: 0.7, y: y + 0.05, w: 0.55, h: 0.55,
      fill: { color: EMERALD_500 }, line: { type: "none" },
    });
    s.addText(p.n, {
      x: 0.7, y: y + 0.05, w: 0.55, h: 0.55,
      fontFace: FONT_H, fontSize: 18, bold: true, color: WHITE, align: "center", valign: "middle",
    });
    s.addText(p.h, {
      x: 1.4, y, w: 5.2, h: 0.4,
      fontFace: FONT_H, fontSize: 18, bold: true, color: SLATE_900,
    });
    s.addText(p.b, {
      x: 1.4, y: y + 0.45, w: 5.5, h: 0.65,
      fontFace: FONT_B, fontSize: 12, color: SLATE_700,
    });
  });

  // Right side — mini "map" showing 2 area circles + property pins (the actual UI mock)
  s.addShape("roundRect", {
    x: 7.4, y: 2.4, w: 5.3, h: 3.9,
    fill: { color: "F1F5F9" }, line: { color: SLATE_700, width: 0.5 },
    rectRadius: 0.1,
  });
  // Light "map" grid background
  for (let i = 1; i < 5; i++) {
    s.addShape("rect", { x: 7.4, y: 2.4 + i * 0.75, w: 5.3, h: 0.02, fill: { color: SLATE_400, transparency: 80 }, line: { type: "none" } });
  }
  for (let i = 1; i < 7; i++) {
    s.addShape("rect", { x: 7.4 + i * 0.75, y: 2.4, w: 0.02, h: 3.9, fill: { color: SLATE_400, transparency: 80 }, line: { type: "none" } });
  }

  // Two area circles
  s.addShape("ellipse", {
    x: 7.9, y: 2.9, w: 2.0, h: 2.0,
    fill: { color: EMERALD_500, transparency: 88 },
    line: { color: EMERALD_500, width: 1.5 },
  });
  s.addShape("ellipse", {
    x: 10.0, y: 3.7, w: 2.2, h: 2.2,
    fill: { color: CYAN_500, transparency: 88 },
    line: { color: CYAN_500, width: 1.5 },
  });
  // Labels
  s.addText("Area 1", {
    x: 8.0, y: 2.7, w: 1.8, h: 0.3,
    fontFace: FONT_H, fontSize: 11, bold: true, color: EMERALD_500,
  });
  s.addText("Area 2", {
    x: 10.5, y: 3.5, w: 1.8, h: 0.3,
    fontFace: FONT_H, fontSize: 11, bold: true, color: CYAN_500,
  });
  // Property pins inside the circles
  drawShopPin(s, 8.5, 3.4, 0.7);
  drawShopPin(s, 9.2, 3.7, 0.7);
  drawShopPin(s, 10.7, 4.3, 0.7);
  drawShopPin(s, 11.3, 4.6, 0.7);
  drawShopPin(s, 11.0, 5.1, 0.7);

  s.addText("Live map: 2 area circles + filtered property pins", {
    x: 7.4, y: 6.35, w: 5.3, h: 0.3,
    fontFace: FONT_B, fontSize: 10, italic: true, color: SLATE_500, align: "center",
  });

  s.addText("Powered by: /api/property-compare · OpenRouter LLM chain · localStorage", {
    x: 0.7, y: 6.7, w: 12, h: 0.35,
    fontFace: FONT_B, fontSize: 11, italic: true, color: SLATE_500,
  });
}

// ============================================================
// SLIDE 4 — BUSINESS SECTION (with the actual map markers + tiers)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  drawSideRail(s, AMBER_500);

  s.addText("SECTION 2  ·  BUSINESS", {
    x: 0.7, y: 0.5, w: 8, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color: AMBER_500, charSpacing: 8,
  });
  s.addText("Find the best street to open.", {
    x: 0.7, y: 0.95, w: 12, h: 0.85,
    fontFace: FONT_H, fontSize: 32, bold: true, color: SLATE_900,
  });

  // The map mock — dark background mimicking the actual MapView with tier polylines
  s.addShape("roundRect", {
    x: 0.7, y: 2.3, w: 7.5, h: 4.2,
    fill: { color: SLATE_950 }, line: { color: SLATE_700, width: 0.5 },
    rectRadius: 0.1,
  });
  // Radius circle
  s.addShape("ellipse", {
    x: 1.7, y: 2.9, w: 5.5, h: 3.1,
    fill: { color: AMBER_500, transparency: 92 },
    line: { color: AMBER_500, width: 1, transparency: 50 },
  });

  // Gold / Silver / Bronze polylines (horizontal "streets")
  drawTierLine(s, 1.5, 3.5,  5.5, "gold");
  drawTierLine(s, 1.5, 4.2,  4.5, "silver");
  drawTierLine(s, 2.5, 4.9,  4.0, "bronze");
  drawTierLine(s, 2.0, 5.55, 3.5, "gold");

  // Markers
  drawRecStar(s, 3.0, 3.25, "1", 1.0);
  drawRecStar(s, 4.3, 5.30, "2", 0.85);
  drawCompetitorPin(s, 2.3, 3.4, 0.9);
  drawCompetitorPin(s, 5.5, 3.4, 0.9);
  drawCompetitorPin(s, 4.8, 4.1, 0.9);
  drawCompetitorPin(s, 6.0, 4.8, 0.9);

  // Map legend
  s.addText("MAP LEGEND", {
    x: 0.95, y: 2.45, w: 2, h: 0.3,
    fontFace: FONT_H, fontSize: 9, bold: true, color: SLATE_400, charSpacing: 4,
  });

  // Right column — the tier explanation
  const xR = 8.5;
  s.addText("HOW IT RANKS", {
    x: xR, y: 2.3, w: 4.2, h: 0.3,
    fontFace: FONT_H, fontSize: 11, bold: true, color: AMBER_500, charSpacing: 6,
  });

  // 3 tier rows
  const tiers = [
    { tier: "gold",   score: "≥ 160", line: "Prime location.  Prioritise." },
    { tier: "silver", score: "110-159", line: "Viable backup.  Watch the competition." },
    { tier: "bronze", score: "< 110",   line: "Too quiet or saturated. Skip." },
  ];
  tiers.forEach((t, i) => {
    const y = 2.75 + i * 1.05;
    drawTierPill(s, xR, y, 1.1, 0.35, t.tier);
    s.addText("score " + t.score, {
      x: xR + 1.25, y: y - 0.02, w: 2.5, h: 0.35,
      fontFace: FONT_B, fontSize: 12, italic: true, color: SLATE_700, valign: "middle",
    });
    s.addText(t.line, {
      x: xR, y: y + 0.42, w: 4.2, h: 0.5,
      fontFace: FONT_B, fontSize: 12, color: SLATE_900,
    });
  });

  s.addText("8 categories  ·  3 radii (500 m / 1 km / 1.5 km)  ·  Live OpenStreetMap data", {
    x: 0.7, y: 6.7, w: 12, h: 0.35,
    fontFace: FONT_B, fontSize: 11, italic: true, color: SLATE_500,
  });
}

// ============================================================
// SLIDE 5 — AGENT HUB SECTION (with the i-Case node graph)
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };
  drawSideRail(s, CYAN_500);

  s.addText("SECTION 3  ·  AGENT HUB", {
    x: 0.7, y: 0.5, w: 8, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color: CYAN_500, charSpacing: 8,
  });
  s.addText("A workspace for real-estate agents.", {
    x: 0.7, y: 0.95, w: 12, h: 0.85,
    fontFace: FONT_H, fontSize: 32, bold: true, color: SLATE_900,
  });

  // Left column — five views
  const views = ["Dashboard", "Areas (Zones)", "Properties", "Common Projects", "Chat"];
  s.addText("FIVE WORKSPACE VIEWS", {
    x: 0.7, y: 2.3, w: 5, h: 0.3,
    fontFace: FONT_H, fontSize: 11, bold: true, color: CYAN_500, charSpacing: 4,
  });
  views.forEach((v, i) => {
    const y = 2.7 + i * 0.55;
    s.addShape("ellipse", {
      x: 0.7, y: y + 0.07, w: 0.4, h: 0.4,
      fill: { color: CYAN_500, transparency: 70 }, line: { color: CYAN_500, width: 1 },
    });
    s.addText((i + 1).toString(), {
      x: 0.7, y: y + 0.07, w: 0.4, h: 0.4,
      fontFace: FONT_H, fontSize: 12, bold: true, color: CYAN_500, align: "center", valign: "middle",
    });
    s.addText(v, {
      x: 1.25, y, w: 4.5, h: 0.5,
      fontFace: FONT_H, fontSize: 17, bold: true, color: SLATE_900, valign: "middle",
    });
  });

  // Right column — flagship i-Case node graph (the actual workflow visual)
  s.addShape("roundRect", {
    x: 6.5, y: 2.3, w: 6.2, h: 4.2,
    fill: { color: SLATE_950 }, line: { color: SLATE_700, width: 0.5 },
    rectRadius: 0.12,
  });
  s.addText("FLAGSHIP  ·  i-Case Workspace", {
    x: 6.7, y: 2.45, w: 6, h: 0.3,
    fontFace: FONT_H, fontSize: 10, bold: true, color: CYAN_400, charSpacing: 6,
  });

  // Three nodes connected by lines
  const nodeY = 4.0;
  const nodes = [
    { x: 6.85, y: nodeY,        label: "Zone", color: AMBER_500, sub: "Dubai Marina" },
    { x: 8.85, y: nodeY - 0.5,  label: "Source", color: EMERALD_500, sub: "Property Finder" },
    { x: 10.85, y: nodeY,       label: "Tool", color: CYAN_500, sub: "Compare" },
  ];

  // Connecting lines (drawn as thin rotated rects)
  s.addShape("line", {
    x: 7.85, y: nodeY + 0.4, w: 1.0, h: -0.45,
    line: { color: CYAN_400, width: 2 },
  });
  s.addShape("line", {
    x: 9.85, y: nodeY - 0.1, w: 1.0, h: 0.45,
    line: { color: CYAN_400, width: 2 },
  });

  nodes.forEach((n) => {
    s.addShape("roundRect", {
      x: n.x, y: n.y, w: 1.7, h: 0.8,
      fill: { color: SLATE_900 }, line: { color: n.color, width: 1.5 },
      rectRadius: 0.08,
    });
    s.addShape("ellipse", {
      x: n.x + 0.15, y: n.y + 0.22, w: 0.35, h: 0.35,
      fill: { color: n.color }, line: { type: "none" },
    });
    s.addText(n.label, {
      x: n.x + 0.55, y: n.y + 0.08, w: 1.1, h: 0.3,
      fontFace: FONT_H, fontSize: 12, bold: true, color: WHITE,
    });
    s.addText(n.sub, {
      x: n.x + 0.55, y: n.y + 0.42, w: 1.1, h: 0.3,
      fontFace: FONT_B, fontSize: 9, italic: true, color: SLATE_400,
    });
  });

  // AI orchestrator chat bubble
  s.addShape("roundRect", {
    x: 6.85, y: 5.4, w: 5.7, h: 0.95,
    fill: { color: SLATE_900 }, line: { color: CYAN_500, width: 1 },
    rectRadius: 0.08,
  });
  drawAiOrb(s, 7.25, 5.85, 0.25);
  s.addText("\"Add a 1.5 km zone in JBR and run a price-compare.\"", {
    x: 7.65, y: 5.45, w: 4.7, h: 0.4,
    fontFace: FONT_B, fontSize: 11, italic: true, color: SLATE_200,
  });
  s.addText("→  3 actions executed automatically", {
    x: 7.65, y: 5.9, w: 4.7, h: 0.4,
    fontFace: FONT_H, fontSize: 10, bold: true, color: CYAN_400,
  });

  s.addText("AI orchestrator: agent describes the workflow → LLM returns chat + structured actions.", {
    x: 0.7, y: 6.7, w: 12, h: 0.35,
    fontFace: FONT_B, fontSize: 11, italic: true, color: SLATE_500,
  });
}

// ============================================================
// SLIDE 6 — ARCHITECTURE (with score pie chart mimicking the app)
// ============================================================
{
  const s = pres.addSlide();
  drawDarkBackdrop(s);

  s.addText("ARCHITECTURE", {
    x: 0.7, y: 0.5, w: 8, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color: AMBER_400, charSpacing: 8,
  });
  s.addText("Data → Math → AI Narrative.", {
    x: 0.7, y: 0.95, w: 12, h: 0.85,
    fontFace: FONT_H, fontSize: 32, bold: true, color: WHITE,
  });

  // Left: 3-stage flow with rank-badge style numbered circles
  const stages = [
    { n: "01", c: EMERALD_500, h: "OSM Data",      b: "Pull every business, transit, anchor and residential building inside the radius." },
    { n: "02", c: AMBER_500,   h: "Scoring Math",  b: "100 − (competitors × 18) + variety + density + transit + anchors + residential + road class." },
    { n: "03", c: CYAN_500,    h: "LLM Narrative", b: "AI writes the per-street notes, executive report, recommendation reasoning, property portals." },
  ];

  const yTop = 2.4;
  stages.forEach((st, i) => {
    const y = yTop + i * 1.3;
    s.addText(st.n, {
      x: 0.7, y, w: 1.0, h: 0.8,
      fontFace: FONT_H, fontSize: 48, bold: true, color: st.c,
    });
    s.addShape("rect", {
      x: 1.85, y: y + 0.15, w: 0.05, h: 0.7,
      fill: { color: st.c }, line: { type: "none" },
    });
    s.addText(st.h, {
      x: 2.05, y, w: 5.0, h: 0.5,
      fontFace: FONT_H, fontSize: 18, bold: true, color: WHITE,
    });
    s.addText(st.b, {
      x: 2.05, y: y + 0.5, w: 5.5, h: 0.7,
      fontFace: FONT_B, fontSize: 12, color: SLATE_200,
    });
  });

  // Right: pie chart from the actual app showing score composition for a sample top street
  const cx = 10.5, cy = 3.9, r = 1.5;
  pres.defineSlideMaster({ title: "x", background: { color: SLATE_950 } });

  s.addText("SCORE COMPOSITION", {
    x: 8.4, y: 2.3, w: 4.2, h: 0.3,
    fontFace: FONT_H, fontSize: 11, bold: true, color: AMBER_400, charSpacing: 6,
  });
  s.addText("Sample top-street breakdown", {
    x: 8.4, y: 2.6, w: 4.2, h: 0.3,
    fontFace: FONT_B, fontSize: 11, italic: true, color: SLATE_400,
  });

  // Pie chart — use pptxgenjs native chart
  s.addChart(pres.ChartType.doughnut, [
    {
      name: "Score components",
      labels: ["Base", "Density", "Variety", "Transit", "Anchors", "Residential", "Road class"],
      values: [100, 28, 12, 30, 36, 15, 22],
    },
  ], {
    x: 8.5, y: 2.9, w: 4.0, h: 3.4,
    chartColors: ["475569", "64748B", "94A3B8", "06B6D4", "A855F7", "10B981", "F59E0B"],
    holeSize: 50,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 8,
    legendColor: "E2E8F0",
    legendFontFace: FONT_B,
    showTitle: false,
    dataBorder: { color: SLATE_950, pct: 1 },
    showPercent: false,
  });

  // Bottom strip
  s.addShape("roundRect", {
    x: 0.7, y: 6.4, w: 12.0, h: 0.7,
    fill: { color: AMBER_500 }, line: { type: "none" }, rectRadius: 0.1,
  });
  s.addText("The code measures the street.  The AI describes the measurement.", {
    x: 0.7, y: 6.4, w: 12.0, h: 0.7,
    fontFace: FONT_H, fontSize: 15, bold: true, italic: true, color: SLATE_950, align: "center", valign: "middle",
  });
}

// ============================================================
// SLIDE 7 — TECH STACK
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  s.addText("TECHNOLOGY", {
    x: 0.7, y: 0.5, w: 8, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color: AMBER_500, charSpacing: 8,
  });
  s.addText("Modern, production-ready, zero-cost stack.", {
    x: 0.7, y: 0.95, w: 12, h: 0.85,
    fontFace: FONT_H, fontSize: 32, bold: true, color: SLATE_900,
  });

  const rows = [
    { label: "Frontend",        value: "Next.js 14 (App Router) + React 18" },
    { label: "Styling",         value: "Tailwind CSS" },
    { label: "Maps",            value: "Leaflet + react-leaflet" },
    { label: "Backend",         value: "Next.js API Routes (Node.js)" },
    { label: "Geographic Data", value: "OpenStreetMap (Overpass + Nominatim)" },
    { label: "AI Layer",        value: "OpenRouter → Ollama → template fallback" },
    { label: "Persistence",     value: "Browser localStorage (no backend)" },
  ];

  const yTop = 2.3;
  const rowH = 0.55;
  const xLeft = 0.7;
  const labelW = 2.8;
  const valueW = 6.4;

  rows.forEach((r, i) => {
    const y = yTop + i * rowH;
    s.addShape("ellipse", { x: xLeft, y: y + 0.13, w: 0.3, h: 0.3, fill: { color: AMBER_500 }, line: { type: "none" } });
    s.addText(r.label.toUpperCase(), {
      x: xLeft + 0.45, y, w: labelW, h: rowH,
      fontFace: FONT_H, fontSize: 12, bold: true, color: SLATE_500, valign: "middle", charSpacing: 4,
    });
    s.addText(r.value, {
      x: xLeft + 0.45 + labelW, y, w: valueW, h: rowH,
      fontFace: FONT_H, fontSize: 17, bold: true, color: SLATE_900, valign: "middle",
    });
  });

  // Right side panels — $0 cost + 9 APIs
  s.addShape("roundRect", {
    x: 10.4, y: 2.3, w: 2.3, h: 2.5,
    fill: { color: SLATE_950 }, line: { type: "none" }, rectRadius: 0.15,
  });
  s.addText("RUNNING COST", {
    x: 10.4, y: 2.5, w: 2.3, h: 0.4,
    fontFace: FONT_H, fontSize: 10, bold: true, color: SLATE_200, align: "center", charSpacing: 4,
  });
  s.addText("$0", {
    x: 10.4, y: 2.85, w: 2.3, h: 1.3,
    fontFace: FONT_H, fontSize: 78, bold: true, color: AMBER_500, align: "center",
  });
  s.addText("No API keys.\nNo billing.", {
    x: 10.4, y: 4.15, w: 2.3, h: 0.6,
    fontFace: FONT_B, fontSize: 11, color: SLATE_200, align: "center",
  });

  s.addShape("roundRect", {
    x: 10.4, y: 5.0, w: 2.3, h: 1.6,
    fill: { color: AMBER_500 }, line: { type: "none" }, rectRadius: 0.15,
  });
  s.addText("9", {
    x: 10.4, y: 5.05, w: 2.3, h: 0.8,
    fontFace: FONT_H, fontSize: 56, bold: true, color: SLATE_950, align: "center",
  });
  s.addText("API endpoints\npowering 3 sections", {
    x: 10.4, y: 5.85, w: 2.3, h: 0.7,
    fontFace: FONT_B, fontSize: 11, bold: true, color: SLATE_950, align: "center",
  });

  s.addText("Free, public services today.  Paid APIs (Google Places · Placer.ai · Property Finder API) are the next investment.", {
    x: 0.7, y: 6.7, w: 9.6, h: 0.35,
    fontFace: FONT_B, fontSize: 11, italic: true, color: SLATE_500,
  });
}

// ============================================================
// SLIDE 8 — CLOSING (orb returns)
// ============================================================
{
  const s = pres.addSlide();
  drawDarkBackdrop(s);

  // Large central orb
  drawAiOrb(s, 6.66, 3.5, 1.4);

  s.addText("A-Box", {
    x: 0.7, y: 5.4, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 56, bold: true, color: WHITE, align: "center",
  });
  s.addText("Property  ·  Business  ·  Agent Hub", {
    x: 0.7, y: 6.3, w: 12, h: 0.5,
    fontFace: FONT_B, fontSize: 16, italic: true, color: AMBER_400, align: "center", charSpacing: 4,
  });
  drawLiveBadge(s, 5.7, 6.85);

  s.addText("Thank you  ·  Questions?", {
    x: 0.7, y: 0.5, w: 12, h: 0.5,
    fontFace: FONT_H, fontSize: 14, bold: true, color: SLATE_400, align: "center", charSpacing: 6,
  });
}

// ===== Save =====
pres.writeFile({ fileName: "A-Box_Visual_Deck.pptx" }).then((fn) => {
  console.log("Wrote: " + fn);
});
