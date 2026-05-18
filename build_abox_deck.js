// A-Box — final unified presentation.
// One short deck combining the best of the 3 earlier versions:
//   - Short and easy to present (7 slides, ~3-4 min)
//   - Uses the app's actual graphic elements (orb, map markers, tier pills, node graph)
//   - Introduces all 3 sections (Property, Business, Agent Hub) + the tech stack
// Run: node build_abox_deck.js
// Output: A-Box.pptx

const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.title = "A-Box";
pres.company = "A-Box";

// ========== Palette (mirrors the running app) ==========
const SLATE_950 = "020617";
const SLATE_900 = "0F172A";
const SLATE_800 = "1E293B";
const SLATE_700 = "334155";
const SLATE_500 = "64748B";
const SLATE_400 = "94A3B8";
const SLATE_200 = "E2E8F0";
const SLATE_900_TXT = "0F172A";
const WHITE = "FFFFFF";

const AMBER_500 = "F59E0B";
const AMBER_400 = "FBBF24";
const AMBER_300 = "FCD34D";
const CYAN_500  = "06B6D4";
const CYAN_400  = "22D3EE";
const EMERALD_500 = "10B981";
const EMERALD_400 = "34D399";
const PURPLE_500 = "A855F7";
const RED_500    = "EF4444";

const GOLD   = "FFD700";
const SILVER = "C0C0C0";
const BRONZE = "CD7F32";

const FONT_H = "Calibri";
const FONT_B = "Calibri";

// ========== Reusable visual components from the app ==========
function drawAiOrb(s, cx, cy, scale = 1) {
  const r0 = 1.6 * scale, r1 = 1.25 * scale, r2 = 0.9 * scale, r3 = 0.55 * scale, r4 = 0.32 * scale;
  s.addShape("ellipse", { x: cx - r0, y: cy - r0, w: r0 * 2, h: r0 * 2, fill: { type: "none" }, line: { color: AMBER_500, width: 1.5, transparency: 60 } });
  s.addShape("ellipse", { x: cx - r1, y: cy - r1, w: r1 * 2, h: r1 * 2, fill: { type: "none" }, line: { color: CYAN_500, width: 1.5, transparency: 60 } });
  s.addShape("ellipse", { x: cx - r2, y: cy - r2, w: r2 * 2, h: r2 * 2, fill: { type: "none" }, line: { color: PURPLE_500, width: 1.5, transparency: 60 } });
  s.addShape("ellipse", { x: cx - r3, y: cy - r3, w: r3 * 2, h: r3 * 2, fill: { color: AMBER_400 }, line: { color: WHITE, width: 1 } });
  s.addShape("ellipse", { x: cx - r3 * 0.85, y: cy - r3 * 0.7, w: r3 * 1.7, h: r3 * 1.7, fill: { color: CYAN_400 }, line: { type: "none" } });
  s.addShape("ellipse", { x: cx - r4, y: cy - r4, w: r4 * 2, h: r4 * 2, fill: { color: AMBER_300 }, line: { type: "none" } });
}

function drawCompetitorPin(s, x, y, scale = 1) {
  const w = 0.35 * scale, h = 0.45 * scale;
  s.addShape("ellipse",  { x, y, w, h: w, fill: { color: RED_500 }, line: { color: WHITE, width: 1 } });
  s.addShape("triangle", { x: x + w * 0.18, y: y + w * 0.55, w: w * 0.64, h: h * 0.55, fill: { color: RED_500 }, line: { color: WHITE, width: 1 }, flipV: true });
  s.addShape("ellipse",  { x: x + w * 0.32, y: y + w * 0.28, w: w * 0.36, h: w * 0.36, fill: { color: WHITE }, line: { type: "none" } });
}

