# Geo Intelligence MVP

Find the best streets to open a local business. Built from the PRD in
`Geo_Intelligence_MVP_PRD.md`.

## What it does

1. Detects your location from your IP (`ipapi.co`).
2. Lets you pick a business category and a search radius (2 / 3 / 5 km).
3. Queries OpenStreetMap (Overpass API) for nearby businesses.
4. Groups them by street (using OSM `addr:street` tags + Nominatim reverse
   geocoding for the rest).
5. Scores each street with the PRD formula:
   `100 - (competitors * 15) + (variety * 5) + (density * 3)`
6. Classifies into Gold / Silver / Bronze and renders them on a Leaflet map.
7. Generates a short market analysis per street (OpenRouter → Ollama →
   deterministic template fallback).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Optional AI providers

By default the app uses a built-in template explainer so it works offline.
To enable a real LLM, set one of these in `.env.local`:

```
OPENROUTER_API_KEY=sk-or-...
# or run ollama locally — the app auto-detects http://localhost:11434
```

## Stack

| Layer       | Tech                              |
| ----------- | --------------------------------- |
| Frontend    | Next.js 14 (App Router), React 18 |
| Styling     | Tailwind CSS                      |
| Maps        | Leaflet + react-leaflet           |
| Backend     | Next.js API routes (Node.js)      |
| Geodata     | OpenStreetMap                     |
| Places      | Overpass API                      |
| Geocoding   | Nominatim                         |
| AI          | OpenRouter / Ollama / template    |

## Notes

* No API keys are required for the core features — Overpass and Nominatim
  are free public services. Be respectful of their rate limits.
* The Overpass tier is shared and can be slow at peak times. Expect 10–30s
  for a first analysis.
* Reverse-geocoding is capped per request (25 lookups) to stay polite to
  Nominatim — if a business has no `addr:street` tag and falls past the cap,
  it lands in a coarse "Area lat,lon" bucket.
