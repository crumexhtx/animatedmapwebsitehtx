# MapsToIt

U.S. city data explorer for people researching where to live before they move.

- Live site: [mapstoit.com](https://mapstoit.com)
- Source: [github.com/crumexhtx/animatedmapwebsitehtx](https://github.com/crumexhtx/animatedmapwebsitehtx)

Built by [João Bermudez](https://github.com/crumexhtx).

## What it is

MapsToIt presents cost of living, income, housing, safety, climate, and commute data per city, with an interactive MapLibre map as the browsing layer. City and state pages are statically generated for SEO.

## Architecture

The site is a Next.js App Router app over a **versioned JSON catalog**, not a runtime database. That keeps city pages static, cheap to host, and reviewable in git.

```text
public APIs (Census ACS, BLS LAUS, FBI CDE, NOAA, PEP)
        │
        ▼
enrichment scripts  →  data/raw/enrichments/*.json
        │
        ▼
build-catalog       →  data/catalog/{cities,states,index,national}.json
        │
        ▼
validate-catalog    →  next build (SSG city/state pages)
```

**Why a checked-in catalog.** Incomplete cities are omitted until every required field is present. `npm run build` runs `validate-catalog` first, so a thin profile cannot ship. Source vintage and coverage gaps stay on the page instead of being imputed.

**Runtime split.** Ranking and filtering live in pure functions (`lib/afford.ts`, `lib/match.ts`). Shareable `/afford` and `/compare` URLs are parsed from query params, so the same result can be linked without server state. The map is MapLibre GL circle layers, lazy-loaded on the homepage.

**What stays curated.** Commute minutes, Walk Score, featured flags, neighborhood shortlists, and nearby-city links are companion fields — they are not overwritten by enrichment. See [methodology](https://mapstoit.com/methodology).

### Stack

- Next.js App Router (`generateStaticParams` for city/state pages)
- TypeScript
- MapLibre GL
- Recharts for rankings and compare views
- GitHub Actions (secrets check, lint, unit tests, production build)

## Routes

| Path | Page |
| --- | --- |
| `/` | Homepage + map entry |
| `/cities` | Full city index (filterable by state) |
| `/cities/[state]/[city]` | City profile (core SEO unit) |
| `/states/[state]` | State overview |
| `/afford` | Budget + lifestyle matcher |
| `/cities/rankings` | Cheapest / most expensive COL bar charts |
| `/cities/cost-vs-safety` | Cost vs violent crime scatter plot |
| `/cities/state-costs` | State housing-cost choropleth map |
| `/compare` | Side-by-side city comparison + radar |
| `/methodology` | Data sources & publishing rules |
| `/about`, `/contact` | Trust pages |

## Catalog workflow

```bash
npm run generate-catalog   # curated seed → data/raw/cities-seed.json
npm run build-catalog      # publish cities/states/index under data/catalog/
npm run validate-catalog   # fail if any city is missing required fields
```

Refresh live agency pulls (writes `data/raw/enrichments/`, then re-run `build-catalog`):

```bash
npm run enrich:census
npm run enrich:bls
npm run enrich:crime
npm run enrich:climate
npm run enrich:population-history
npm run enrich:photos
```

`npm run build` runs validation and duplicate-content detection before `next build`.

## Development

```bash
npm install
npm run generate-catalog && npm run build-catalog
npm run dev
```

```bash
npm test    # node:test via tsx (afford/match ranking + snapshot helpers)
npm run lint
```

Set `NEXT_PUBLIC_SITE_URL` for canonical URLs / sitemap (defaults to `https://mapstoit.com`). Copy `.env.example` to `.env.local` for local keys.

### Map basemap

City maps use CARTO Voyager raster tiles when `NEXT_PUBLIC_CARTO_API_KEY` is set (free key at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey)). This is a **browser** key (safe to expose; lock it down with HTTP referrer restrictions in CARTO). Without a key, maps fall back to OpenStreetMap tiles — only suitable as a short-term fallback, not sustained production traffic.

In Vercel: **Project → Settings → Environment Variables** → add `NEXT_PUBLIC_CARTO_API_KEY` for Production (and Preview if you test maps there) → redeploy.

## License

MIT. See [LICENSE](LICENSE).