function drawRecStar(s, x, y, rank = "1", scale = 1) {
  const size = 0.7 * scale;
  s.addShape("star5", { x, y, w: size, h: size, fill: { color: CYAN_500 }, line: { color: WHITE, width: 2 } });
  s.addText(rank, { x, y, w: size, h: size, fontFace: FONT_H, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle" });
}

function drawShopPin(s, x, y, scale = 1) {
  const w = 0.35 * scale, h = 0.45 * scale;
  s.addShape("ellipse",  { x, y, w, h: w, fill: { color: EMERALD_500 }, line: { color: WHITE, width: 1 } });
  s.addShape("triangle", { x: x + w * 0.18, y: y + w * 0.55, w: w * 0.64, h: h * 0.55, fill: { color: EMERALD_500 }, line: { color: WHITE, width: 1 }, flipV: true });
  s.addShape("rect",     { x: x + w * 0.22, y: y + w * 0.26, w: w * 0.55, h: w * 0.10, fill: { color: WHITE }, line: { type: "none" } });
  s.addShape("rect",     { x: x + w * 0.22, y: y + w * 0.42, w: w * 0.15, h: w * 0.20, fill: { color: WHITE }, line: { type: "none" } });
  s.addShape("rect",     { x: x + w * 0.42, y: y + w * 0.42, w: w * 0.15, h: w * 0.20, fill: { color: WHITE }, line: { type: "none" } });
}

function drawTierPill(s, x, y, w, h, tier) {
  const fill = tier === "gold" ? GOLD : tier === "silver" ? SILVER : BRONZE;
  const txt = tier === "bronze" ? WHITE : "111827";
  s.addShape("roundRect", { x, y, w, h, fill: { color: fill }, line: { type: "none" }, rectRadius: h / 2 });
  s.addText(tier.toUpperCase(), { x, y, w, h, fontFace: FONT_H, fontSize: 11, bold: true, color: txt, align: "center", valign: "middle", charSpacing: 2 });
}

function drawTierLine(s, x, y, w, tier) {
  const color = tier === "gold" ? GOLD : tier === "silver" ? SILVER : BRONZE;
  const weight = tier === "gold" ? 9 : tier === "silver" ? 7 : 6;
  s.addShape("rect", { x, y: y - 0.05, w, h: 0.18, fill: { color, transparency: 65 }, line: { type: "none" } });
  s.addShape("rect", { x, y, w, h: weight / 100, fill: { color }, line: { type: "none" } });
}

function drawDarkBackdrop(s) {
  s.background = { color: SLATE_950 };
  s.addShape("ellipse", { x: 5.5, y: -2, w: 7, h: 7, fill: { color: AMBER_500, transparency: 92 }, line: { type: "none" } });
  s.addShape("ellipse", { x: 9, y: 4.5, w: 5, h: 5, fill: { color: CYAN_500, transparency: 92 }, line: { type: "none" } });
}

function drawSideRail(s, color) {
  s.addShape("rect", { x: 0, y: 0, w: 0.22, h: 7.5, fill: { color }, line: { type: "none" } });
}

function drawLiveBadge(s, x, y) {
  s.addShape("ellipse", { x, y: y + 0.07, w: 0.18, h: 0.18, fill: { color: EMERALD_400 }, line: { type: "none" } });
  s.addText("A-BOX IS READY", { x: x + 0.25, y, w: 2.3, h: 0.3, fontFace: FONT_H, fontSize: 10, bold: true, color: SLATE_400, charSpacing: 6 });
}

// Small footer brand on every content slide
function drawFooter(s, slideNum, total) {
  s.addText("A-Box", {
    x: 0.7, y: 6.95, w: 2, h: 0.3,
    fontFace: FONT_H, fontSize: 11, bold: true, color: AMBER_500,
  });
  s.addText(`${slideNum} / ${total}`, {
    x: 11, y: 6.95, w: 1.7, h: 0.3,
    fontFace: FONT_B, fontSize: 10, color: SLATE_500, align: "right",
  });
}

const TOTAL = 9;

// ============================================================
// SLIDE 1 — TITLE
// ============================================================
{
  const s = pres.addSlide();
  drawDarkBackdrop(s);

  // Large AI orb on the right
  drawAiOrb(s, 10.3, 3.75, 1.0);

  // Brand
  s.addText("A", { x: 0.9, y: 1.9, w: 1.2, h: 1.8, fontFace: FONT_H, fontSize: 120, bold: true, color: AMBER_500 });
  s.addText("-Box", { x: 2.15, y: 1.9, w: 5, h: 1.8, fontFace: FONT_H, fontSize: 120, bold: true, color: WHITE });

  s.addText("AI agent for smarter location decisions.", {
    x: 0.9, y: 4.05, w: 8.5, h: 0.6,
    fontFace: FONT_H, fontSize: 22, color: SLATE_200,
  });
  s.addText("Property  ·  Business  ·  Agent Hub", {
    x: 0.9, y: 4.65, w: 8.5, h: 0.5,
    fontFace: FONT_B, fontSize: 17, italic: true, color: AMBER_400, charSpacing: 4,
  });

  drawLiveBadge(s, 0.9, 6.5);
  s.addText("Product Introduction", {
    x: 8.0, y: 6.5, w: 4.7, h: 0.35,
    fontFace: FONT_B, fontSize: 11, color: SLATE_500, align: "right", charSpacing: 4,
  });
}

// ============================================================
// SLIDE 2 — THE THREE SECTIONS
// ============================================================
{
  const s = pres.addSlide();
  drawDarkBackdrop(s);

  s.addText("ONE APP", {
    x: 0.7, y: 0.5, w: 6, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color: AMBER_400, charSpacing: 8,
  });
  s.addText("Three sections. Three audiences.", {
    x: 0.7, y: 0.95, w: 12, h: 0.85,
    fontFace: FONT_H, fontSize: 34, bold: true, color: WHITE,
  });
  s.addText("Each button on the home screen opens a complete workflow.", {
    x: 0.7, y: 1.85, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 14, italic: true, color: SLATE_400,
  });

  // Three cards mimicking the actual HomeScreen OptionButtons
  const buttons = [
    { accent: EMERALD_500, title: "Property",  sub: "Buy · Sell · Rent · Airbnb",  body: "Discover properties and compare two areas side-by-side.", icon: "house" },
    { accent: AMBER_500,   title: "Business",  sub: "Find the best street to open", body: "Gold / Silver / Bronze street ranking from live OSM data.", icon: "business" },
    { accent: CYAN_500,    title: "Agent Hub", sub: "Tools for real-estate agents",  body: "Zones, properties and an AI-driven automation studio.", icon: "agent" },
  ];

  const yTop = 2.6;
  const xStart = 0.7;
  const colW = 4.0;
  const gap = 0.2;

  buttons.forEach((b, i) => {
    const x = xStart + i * (colW + gap);

    s.addShape("roundRect", {
      x, y: yTop, w: colW, h: 3.7,
      fill: { color: SLATE_900 },
      line: { color: b.accent, width: 1.5, transparency: 30 },
      rectRadius: 0.18,
    });

    // Icon tile
    s.addShape("roundRect", {
      x: x + 0.35, y: yTop + 0.35, w: 0.8, h: 0.8,
      fill: { color: b.accent, transparency: 75 }, line: { type: "none" }, rectRadius: 0.1,
    });
    if (b.icon === "house") {
      s.addShape("triangle", { x: x + 0.5, y: yTop + 0.48, w: 0.5, h: 0.35, fill: { color: b.accent }, line: { type: "none" } });
      s.addShape("rect",     { x: x + 0.58, y: yTop + 0.78, w: 0.34, h: 0.32, fill: { color: b.accent }, line: { type: "none" } });
    } else if (b.icon === "business") {
      s.addShape("roundRect", { x: x + 0.45, y: yTop + 0.65, w: 0.6, h: 0.4, fill: { color: b.accent }, line: { type: "none" }, rectRadius: 0.05 });
      s.addShape("rect",      { x: x + 0.62, y: yTop + 0.5, w: 0.26, h: 0.18, fill: { color: b.accent }, line: { type: "none" } });
    } else {
      s.addShape("ellipse",  { x: x + 0.45, y: yTop + 0.5, w: 0.32, h: 0.32, fill: { color: b.accent }, line: { type: "none" } });
      s.addShape("ellipse",  { x: x + 0.73, y: yTop + 0.6, w: 0.26, h: 0.26, fill: { color: b.accent }, line: { type: "none" } });
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
      x: x + 0.35, y: yTop + 2.45, w: colW - 0.7, h: 0.85,
      fontFace: FONT_B, fontSize: 13, color: SLATE_200,
    });

    s.addText("START →", {
      x: x + 0.35, y: yTop + 3.3, w: colW - 0.7, h: 0.3,
      fontFace: FONT_H, fontSize: 11, bold: true, color: b.accent, charSpacing: 4,
    });
  });

  drawFooter(s, 2, TOTAL);
}

// ============================================================
// SLIDE 3 — PROPERTY
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
    fontFace: FONT_H, fontSize: 32, bold: true, color: SLATE_900_TXT,
  });
  s.addText("For buyers, renters and investors who want to compare two areas at once.", {
    x: 0.7, y: 1.85, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 14, italic: true, color: SLATE_500,
  });

  // Left — 3 phases
  const phases = [
    { n: "1", h: "Picker",  b: "Drop a pin or use IP location." },
    { n: "2", h: "Explore", b: "Filter by Rent / Sell / Airbnb. Browse pins inside the radius." },
    { n: "3", h: "Compare", b: "Pick one property in each area. Get an AI comparison report." },
  ];
  const yTop = 2.6;
  phases.forEach((p, i) => {
    const y = yTop + i * 1.05;
    s.addShape("ellipse", {
      x: 0.7, y: y + 0.05, w: 0.55, h: 0.55,
      fill: { color: EMERALD_500 }, line: { type: "none" },
    });
    s.addText(p.n, {
      x: 0.7, y: y + 0.05, w: 0.55, h: 0.55,
      fontFace: FONT_H, fontSize: 18, bold: true, color: WHITE, align: "center", valign: "middle",
    });
    s.addText(p.h, {
      x: 1.4, y, w: 5.0, h: 0.4,
      fontFace: FONT_H, fontSize: 18, bold: true, color: SLATE_900_TXT,
    });
    s.addText(p.b, {
      x: 1.4, y: y + 0.45, w: 5.5, h: 0.6,
      fontFace: FONT_B, fontSize: 12, color: SLATE_700,
    });
  });

  // Right — mini map mock
  s.addShape("roundRect", {
    x: 7.4, y: 2.6, w: 5.3, h: 3.6,
    fill: { color: "F1F5F9" }, line: { color: SLATE_700, width: 0.5 },
    rectRadius: 0.1,
  });
  for (let i = 1; i < 5; i++) {
    s.addShape("rect", { x: 7.4, y: 2.6 + i * 0.7, w: 5.3, h: 0.02, fill: { color: SLATE_400, transparency: 80 }, line: { type: "none" } });
  }
  for (let i = 1; i < 7; i++) {
    s.addShape("rect", { x: 7.4 + i * 0.75, y: 2.6, w: 0.02, h: 3.6, fill: { color: SLATE_400, transparency: 80 }, line: { type: "none" } });
  }
  s.addShape("ellipse", { x: 7.9, y: 3.0, w: 2.0, h: 2.0, fill: { color: EMERALD_500, transparency: 88 }, line: { color: EMERALD_500, width: 1.5 } });
  s.addShape("ellipse", { x: 10.0, y: 3.6, w: 2.2, h: 2.2, fill: { color: CYAN_500, transparency: 88 }, line: { color: CYAN_500, width: 1.5 } });
  s.addText("Area 1", { x: 8.0, y: 2.85, w: 1.8, h: 0.3, fontFace: FONT_H, fontSize: 11, bold: true, color: EMERALD_500 });
  s.addText("Area 2", { x: 10.5, y: 3.45, w: 1.8, h: 0.3, fontFace: FONT_H, fontSize: 11, bold: true, color: CYAN_500 });
  drawShopPin(s, 8.5, 3.5, 0.7);
  drawShopPin(s, 9.2, 3.85, 0.7);
  drawShopPin(s, 10.7, 4.2, 0.7);
  drawShopPin(s, 11.3, 4.6, 0.7);
  drawShopPin(s, 10.9, 5.0, 0.7);

  drawFooter(s, 3, TOTAL);
}

