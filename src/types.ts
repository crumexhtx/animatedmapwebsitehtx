export type DatasetCategory = 'Mobility' | 'Safety' | 'Demographics' | 'Infrastructure'

export type MapLayerKind = 'hexagon' | 'screengrid' | 'arc' | 'polygon' | 'path' | 'line'

export interface RegionMetric {
  id: string
  name: string
  coordinates: [number, number]
  population: number
  rawValue: number
  perCapita: number
}

export interface FlowArc {
  id: string
  sourceName: string
  targetName: string
  source: [number, number]
  target: [number, number]
  value: number
}

export interface WeightedPoint {
  coordinates: [number, number]
  weight: number
  regionId: string
  regionName: string
}

export interface PathMetric {
  id: string
  name: string
  path: [number, number][]
  value: number
}

export interface LineSegment {
  id: string
  name: string
  source: [number, number]
  target: [number, number]
  value: number
}

export interface AtlasDataset {
  id: string
  country: string
  countryCode: string
  category: DatasetCategory
  title: string
  eyebrow: string
  summary: string
  metric: string
  unit: string
  mapLayer: MapLayerKind
  accent: string
  sourceLabel: string
  sourceUrl: string
  exampleReference: string
  regions: RegionMetric[]
  arcs?: FlowArc[]
  points?: WeightedPoint[]
  paths?: PathMetric[]
  lines?: LineSegment[]
  /** Optional remote GeoJSON used by polygon layers. */
  polygonUrl?: string
  polygonValueKey?: string
}
