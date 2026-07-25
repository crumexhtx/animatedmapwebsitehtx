# mapstoit

Interactive MapLibre + deck.gl atlas that maps real geospatial themes onto the [deck.gl gallery layer examples](https://deck.gl/examples).

Live site: [animatedmapwebsitehtx.vercel.app](https://animatedmapwebsitehtx.vercel.app)

## Layer demos (United States)

Figures are **illustrative demo approximations** modeled after public sources — not a live agency feed.

| Dataset | deck.gl layer | Example |
| --- | --- | --- |
| Population density by state | GeoJsonLayer polygons | [polygons](https://deck.gl/examples/geojson-layer-polygons) |
| State-to-state migration | ArcLayer | [arcs](https://deck.gl/examples/arc-layer) |
| Traffic fatality intensity | HexagonLayer | [hexagons](https://deck.gl/examples/hexagon-layer) |
| Metro employment density | ScreenGridLayer | [screen grid](https://deck.gl/examples/screen-grid-layer) |
| Interstate fatality rates | PathLayer | [paths](https://deck.gl/examples/geojson-layer-paths) |
| Domestic flight corridors | LineLayer | [lines](https://deck.gl/examples/line-layer) |

## Routes

| Path | Page |
| --- | --- |
| `/` | World atlas |
| `/atlas/:countryCode` | Country explorer (e.g. `/atlas/us`) |
| `/atlas/:countryCode/:datasetId` | Country + active layer |
| `/datasets` | Dataset catalog |
| `/datasets/:datasetId` | Dataset detail |
| `/about` | About |
| `/contact` | Contact |

## Development

```bash
npm install
npm run dev
```

```bash
npm run lint
npm run build
```

Datasets live in `src/data.ts`. US state polygons are vendored at `public/data/us-states.json`. MapLibre draws the base map; deck.gl renders the overlay matched to each dataset’s `mapLayer`.