// ============================================================
// SLIDE 4 — BUSINESS
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
    fontFace: FONT_H, fontSize: 32, bold: true, color: SLATE_900_TXT,
  });
  s.addText("Every street ranked Gold / Silver / Bronze from real OpenStreetMap data.", {
    x: 0.7, y: 1.85, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 14, italic: true, color: SLATE_500,
  });

  // Left — dark map mock with tier polylines + markers
  s.addShape("roundRect", {
    x: 0.7, y: 2.6, w: 7.5, h: 3.7,
    fill: { color: SLATE_950 }, line: { color: SLATE_700, width: 0.5 },
    rectRadius: 0.1,
  });
  s.addShape("ellipse", {
    x: 1.7, y: 3.0, w: 5.5, h: 3.1,
    fill: { color: AMBER_500, transparency: 92 },
    line: { color: AMBER_500, width: 1, transparency: 50 },
  });
  drawTierLine(s, 1.5, 3.5, 5.5, "gold");
  drawTierLine(s, 1.5, 4.2, 4.5, "silver");
  drawTierLine(s, 2.5, 4.9, 4.0, "bronze");
  drawTierLine(s, 2.0, 5.55, 3.5, "gold");
  drawRecStar(s, 3.0, 3.25, "1", 1.0);
  drawRecStar(s, 4.3, 5.30, "2", 0.85);
  drawCompetitorPin(s, 2.3, 3.4, 0.9);
  drawCompetitorPin(s, 5.5, 3.4, 0.9);
  drawCompetitorPin(s, 4.8, 4.1, 0.9);
  drawCompetitorPin(s, 6.0, 4.8, 0.9);

  // Right — tier explanation
  const xR = 8.5;
  s.addText("HOW IT RANKS", {
    x: xR, y: 2.6, w: 4.2, h: 0.3,
    fontFace: FONT_H, fontSize: 11, bold: true, color: AMBER_500, charSpacing: 6,
  });
  const tiers = [
    { tier: "gold",   score: "≥ 160",   line: "Prime location.  Prioritise." },
    { tier: "silver", score: "110-159", line: "Viable backup.  Watch competition." },
    { tier: "bronze", score: "< 110",   line: "Too quiet or saturated. Skip." },
  ];
  tiers.forEach((t, i) => {
    const y = 3.0 + i * 1.05;
    drawTierPill(s, xR, y, 1.1, 0.35, t.tier);
    s.addText("score " + t.score, {
      x: xR + 1.25, y: y - 0.02, w: 2.5, h: 0.35,
      fontFace: FONT_B, fontSize: 12, italic: true, color: SLATE_700, valign: "middle",
    });
    s.addText(t.line, {
      x: xR, y: y + 0.42, w: 4.2, h: 0.5,
      fontFace: FONT_B, fontSize: 12, color: SLATE_900_TXT,
    });
  });

  drawFooter(s, 4, TOTAL);
}

