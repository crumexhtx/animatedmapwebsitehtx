# MapsToIt

U.S. city data explorer for people researching where to live before they move.

Live domain: [mapstoit.com](https://mapstoit.com)

## What it is

MapsToIt presents cost of living, income, housing, safety, climate, and commute data per city, with an interactive MapLibre map as the browsing layer. City and state pages are statically generated for SEO.

## Stack

- Next.js App Router (static generation via `generateStaticParams`)
- TypeScript
- MapLibre GL (city points as native circle layers)
- Curated JSON catalog checked into `data/catalog/`

## Routes

| Path | Page |
| --- | --- |
| `/` | Homepage + map entry |
| `/cities` | Full city index (filterable by state) |
| `/cities/[state]/[city]` | City profile (core SEO unit) |
| `/states/[state]` | State overview |
| `/cities/rankings` | Cheapest / most expensive COL bar charts |
| `/cities/cost-vs-safety` | Cost vs violent crime scatter plot |
| `/cities/state-costs` | State housing-cost choropleth map |
| `/compare` | Side-by-side city comparison + radar |
| `/methodology` | Data sources & publishing rules |
| `/about`, `/contact` | Trust pages |

## Catalog workflow

```bash
npm run generate-catalog   # build curated seed → data/raw/cities-seed.json
npm run build-catalog      # publish cities/states/index under data/catalog/
npm run validate-catalog   # fail if any city is missing required fields
```

Live API enrichment stubs (wire later):

```bash
npm run enrich:census
npm run enrich:bls
npm run enrich:crime
npm run enrich:climate
```

`npm run build` runs validation before `next build`.

## Development

```bash
npm install
npm run generate-catalog && npm run build-catalog
npm run dev
```

Set `NEXT_PUBLIC_SITE_URL` for canonical URLs / sitemap (defaults to `https://mapstoit.com`).

### Map basemap

City maps use CARTO Voyager raster tiles when `NEXT_CARTO_API_KEY` is set (free key at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey)). Without a key, maps automatically fall back to OpenStreetMap tiles so visitors never see CARTO’s “API KEY REQUIRED” watermark.

Add the key in Vercel → Project → Settings → Environment Variables for Production (and Preview if you test maps there).
