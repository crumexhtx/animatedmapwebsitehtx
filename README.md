# MapsToIt

U.S. city data explorer for people researching where to live before they move.

Live domain: [mapstoit.com](https://mapstoit.com)

## What it is

MapsToIt presents cost of living, income, housing, safety, climate, and commute data per city, with an interactive MapLibre + deck.gl map as the browsing layer. City and state pages are statically generated for SEO.

## Stack

- Next.js App Router (static generation via `generateStaticParams`)
- TypeScript
- MapLibre GL + deck.gl
- Curated JSON catalog checked into `data/catalog/`

## Routes

| Path | Page |
| --- | --- |
| `/` | Homepage + map entry |
| `/cities` | Full city index (filterable by state) |
| `/cities/[state]/[city]` | City profile (core SEO unit) |
| `/states/[state]` | State overview |
| `/methodology` | Data sources & publishing rules |
| `/about`, `/contact` | Trust pages |

Compare pages (`/compare/...`) are deferred until after the core city catalog is live.

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