// ============================================================
// SLIDE 5 — AGENT HUB
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
    fontFace: FONT_H, fontSize: 32, bold: true, color: SLATE_900_TXT,
  });
  s.addText("Manage zones, properties and personas. Automate workflows with i-Case.", {
    x: 0.7, y: 1.85, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 14, italic: true, color: SLATE_500,
  });

  // Left — five views
  const views = ["Dashboard", "Areas (Zones)", "Properties", "Common Projects", "Chat"];
  s.addText("FIVE WORKSPACE VIEWS", {
    x: 0.7, y: 2.6, w: 5, h: 0.3,
    fontFace: FONT_H, fontSize: 11, bold: true, color: CYAN_500, charSpacing: 4,
  });
  views.forEach((v, i) => {
    const y = 3.0 + i * 0.52;
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
      fontFace: FONT_H, fontSize: 17, bold: true, color: SLATE_900_TXT, valign: "middle",
    });
  });

  // Right — i-Case node graph
  s.addShape("roundRect", {
    x: 6.5, y: 2.6, w: 6.2, h: 3.7,
    fill: { color: SLATE_950 }, line: { color: SLATE_700, width: 0.5 },
    rectRadius: 0.12,
  });
  s.addText("FLAGSHIP  ·  i-Case Workspace", {
    x: 6.7, y: 2.75, w: 6, h: 0.3,
    fontFace: FONT_H, fontSize: 10, bold: true, color: CYAN_400, charSpacing: 6,
  });

  const nodeY = 4.2;
  const nodes = [
    { x: 6.85, y: nodeY,        label: "Zone",   color: AMBER_500,   sub: "Dubai Marina" },
    { x: 8.85, y: nodeY - 0.5,  label: "Source", color: EMERALD_500, sub: "Property Finder" },
    { x: 10.85, y: nodeY,       label: "Tool",   color: CYAN_500,    sub: "Compare" },
  ];
  s.addShape("line", { x: 7.85, y: nodeY + 0.4, w: 1.0, h: -0.45, line: { color: CYAN_400, width: 2 } });
  s.addShape("line", { x: 9.85, y: nodeY - 0.1, w: 1.0, h: 0.45,  line: { color: CYAN_400, width: 2 } });

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

  // AI chat bubble
  s.addShape("roundRect", {
    x: 6.85, y: 5.4, w: 5.7, h: 0.85,
    fill: { color: SLATE_900 }, line: { color: CYAN_500, width: 1 },
    rectRadius: 0.08,
  });
  drawAiOrb(s, 7.25, 5.82, 0.22);
  s.addText("\"Add a 1.5 km zone in JBR and run a price-compare.\"", {
    x: 7.65, y: 5.45, w: 4.7, h: 0.4,
    fontFace: FONT_B, fontSize: 11, italic: true, color: SLATE_200,
  });
  s.addText("→  3 actions executed automatically", {
    x: 7.65, y: 5.85, w: 4.7, h: 0.4,
    fontFace: FONT_H, fontSize: 10, bold: true, color: CYAN_400,
  });

  drawFooter(s, 5, TOTAL);
}

