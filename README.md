# mapstoit

Interactive MapLibre + deck.gl atlas that maps real geospatial themes onto the [deck.gl gallery layer examples](https://deck.gl/examples).

## Layer demos (United States)

| Dataset | deck.gl layer | Example |
| --- | --- | --- |
| Population density by state | GeoJsonLayer polygons | [polygons](https://deck.gl/examples/geojson-layer-polygons) |
| State-to-state migration | ArcLayer | [arcs](https://deck.gl/examples/arc-layer) |
| Traffic fatality intensity | HexagonLayer | [hexagons](https://deck.gl/examples/hexagon-layer) |
| Metro employment density | ScreenGridLayer | [screen grid](https://deck.gl/examples/screen-grid-layer) |
| Interstate fatality rates | PathLayer | [paths](https://deck.gl/examples/geojson-layer-paths) |
| Domestic flight corridors | LineLayer | [lines](https://deck.gl/examples/line-layer) |

Patterns also align with projects on the [deck.gl showcase](https://deck.gl/showcase) (flow maps, density grids, corridor networks).

## Development

```bash
npm install
npm run dev
```

```bash
npm run lint
npm run build
```

Datasets live in `src/data.ts`. MapLibre draws the base map; deck.gl renders the overlay matched to each dataset’s `mapLayer`.
