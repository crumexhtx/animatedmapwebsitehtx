import {
  ArcLayer,
  GeoJsonLayer,
  LineLayer,
  PathLayer,
  ScatterplotLayer,
  TextLayer,
} from '@deck.gl/layers'
import { HexagonLayer, ScreenGridLayer } from '@deck.gl/aggregation-layers'
import type { Layer, PickingInfo } from '@deck.gl/core'
import { colorFromHex, lerpColor } from '../lib/colors'
import type {
  AtlasDataset,
  FlowArc,
  LineSegment,
  PathMetric,
  RegionMetric,
  WeightedPoint,
} from '../types'

export function deckLayersForDataset(
  dataset: AtlasDataset,
  selectedRegionId: string | null,
  onSelectRegion: (region: RegionMetric) => void,
): Layer[] {
  const accent = colorFromHex(dataset.accent)
  const max = Math.max(...dataset.regions.map((region) => Math.abs(region.perCapita)), 1)

  const findRegion = (idOrName: string) =>
    dataset.regions.find((region) => region.id === idOrName || region.name === idOrName)

  switch (dataset.mapLayer) {
    case 'hexagon':
      return [
        new HexagonLayer<WeightedPoint>({
          id: `hex-${dataset.id}`,
          data: dataset.points ?? [],
          getPosition: (point) => point.coordinates,
          getColorWeight: (point) => point.weight,
          getElevationWeight: (point) => point.weight,
          elevationScale: 1200,
          extruded: true,
          radius: 55_000,
          coverage: 0.82,
          upperPercentile: 100,
          colorRange: [
            [35, 48, 38],
            [92, 120, 52],
            [170, 190, 60],
            [220, 190, 60],
            [240, 140, 50],
            [255, 80, 50],
          ],
          pickable: true,
          material: true,
          onClick: (info: PickingInfo) => {
            const points = (info.object as { points?: Array<{ source: WeightedPoint }> } | undefined)?.points
            const region = findRegion(points?.[0]?.source.regionId ?? '')
            if (region) onSelectRegion(region)
            return true
          },
        }),
      ]

    case 'screengrid':
      return [
        new ScreenGridLayer<WeightedPoint>({
          id: `grid-${dataset.id}`,
          data: dataset.points ?? [],
          getPosition: (point) => point.coordinates,
          getWeight: (point) => point.weight,
          cellSizePixels: 18,
          colorRange: [
            [20, 40, 55, 40],
            [40, 100, 140, 120],
            [60, 170, 210, 180],
            [120, 220, 255, 220],
            [220, 250, 255, 255],
          ],
          gpuAggregation: true,
          pickable: true,
        }),
        new ScatterplotLayer<RegionMetric>({
          id: `grid-hubs-${dataset.id}`,
          data: dataset.regions,
          pickable: true,
          getPosition: (region) => region.coordinates,
          getRadius: 18_000,
          radiusMinPixels: 4,
          getFillColor: accent,
          onClick: (info: PickingInfo<RegionMetric>) => {
            if (info.object) onSelectRegion(info.object)
          },
        }),
      ]

    case 'arc': {
      const maxFlow = Math.max(...(dataset.arcs?.map((arc) => arc.value) ?? [1]))
      return [
        new ArcLayer<FlowArc>({
          id: `arc-${dataset.id}`,
          data: dataset.arcs ?? [],
          getSourcePosition: (arc) => arc.source,
          getTargetPosition: (arc) => arc.target,
          getSourceColor: [255, 120, 70, 220],
          getTargetColor: [90, 190, 255, 220],
          getWidth: (arc) => 1 + (arc.value / maxFlow) * 5,
          pickable: true,
          greatCircle: true,
          onClick: (info: PickingInfo<FlowArc>) => {
            const region = findRegion(info.object?.targetName ?? '')
            if (region) onSelectRegion(region)
          },
        }),
        new ScatterplotLayer<RegionMetric>({
          id: `arc-hubs-${dataset.id}`,
          data: dataset.regions,
          pickable: true,
          getPosition: (region) => region.coordinates,
          getRadius: (region) => 12_000 + (Math.abs(region.perCapita) / max) * 28_000,
          radiusMinPixels: 4,
          getFillColor: (region) => {
            if (selectedRegionId === region.id) return [255, 255, 255, 245]
            return region.perCapita >= 0 ? accent : colorFromHex('#5aa7ff')
          },
          onClick: (info: PickingInfo<RegionMetric>) => {
            if (info.object) onSelectRegion(info.object)
          },
        }),
      ]
    }

    case 'polygon':
      return [
        new GeoJsonLayer({
          id: `polygon-${dataset.id}`,
          data: dataset.polygonUrl,
          stroked: true,
          filled: true,
          extruded: true,
          wireframe: false,
          pickable: true,
          getElevation: (feature: { properties?: Record<string, unknown> }) => {
            const value = Number(feature.properties?.[dataset.polygonValueKey ?? 'density'] ?? 0)
            return Math.sqrt(Math.max(value, 0)) * 4_500
          },
          getFillColor: (feature: { properties?: Record<string, unknown> }) => {
            const value = Number(feature.properties?.[dataset.polygonValueKey ?? 'density'] ?? 0)
            const intensity = Math.min(1, Math.sqrt(value) / 35)
            return lerpColor(colorFromHex('#c2d7f5', 180), accent, intensity)
          },
          getLineColor: [12, 16, 12, 200],
          lineWidthMinPixels: 1,
          material: true,
          onClick: (info: PickingInfo<{ properties?: { name?: string; density?: number } }>) => {
            const name = info.object?.properties?.name
            const region = name ? findRegion(name) : undefined
            if (region) onSelectRegion(region)
          },
        }),
      ]

    case 'path': {
      const maxPath = Math.max(...(dataset.paths?.map((path) => path.value) ?? [1]))
      return [
        new PathLayer<PathMetric>({
          id: `path-${dataset.id}`,
          data: dataset.paths ?? [],
          getPath: (path) => path.path,
          getColor: (path) => lerpColor(colorFromHex('#90b4e8', 180), accent, path.value / maxPath),
          getWidth: (path) => 2 + (path.value / maxPath) * 8,
          widthMinPixels: 2,
          widthMaxPixels: 14,
          pickable: true,
          rounded: true,
          onClick: (info: PickingInfo<PathMetric>) => {
            const region = findRegion(info.object?.id ?? '')
            if (region) onSelectRegion(region)
          },
        }),
        new TextLayer<PathMetric>({
          id: `path-labels-${dataset.id}`,
          data: dataset.paths ?? [],
          getPosition: (path) => path.path[Math.floor(path.path.length / 2)],
          getText: (path) => path.name,
          getSize: 12,
          getColor: [245, 247, 238, 230],
          getTextAnchor: 'middle',
          outlineWidth: 2,
          outlineColor: [12, 16, 12, 220],
        }),
      ]
    }

    case 'line': {
      const maxLine = Math.max(...(dataset.lines?.map((line) => line.value) ?? [1]))
      return [
        new LineLayer<LineSegment>({
          id: `line-${dataset.id}`,
          data: dataset.lines ?? [],
          getSourcePosition: (line) => line.source,
          getTargetPosition: (line) => line.target,
          getColor: (line) => lerpColor(colorFromHex('#4a3a70', 160), accent, line.value / maxLine),
          getWidth: (line) => 1 + (line.value / maxLine) * 6,
          widthMinPixels: 1,
          pickable: true,
          onClick: (info: PickingInfo<LineSegment>) => {
            const region = dataset.regions.find((item) =>
              info.object?.name.toLowerCase().includes(item.name.split(' ')[0].toLowerCase()),
            )
            if (region) onSelectRegion(region)
          },
        }),
        new ScatterplotLayer<RegionMetric>({
          id: `line-hubs-${dataset.id}`,
          data: dataset.regions,
          pickable: true,
          getPosition: (region) => region.coordinates,
          getRadius: 22_000,
          radiusMinPixels: 5,
          getFillColor: (region) => (selectedRegionId === region.id ? [255, 255, 255, 245] : accent),
          onClick: (info: PickingInfo<RegionMetric>) => {
            if (info.object) onSelectRegion(info.object)
          },
        }),
      ]
    }

    default:
      return []
  }
}