// ============================================================
// SLIDE 6 — STREET EVALUATION LOGIC
// ============================================================
{
  const s = pres.addSlide();
  s.background = { color: WHITE };

  s.addText("UNDER THE HOOD", {
    x: 0.7, y: 0.5, w: 8, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color: AMBER_500, charSpacing: 8,
  });
  s.addText("How a street gets its score.", {
    x: 0.7, y: 0.95, w: 12, h: 0.85,
    fontFace: FONT_H, fontSize: 32, bold: true, color: SLATE_900_TXT,
  });
  s.addText("Pure JavaScript math. No AI. 100% reproducible.", {
    x: 0.7, y: 1.85, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 14, italic: true, color: SLATE_500,
  });

  // LEFT — the formula in a code-style block
  s.addShape("roundRect", {
    x: 0.7, y: 2.5, w: 7.0, h: 3.5,
    fill: { color: SLATE_950 }, line: { type: "none" },
    rectRadius: 0.12,
  });
  s.addText("THE FORMULA", {
    x: 0.95, y: 2.65, w: 6, h: 0.3,
    fontFace: FONT_H, fontSize: 10, bold: true, color: AMBER_400, charSpacing: 6,
  });

  const formulaLines = [
    { txt: "score = 100",                                   color: WHITE },
    { txt: "      −  (competitors × 18)",                    color: RED_500 },
    { txt: "      +  (variety × 2)",                         color: SLATE_200 },
    { txt: "      +  min(density, 30) × 1.5",                color: SLATE_200 },
    { txt: "      +  transit bonus       (up to +45)",        color: CYAN_400 },
    { txt: "      +  anchor bonus        (up to +48)",        color: PURPLE_500 },
    { txt: "      +  residential bonus   (up to +25)",        color: EMERALD_400 },
    { txt: "      +  road-class bonus    (−12 to +25)",       color: AMBER_400 },
  ];
  formulaLines.forEach((l, i) => {
    s.addText(l.txt, {
      x: 0.95, y: 3.0 + i * 0.34, w: 6.6, h: 0.32,
      fontFace: "Consolas", fontSize: 14, bold: i === 0, color: l.color,
    });
  });

  // RIGHT — what each input means
  s.addText("WHAT DRIVES THE SCORE", {
    x: 8.0, y: 2.5, w: 4.7, h: 0.3,
    fontFace: FONT_H, fontSize: 10, bold: true, color: AMBER_500, charSpacing: 6,
  });

  const inputs = [
    { color: RED_500,      label: "Competitors",    note: "saturation penalty" },
    { color: SLATE_500,    label: "Variety",        note: "diversity of nearby shops" },
    { color: SLATE_500,    label: "Density",        note: "how active the street is" },
    { color: CYAN_500,     label: "Transit",        note: "bus / metro stops" },
    { color: PURPLE_500,   label: "Anchors",        note: "mall / school / hospital / mosque / park" },
    { color: EMERALD_500,  label: "Residential",    note: "catchment population" },
    { color: AMBER_500,    label: "Road class",     note: "primary / pedestrian wins" },
  ];
  inputs.forEach((it, i) => {
    const y = 2.85 + i * 0.4;
    s.addShape("rect", {
      x: 8.0, y: y + 0.07, w: 0.18, h: 0.18,
      fill: { color: it.color }, line: { type: "none" },
    });
    s.addText(it.label, {
      x: 8.25, y, w: 1.5, h: 0.32,
      fontFace: FONT_H, fontSize: 12, bold: true, color: SLATE_900_TXT, valign: "middle",
    });
    s.addText(it.note, {
      x: 9.75, y, w: 3.0, h: 0.32,
      fontFace: FONT_B, fontSize: 11, italic: true, color: SLATE_500, valign: "middle",
    });
  });

  // BOTTOM — tier thresholds as pills
  const yBot = 6.2;
  s.addText("CLASSIFY:", {
    x: 0.7, y: yBot, w: 1.5, h: 0.4,
    fontFace: FONT_H, fontSize: 11, bold: true, color: SLATE_500, valign: "middle", charSpacing: 4,
  });
  drawTierPill(s, 2.2, yBot + 0.05, 1.1, 0.35, "gold");
  s.addText("≥ 160", {
    x: 3.4, y: yBot, w: 1.5, h: 0.4,
    fontFace: FONT_H, fontSize: 13, bold: true, color: SLATE_900_TXT, valign: "middle",
  });
  drawTierPill(s, 5.0, yBot + 0.05, 1.1, 0.35, "silver");
  s.addText("110 - 159", {
    x: 6.2, y: yBot, w: 1.7, h: 0.4,
    fontFace: FONT_H, fontSize: 13, bold: true, color: SLATE_900_TXT, valign: "middle",
  });
  drawTierPill(s, 8.0, yBot + 0.05, 1.1, 0.35, "bronze");
  s.addText("< 110", {
    x: 9.2, y: yBot, w: 1.5, h: 0.4,
    fontFace: FONT_H, fontSize: 13, bold: true, color: SLATE_900_TXT, valign: "middle",
  });

  drawFooter(s, 6, TOTAL);
}

