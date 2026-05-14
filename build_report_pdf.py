"""
Build the Geo Intelligence MVP manager-briefing PDF.
Run: python build_report_pdf.py
Output: Geo_Intelligence_MVP_Report.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY

OUTPUT = "Geo_Intelligence_MVP_Report.pdf"

# ---------- Styles ----------
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "TitleX", parent=styles["Title"],
    fontName="Helvetica-Bold", fontSize=22, leading=26,
    textColor=colors.HexColor("#1f2937"), spaceAfter=6,
)
subtitle_style = ParagraphStyle(
    "SubtitleX", parent=styles["Normal"],
    fontName="Helvetica-Oblique", fontSize=11, leading=14,
    textColor=colors.HexColor("#6b7280"), spaceAfter=18,
)
h1_style = ParagraphStyle(
    "H1X", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=16, leading=20,
    textColor=colors.HexColor("#111827"),
    spaceBefore=14, spaceAfter=8,
)
h2_style = ParagraphStyle(
    "H2X", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=13, leading=16,
    textColor=colors.HexColor("#1f2937"),
    spaceBefore=10, spaceAfter=6,
)
h3_style = ParagraphStyle(
    "H3X", parent=styles["Heading3"],
    fontName="Helvetica-Bold", fontSize=11, leading=14,
    textColor=colors.HexColor("#374151"),
    spaceBefore=8, spaceAfter=4,
)
body_style = ParagraphStyle(
    "BodyX", parent=styles["BodyText"],
    fontName="Helvetica", fontSize=10.5, leading=15,
    textColor=colors.HexColor("#1f2937"),
    alignment=TA_JUSTIFY, spaceAfter=6,
)
bullet_style = ParagraphStyle(
    "BulletX", parent=body_style,
    leftIndent=14, bulletIndent=2, spaceAfter=3,
)
code_style = ParagraphStyle(
    "CodeX", parent=styles["Code"],
    fontName="Courier", fontSize=9.5, leading=12,
    textColor=colors.HexColor("#111827"),
    backColor=colors.HexColor("#f3f4f6"),
    leftIndent=8, rightIndent=8, spaceBefore=4, spaceAfter=8,
    borderPadding=6,
)
callout_style = ParagraphStyle(
    "CalloutX", parent=body_style,
    backColor=colors.HexColor("#fef3c7"),
    borderColor=colors.HexColor("#f59e0b"),
    borderWidth=0.5, borderPadding=8,
    spaceBefore=6, spaceAfter=10,
)

# ---------- Helpers ----------
def P(text, style=body_style):
    return Paragraph(text, style)

def bullets(items):
    return [Paragraph(f"• {x}", bullet_style) for x in items]

def styled_table(data, col_widths, header=True):
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    cmds = [
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1f2937")),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1),
            [colors.white, colors.HexColor("#f9fafb")]),
        ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d5db")),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e5e7eb")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        cmds += [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ]
    t.setStyle(TableStyle(cmds))
    return t

def wrap_table_cells(rows):
    """Wrap each cell string in a Paragraph so long text wraps inside the table."""
    style = ParagraphStyle("Cell", parent=body_style, fontSize=9.5, leading=12, alignment=TA_LEFT, spaceAfter=0)
    header_style = ParagraphStyle("CellH", parent=style, textColor=colors.white, fontName="Helvetica-Bold")
    out = []
    for i, row in enumerate(rows):
        s = header_style if i == 0 else style
        out.append([Paragraph(str(c), s) for c in row])
    return out

# ---------- Document ----------
doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=2 * cm, rightMargin=2 * cm,
    topMargin=2 * cm, bottomMargin=2 * cm,
    title="Geo Intelligence MVP — Manager Briefing",
    author="Geo Intelligence MVP",
)

story = []

# ---------- Cover ----------
story.append(P("Geo Intelligence MVP", title_style))
story.append(P("Manager Briefing Report &nbsp;|&nbsp; Architecture, AI Usage, OSM Logic and Recommendations", subtitle_style))

story.append(P(
    "This report explains the Geo Intelligence MVP in plain language: what it does, the technology stack "
    "behind it, how the LLMs are actually used, how OpenStreetMap (OSM) data drives the analysis, and how "
    "the code decides which streets are Gold, Silver or Bronze for a chosen business activity. "
    "It closes with a recommendation on which paid LLMs and APIs to adopt to move from a working MVP to "
    "a production-grade decision tool.",
    body_style,
))

# ---------- Section 1 — What the App Does ----------
story.append(P("1. What the App Does", h1_style))
story.append(P(
    "A web application that helps an entrepreneur decide <b>where to open a shop</b>. The user supplies "
    "their city (auto-detected), a business category and a search radius. The app then:",
    body_style,
))
story.extend(bullets([
    "Pulls every nearby business, transit stop, anchor POI and residential building from OpenStreetMap.",
    "Groups businesses by street and scores each street for the chosen category.",
    "Classifies each street as <b>Gold</b>, <b>Silver</b> or <b>Bronze</b>.",
    "Shows the results on an interactive map and writes a market-analysis report.",
    "Suggests reputable property portals where the user can browse real shop listings for rent or sale.",
]))

# ---------- Section 2 — Technology Stack ----------
story.append(P("2. Technology Stack", h1_style))
stack_rows = [
    ["Layer", "Technology", "Why it was chosen"],
    ["Frontend", "Next.js 14 (App Router) + React 18", "Single framework for UI + API; fast SSR; free hosting on Vercel."],
    ["Styling", "Tailwind CSS", "Rapid, consistent UI without writing CSS files."],
    ["Maps", "Leaflet + react-leaflet", "Free, no API key; works directly with OSM tiles."],
    ["Backend", "Next.js API Routes (Node.js)", "Lives in the same project as the frontend — no separate server needed."],
    ["Geographic data", "OpenStreetMap (Overpass + Nominatim)", "Free, global coverage, no API key required."],
    ["AI layer", "OpenRouter free LLMs → local Ollama → template fallback", "Always returns a response, even if every AI provider is down."],
]
story.append(styled_table(wrap_table_cells(stack_rows), col_widths=[3.0 * cm, 5.5 * cm, 8.5 * cm]))

# ---------- Section 3 — LLMs Used and Their Purpose ----------
story.append(PageBreak())
story.append(P("3. LLMs Used in the App and Their Real Purpose", h1_style))
story.append(P(
    "The app uses a <b>chain of free LLMs</b> through OpenRouter, falling back automatically when a model is "
    "rate-limited or unavailable. If every cloud model fails, a local Ollama instance is tried, and finally "
    "a deterministic template is used so the app always produces output.",
    body_style,
))

llm_chain_rows = [
    ["Model", "Role in the chain"],
    ["openai/gpt-oss-120b:free", "Primary — highest-quality writer, tried first."],
    ["openai/gpt-oss-20b:free", "Fast fallback when the 120b model is busy."],
    ["minimax/minimax-m2.5:free", "Alternate provider for diversity."],
    ["meta-llama/llama-3.3-70b-instruct:free", "Last-resort backup."],
    ["llama3.2 (local Ollama)", "Offline fallback if all cloud LLMs fail."],
    ["Deterministic template", "Final safety net — guarantees a response."],
]
story.append(styled_table(wrap_table_cells(llm_chain_rows), col_widths=[6.5 * cm, 10.5 * cm]))

story.append(P("What each LLM call is actually used for", h2_style))
story.append(P(
    "The LLM <b>never decides the ranking</b>. It only writes language <i>after</i> our code has done the math. "
    "Five distinct LLM calls are made, each for a different purpose:",
    body_style,
))

llm_calls = [
    ["#", "Call", "Purpose"],
    ["1", "explainStreet", "Writes a 3-sentence note for each Gold/Silver/Bronze street, justifying its tier using the real numbers (competitors, transit, anchors, density)."],
    ["2", "generateOverallReport", "Produces the 4-section executive report — Area Analysis, Market Insights, Competitor Analysis, Final Recommendation — in a Big-4 consulting tone."],
    ["3", "generateRecommendationReasoning", "Writes a 1-paragraph justification for each of the 3 recommended map pins, explaining why that exact spot was picked."],
    ["4", "generateCompetitorInsights", "Explains why existing competitors of the same category are succeeding in this area (local culture, footfall, demographics)."],
    ["5", "findPropertyAgencies", "Returns the top 4 reputable real-estate portals for the user's city, with deep-link search URLs filtered to commercial/retail listings."],
]
story.append(styled_table(wrap_table_cells(llm_calls), col_widths=[0.8 * cm, 5.0 * cm, 11.2 * cm]))

# ---------- Section 4 — Is OSM an API? ----------
story.append(P("4. Is OSM an API?", h1_style))
story.append(P(
    "<b>OpenStreetMap (OSM) is the database, not the API.</b> Think of it as a Wikipedia for maps — "
    "volunteers maintain global data on roads, shops, parks, transit stops, hospitals, and more. "
    "To <i>read</i> OSM data we use three free APIs built on top of it:",
    body_style,
))
osm_api_rows = [
    ["API", "What it does", "Used in our app for"],
    ["Overpass API", "Runs queries against the OSM database (e.g. \"every café within 3 km of this point\").", "Finding competitors, all commercial businesses, street shapes, transit, anchors, residential buildings."],
    ["Nominatim API", "Reverse geocoding — converts a lat/lon to a street/address and vice versa.", "Resolving the street name of a business when its OSM tag is missing."],
    ["OSM Tile Server", "Serves the actual map background images shown in Leaflet.", "The grey street map you see behind the colored Gold/Silver/Bronze lines."],
]
story.append(styled_table(wrap_table_cells(osm_api_rows), col_widths=[3.2 * cm, 6.5 * cm, 7.3 * cm]))
story.append(P(
    "<b>Cost:</b> $0 — no API keys, no billing. "
    "<b>Limit:</b> These free services are shared globally and can be slow or rate-limited at peak times "
    "(10–30 seconds for a first query is normal).",
    callout_style,
))

# ---------- Section 5 — OSM-Powered Core Logic ----------
story.append(PageBreak())
story.append(P("5. The OSM-Powered Core — Logic of Each Part", h1_style))
story.append(P(
    "The whole intelligence of the app comes from <b>four OSM queries</b> plus our own scoring code. "
    "Each part has one clear job:",
    body_style,
))

story.append(P("Part A — Find direct competitors", h3_style))
story.append(P(
    "<i>File:</i> lib/overpass.js → fetchCompetitors(). Maps the chosen category (e.g. coffee_shop) to OSM tags "
    "(amenity=cafe) and asks Overpass for every matching node inside the radius. Returns "
    "{id, name, lat, lon}.",
    body_style,
))

story.append(P("Part B — Find all commercial activity", h3_style))
story.append(P(
    "<i>File:</i> lib/overpass.js → fetchCommercialActivity(). Asks Overpass for every shop, café, restaurant, "
    "pharmacy and salon in the radius (not only the user's category). Drives the <b>density</b> and "
    "<b>variety</b> metrics used in the score.",
    body_style,
))

story.append(P("Part C — Find street shapes", h3_style))
story.append(P(
    "<i>File:</i> lib/overpass.js → fetchStreetGeometries(). Pulls every road polyline plus its road class "
    "(primary, secondary, residential, pedestrian…). The class feeds the road-class bonus in the score and "
    "the polyline lets us draw colored Gold/Silver/Bronze street lines on the map.",
    body_style,
))

story.append(P("Part D — Find footfall drivers (enrichment)", h3_style))
story.append(P(
    "<i>File:</i> lib/enrichment.js. One Overpass query collects three datasets at once:",
    body_style,
))
story.extend(bullets([
    "<b>Transit stops</b> — bus stops, railway stations, tram stops.",
    "<b>Anchor POIs</b> — malls, schools, hospitals, hotels, mosques, parks.",
    "<b>Residential buildings</b> — proxy for the catchment population nearby.",
]))

story.append(P("Part E — Group businesses by street name", h3_style))
story.append(P(
    "<i>File:</i> lib/streets.js + lib/nominatim.js. For each business, first try its <i>addr:street</i> OSM "
    "tag. If missing, call Nominatim reverse geocoding (capped at 25 lookups per request to respect rate "
    "limits). Bucket every business under its street.",
    body_style,
))

story.append(P("Part F — Score each street (no AI involved)", h3_style))
story.append(P(
    "<i>File:</i> lib/scoring.js. Plain JavaScript math:",
    body_style,
))
story.append(Paragraph(
    "score = 100<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;− (competitors × 18)<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (variety × 2)<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ min(density, 30) × 1.5<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ transit bonus&nbsp;&nbsp;&nbsp;&nbsp;(up to +45)<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ anchor bonus&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(up to +48)<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ residential bonus&nbsp;(up to +25)<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ road-class bonus&nbsp;&nbsp;(−12 to +25)",
    code_style,
))
story.append(P(
    "Classification: <b>≥160 = Gold</b>, <b>110–159 = Silver</b>, <b>&lt;110 = Bronze</b>.",
    body_style,
))

story.append(P("Part G — Pick the exact pin location", h3_style))
story.append(P(
    "<i>File:</i> app/api/analyze/route.js → pickBestSpot(). Walks along each winning street's polyline, "
    "samples points, and at each point computes a mini-score: <b>positive</b> for nearby anchors (weighted by "
    "category — e.g. mosques weigh more for a men's salon, hospitals for a pharmacy, malls for clothing) and "
    "<b>negative</b> if a competitor is too close. The 3 final pins are forced to be at least 250 m apart so "
    "they're not duplicates.",
    body_style,
))

story.append(P("Part H — Orchestrate everything", h3_style))
story.append(P(
    "<i>File:</i> app/api/analyze/route.js. Fires the 4 OSM queries + 1 LLM call <b>in parallel</b>, groups "
    "businesses by street, runs the scoring formula, sorts and filters, picks the top 3 pins, then fires "
    "<b>4 more LLM calls in parallel</b> for the narrative. One JSON response is returned to the frontend.",
    body_style,
))

# ---------- Section 6 — How a Street Becomes Gold / Silver / Bronze ----------
story.append(PageBreak())
story.append(P("6. How a Street Becomes Gold, Silver or Bronze — Step by Step", h1_style))

steps = [
    ("Step 1", "User input", "User supplies location (auto from IP), business category and radius (2 / 3 / 5 km)."),
    ("Step 2", "Four OSM queries in parallel",
        "(1) all same-category competitors, (2) all commercial businesses, (3) every street polyline + road class, "
        "(4) transit stops, anchor POIs and residential buildings."),
    ("Step 3", "Group businesses by street",
        "Use the addr:street OSM tag where available; fall back to Nominatim reverse geocoding for the rest."),
    ("Step 4", "Count six things per street",
        "Competitors on-street, variety of commercial types, density, transit within 300 m, anchors within 250 m, "
        "residential buildings within 250 m. Also read the road class."),
    ("Step 5", "Apply the scoring formula",
        "100 baseline, minus competitor penalty, plus variety / density / transit / anchor / residential / road-class bonuses."),
    ("Step 6", "Classify",
        "≥160 = Gold, 110–159 = Silver, <110 = Bronze."),
    ("Step 7", "Sort and filter",
        "High to low score. Drop streets with fewer than 2 businesses, and drop unresolved \"Area lat,lon\" buckets."),
    ("Step 8", "Pick the exact pin",
        "Walk the winning street's polyline, score sample points by anchor proximity and competitor distance, "
        "force 250 m separation between the 3 pins."),
    ("Step 9", "Narrate with LLMs",
        "Five parallel LLM calls write the per-street notes, executive report, recommendation reasoning, "
        "competitor insights and property portals. The AI cannot change the ranking — it only describes it."),
]
step_rows = [["Step", "Stage", "What happens"]] + [[s, t, d] for s, t, d in steps]
story.append(styled_table(wrap_table_cells(step_rows), col_widths=[1.6 * cm, 4.4 * cm, 11.0 * cm]))

story.append(P(
    "<b>The mental model in one line:</b> the code measures the street, the LLM describes the measurement.",
    callout_style,
))

# ---------- Section 7 — Available Shops per Activity & City Regulations ----------
story.append(P("7. Showing Available Shops per Activity (and City Regulations)", h1_style))
story.append(P(
    "Scraping live shop-for-rent or shop-for-sale listings would breach the terms of service of the real-estate "
    "portals. To stay compliant, the app asks the LLM for the <b>top 4 reputable property portals</b> serving "
    "the user's city (e.g. Property Finder, Bayut, Rightmove, Zillow — depending on the city), with a "
    "<b>deep-link search URL</b> already filtered to commercial / retail / shop listings for both rent and sale. "
    "The user clicks through to the regulated portal itself, so the listings always comply with the city's "
    "property regulations and rules — because they live on the regulated portal, not inside our app.",
    body_style,
))

# ---------- Section 8 — Recommendation ----------
story.append(PageBreak())
story.append(P("8. Recommendation — Moving from MVP to Production", h1_style))
story.append(P(
    "The MVP works end-to-end on free services and validates the concept. To turn it into a tool a business "
    "would <b>pay for and trust with real lease decisions</b>, the next investments should be:",
    body_style,
))

story.append(P("8.1  Paid LLMs (for analysis quality)", h2_style))
story.extend(bullets([
    "<b>GPT-5 / GPT-5-pro</b> (OpenAI) or <b>Claude Opus 4.7</b> (Anthropic) — far more accurate market reasoning, citation discipline, and consistency than the free OpenRouter models.",
    "<b>Google Gemini 2.5 Pro</b> — strong at structured-data extraction from real-estate listings.",
]))

story.append(P("8.2  Paid Location & Footfall APIs (real data, not just OSM)", h2_style))
story.extend(bullets([
    "<b>Google Places API + Google Maps Platform</b> — accurate POIs, ratings, opening hours, popular-times curves.",
    "<b>Foursquare Places API</b> — high-quality venue data and visit-pattern analytics.",
    "<b>SafeGraph / Placer.ai</b> — real hourly foot-traffic counts by demographic — the same data used by major retailers.",
    "<b>Mapbox Movement / Veraset</b> — anonymised mobility data for trade-area analysis.",
]))

story.append(P("8.3  Real Property Listing Feeds", h2_style))
story.extend(bullets([
    "<b>Property Finder API / Bayut API</b> (Middle East), <b>Zillow / Redfin</b> (US), <b>Rightmove / Zoopla</b> (UK) — bring live shop-for-rent and for-sale inventory <i>inside</i> our app.",
    "<b>Reonomy</b> or <b>CoStar</b> — commercial real-estate intelligence: rent benchmarks, owner data, deal history.",
]))

story.append(P("8.4  Demographics, Income and Spending Power", h2_style))
story.extend(bullets([
    "<b>Esri Business Analyst</b> or <b>CACI Acorn</b> — household income, age, lifestyle segmentation at street-level granularity.",
    "<b>Experian Mosaic</b> — consumer-spend categories per neighbourhood.",
]))

story.append(P("8.5  The Five Elements of a Successful Retail Location", h2_style))
story.append(P(
    "Retail-location success is driven by five elements the MVP currently only <i>approximates</i> via OSM. "
    "Paid APIs measure them directly:",
    body_style,
))
story.extend(bullets([
    "<b>Catchment</b> — who actually lives and works within walking / driving distance.",
    "<b>Footfall</b> — how many people physically pass the shopfront, by hour of day.",
    "<b>Visibility & frontage</b> — line of sight from the road and pedestrian flow.",
    "<b>Anchor pull</b> — proximity to traffic generators (malls, schools, transit hubs).",
    "<b>Competitive gravity</b> — distance to existing same-category players and brand strength.",
]))

# ---------- Bottom line ----------
story.append(P("Bottom Line", h1_style))
story.append(P(
    "The MVP validates the concept at zero cost using OpenStreetMap and free LLMs. To turn it into a "
    "decision-grade product, the highest-leverage upgrade is: a <b>paid LLM</b> (GPT-5 or Claude Opus 4.7) "
    "+ a <b>paid places &amp; footfall API</b> (Google Places + Placer.ai or SafeGraph) + a <b>live property "
    "listing feed</b>. Together they lift the recommendation from \"directionally useful\" to \"genuinely "
    "actionable\" — the threshold a business needs before signing a 5-year lease on the strength of our advice.",
    body_style,
))

# ---------- Build ----------
doc.build(story)
print(f"Wrote: {OUTPUT}")
