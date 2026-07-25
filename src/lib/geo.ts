import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { AtlasDataset } from '../types'

export function extendBounds(bounds: maplibregl.LngLatBounds, coordinates: unknown): void {
  if (!Array.isArray(coordinates)) return
  if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    bounds.extend(coordinates as [number, number])
    return
  }
  coordinates.forEach((coordinate) => extendBounds(bounds, coordinate))
}

export function fitDataset(map: MapLibreMap, dataset: AtlasDataset) {
  const bounds = new maplibregl.LngLatBounds()
  dataset.regions.forEach((region) => bounds.extend(region.coordinates))
  dataset.arcs?.forEach((arc) => {
    bounds.extend(arc.source)
    bounds.extend(arc.target)
  })
  dataset.paths?.forEach((path) => path.path.forEach((coord) => bounds.extend(coord)))
  dataset.lines?.forEach((line) => {
    bounds.extend(line.source)
    bounds.extend(line.target)
  })
  dataset.points?.forEach((point) => bounds.extend(point.coordinates))
  if (bounds.isEmpty()) return
  map.fitBounds(bounds, {
    padding: 110,
    maxZoom: 4.4,
    duration: 1100,
    pitch: dataset.mapLayer === 'polygon' || dataset.mapLayer === 'hexagon' ? 45 : 32,
    bearing: dataset.mapLayer === 'arc' || dataset.mapLayer === 'line' ? -18 : -8,
  })
}