// ============================================================
// SLIDE 7 — REQUEST FLOW
// ============================================================
{
  const s = pres.addSlide();
  drawDarkBackdrop(s);

  s.addText("UNDER THE HOOD", {
    x: 0.7, y: 0.5, w: 8, h: 0.4,
    fontFace: FONT_H, fontSize: 12, bold: true, color: AMBER_400, charSpacing: 8,
  });
  s.addText("How a request flows.", {
    x: 0.7, y: 0.95, w: 12, h: 0.85,
    fontFace: FONT_H, fontSize: 34, bold: true, color: WHITE,
  });
  s.addText("From a single click to a ranked map in under 30 seconds.", {
    x: 0.7, y: 1.85, w: 12, h: 0.4,
    fontFace: FONT_B, fontSize: 14, italic: true, color: SLATE_400,
  });

  // Five-step horizontal flow
  const steps = [
    { label: "USER",     title: "Choose",         body: "Location, category, radius.",         color: AMBER_500   },
    { label: "OSM",      title: "Fetch",          body: "Overpass + Nominatim return live data.", color: EMERALD_500 },
    { label: "MATH",     title: "Score",          body: "Formula ranks every street.",          color: SLATE_400   },
    { label: "LLM",      title: "Narrate",        body: "AI writes the report.",                color: CYAN_500    },
    { label: "RESULT",   title: "Map + Report",   body: "Shown back to the user.",              color: PURPLE_500  },
  ];

  const yTop = 2.9;
  const xStart = 0.7;
  const boxW = 2.25;
  const gap = 0.18;

  steps.forEach((st, i) => {
    const x = xStart + i * (boxW + gap);

    // Card
    s.addShape("roundRect", {
      x, y: yTop, w: boxW, h: 3.0,
      fill: { color: SLATE_900 }, line: { color: st.color, width: 1.5 },
      rectRadius: 0.12,
    });

    // Number circle
    s.addShape("ellipse", {
      x: x + boxW / 2 - 0.45, y: yTop + 0.3, w: 0.9, h: 0.9,
      fill: { color: st.color }, line: { color: WHITE, width: 2 },
    });
    s.addText((i + 1).toString(), {
      x: x + boxW / 2 - 0.45, y: yTop + 0.3, w: 0.9, h: 0.9,
      fontFace: FONT_H, fontSize: 28, bold: true, color: WHITE,
      align: "center", valign: "middle",
    });

    // Label
    s.addText(st.label, {
      x, y: yTop + 1.35, w: boxW, h: 0.35,
      fontFace: FONT_H, fontSize: 11, bold: true, color: st.color,
      align: "center", charSpacing: 4,
    });
    // Title
    s.addText(st.title, {
      x, y: yTop + 1.7, w: boxW, h: 0.5,
      fontFace: FONT_H, fontSize: 22, bold: true, color: WHITE, align: "center",
    });
    // Body
    s.addText(st.body, {
      x: x + 0.15, y: yTop + 2.25, w: boxW - 0.3, h: 0.7,
      fontFace: FONT_B, fontSize: 11, color: SLATE_200, align: "center",
    });

    // Arrow connector to next step
    if (i < steps.length - 1) {
      const ax = x + boxW + 0.005;
      const ay = yTop + 0.75;
      s.addShape("rightTriangle", {
        x: ax, y: ay - 0.07, w: 0.16, h: 0.3,
        fill: { color: AMBER_400 }, line: { type: "none" },
        rotate: 30,
      });
      // Simple arrow using line + triangle
      s.addShape("line", {
        x: ax - 0.02, y: ay + 0.08, w: gap - 0.05, h: 0,
        line: { color: AMBER_400, width: 2 },
      });
      s.addShape("triangle", {
        x: ax + gap - 0.12, y: ay - 0.02, w: 0.18, h: 0.2,
        fill: { color: AMBER_400 }, line: { type: "none" },
        rotate: 90,
      });
    }
  });

  // Bottom callout
  s.addShape("roundRect", {
    x: 0.7, y: 6.2, w: 12.0, h: 0.7,
    fill: { color: AMBER_500 }, line: { type: "none" }, rectRadius: 0.1,
  });
  s.addText("Math decides the ranking. The LLM only writes the story.", {
    x: 0.7, y: 6.2, w: 12.0, h: 0.7,
    fontFace: FONT_H, fontSize: 15, bold: true, italic: true, color: SLATE_950,
    align: "center", valign: "middle",
  });

  drawFooter(s, 7, TOTAL);
}

// ============================================================
// SLIDE 8 — TECH STACK
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
    fontFace: FONT_H, fontSize: 32, bold: true, color: SLATE_900_TXT,
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
      fontFace: FONT_H, fontSize: 17, bold: true, color: SLATE_900_TXT, valign: "middle",
    });
  });

  // Right side — cost + APIs panels
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

  drawFooter(s, 8, TOTAL);
}

// ============================================================
// SLIDE 9 — CLOSING
// ============================================================
{
  const s = pres.addSlide();
  drawDarkBackdrop(s);

  drawAiOrb(s, 6.66, 3.4, 1.4);

  s.addText("A-Box", {
    x: 0.7, y: 5.35, w: 12, h: 1.0,
    fontFace: FONT_H, fontSize: 56, bold: true, color: WHITE, align: "center",
  });
  s.addText("Property  ·  Business  ·  Agent Hub", {
    x: 0.7, y: 6.25, w: 12, h: 0.5,
    fontFace: FONT_B, fontSize: 16, italic: true, color: AMBER_400, align: "center", charSpacing: 4,
  });
  s.addText("Thank you  ·  Questions?", {
    x: 0.7, y: 0.5, w: 12, h: 0.5,
    fontFace: FONT_H, fontSize: 14, bold: true, color: SLATE_400, align: "center", charSpacing: 6,
  });
}

// ===== Save =====
pres.writeFile({ fileName: "A-Box.pptx" }).then((fn) => {
  console.log("Wrote: " + fn);
});
