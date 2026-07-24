import { StrictMode, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
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
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  Compass,
  ExternalLink,
  Globe2,
  Info,
  Layers,
  LocateFixed,
  Mail,
  Search,
  X,
} from 'lucide-react'
import { availableCountries, categories, datasets, datasetsForCountry, layerLabels } from './data'
import type {
  AtlasDataset,
  DatasetCategory,
  FlowArc,
  LineSegment,
  PathMetric,
  RegionMetric,
  WeightedPoint,
} from './types'
import 'maplibre-gl/dist/maplibre-gl.css'
import './styles.css'

const COUNTRIES_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'

interface CapitalRecord {
  name: string
  coordinates: [number, number]
}

function extendBounds(bounds: maplibregl.LngLatBounds, coordinates: unknown): void {
  if (!Array.isArray(coordinates)) return
  if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    bounds.extend(coordinates as [number, number])
    return
  }
  coordinates.forEach((coordinate) => extendBounds(bounds, coordinate))
}

function colorFromHex(hex: string, alpha = 230): [number, number, number, number] {
  const value = hex.replace('#', '')
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    alpha,
  ]
}

function lerpColor(
  low: [number, number, number, number],
  high: [number, number, number, number],
  t: number,
): [number, number, number, number] {
  const clamped = Math.min(1, Math.max(0, t))
  return [
    Math.round(low[0] + (high[0] - low[0]) * clamped),
    Math.round(low[1] + (high[1] - low[1]) * clamped),
    Math.round(low[2] + (high[2] - low[2]) * clamped),
    Math.round(low[3] + (high[3] - low[3]) * clamped),
  ]
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

function formatMetric(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1000) return Math.round(value).toLocaleString('en-US')
  if (abs >= 100) return Math.round(value).toLocaleString('en-US')
  return value.toFixed(1)
}

function fitDataset(map: MapLibreMap, dataset: AtlasDataset) {
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

function deckLayersForDataset(
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

type AppPage = 'atlas' | 'about' | 'contact' | 'datasets' | 'dataset'

function Brand() {
  return (
    <div className="brand">
      <span className="brand-orbit"><Globe2 size={21} /></span>
      <span>MAPS<b>TOIT</b></span>
      <small>DECK.GL</small>
    </div>
  )
}

function DatasetPage({
  dataset,
  onBack,
  onViewMap,
}: {
  dataset: AtlasDataset
  onBack: () => void
  onViewMap: () => void
}) {
  return (
    <article className="content-page dataset-detail-page" style={{ '--accent': dataset.accent } as React.CSSProperties}>
      <button className="world-back" onClick={onBack}><ArrowLeft size={15} /> All datasets</button>
      <span className="panel-kicker">{dataset.category} · {dataset.countryCode}</span>
      <h1>{dataset.title}</h1>
      <p className="page-lead">{dataset.summary}</p>

      <div className="dataset-meta">
        <div>
          <small>Country</small>
          <strong>{dataset.country}</strong>
        </div>
        <div>
          <small>Metric</small>
          <strong>{dataset.metric}</strong>
        </div>
        <div>
          <small>Layer</small>
          <strong>{layerLabels[dataset.mapLayer].split(' · ')[0]}</strong>
        </div>
        <div>
          <small>Source</small>
          <strong>{dataset.sourceLabel}</strong>
        </div>
      </div>

      <div className="page-grid dataset-info-grid">
        <section>
          <small>01 · WHAT IT IS</small>
          <h2>{dataset.eyebrow}</h2>
          <p>{dataset.summary}</p>
        </section>
        <section>
          <small>02 · WHERE IT COMES FROM</small>
          <h2>Data source</h2>
          <p>{dataset.sourceLabel}. Values are shown as {dataset.unit}.</p>
          <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">
            Open source <ExternalLink size={13} />
          </a>
        </section>
        <section>
          <small>03 · WHERE IT MAPS</small>
          <h2>{dataset.country}</h2>
          <p>
            Coverage is {dataset.country} ({dataset.countryCode}), across {dataset.regions.length} mapped regions
            using a {layerLabels[dataset.mapLayer]}.
          </p>
          <a href={dataset.exampleReference} target="_blank" rel="noreferrer">
            deck.gl example <ExternalLink size={13} />
          </a>
        </section>
      </div>

      <button className="primary-cta" onClick={onViewMap}>
        View on map <ArrowUpRight size={16} />
      </button>
    </article>
  )
}

function RegionDrawer({
  dataset,
  region,
  onClose,
}: {
  dataset: AtlasDataset
  region: RegionMetric
  onClose: () => void
}) {
  const rank = dataset.regions.findIndex((item) => item.id === region.id) + 1
  const max = Math.max(...dataset.regions.map((item) => Math.abs(item.perCapita)), 1)

  return (
    <aside className="fact-drawer" style={{ '--accent': dataset.accent } as React.CSSProperties}>
      <button className="drawer-close" onClick={onClose} aria-label="Close region"><X size={18} /></button>
      <div className="fact-category">{dataset.category} · #{rank} of {dataset.regions.length}</div>
      <div className="fact-index">{dataset.countryCode} / {region.id.toUpperCase()}</div>
      <div className="deck-badge">{layerLabels[dataset.mapLayer].toUpperCase()}</div>
      <p className="fact-eyebrow">{dataset.eyebrow}</p>
      <h2>{region.name}</h2>
      <p className="fact-summary">
        {dataset.summary}
      </p>

      <div className="metric-grid">
        <div>
          <small>METRIC</small>
          <strong>{formatMetric(region.perCapita)}</strong>
          <span>{dataset.unit}</span>
        </div>
        <div>
          <small>POPULATION</small>
          <strong>{formatNumber(region.population)}</strong>
          <span>context</span>
        </div>
        <div>
          <small>RAW</small>
          <strong>{formatNumber(region.rawValue)}</strong>
          <span>{dataset.metric}</span>
        </div>
      </div>

      <div className="bar-viz">
        <div className="bar-row">
          <div><span>This region</span><b>{formatMetric(region.perCapita)}</b></div>
          <i style={{ width: `${Math.max(6, (Math.abs(region.perCapita) / max) * 100)}%`, background: dataset.accent }} />
        </div>
        <div className="bar-row">
          <div><span>Dataset peak ({dataset.regions[0].name})</span><b>{formatMetric(dataset.regions[0].perCapita)}</b></div>
          <i style={{ width: '100%', background: '#e8e5dc' }} />
        </div>
      </div>

      <a href={dataset.exampleReference} target="_blank" rel="noreferrer">
        deck.gl example <ExternalLink size={13} />
      </a>
      <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">
        Source: {dataset.sourceLabel} <ExternalLink size={13} />
      </a>
    </aside>
  )
}

function App() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const deckOverlayRef = useRef<MapboxOverlay | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null)
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<RegionMetric | null>(null)
  const [category, setCategory] = useState<DatasetCategory | 'All'>('All')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState<AppPage>('atlas')
  const [viewingDatasetId, setViewingDatasetId] = useState<string | null>(null)
  const [allCountries, setAllCountries] = useState<string[]>(availableCountries)
  const [countryCodes, setCountryCodes] = useState<Record<string, string>>({})
  const [capitals, setCapitals] = useState<Record<string, CapitalRecord>>({})

  const countryDatasets = useMemo(() => {
    if (!selectedCountry) return []
    return datasetsForCountry(selectedCountry).filter(
      (dataset) => category === 'All' || dataset.category === category,
    )
  }, [selectedCountry, category])

  const catalogDatasets = useMemo(
    () => datasets.filter((dataset) => category === 'All' || dataset.category === category),
    [category],
  )

  const activeDataset = useMemo(
    () => countryDatasets.find((dataset) => dataset.id === activeDatasetId) ?? countryDatasets[0] ?? null,
    [countryDatasets, activeDatasetId],
  )

  const viewingDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === viewingDatasetId) ?? null,
    [viewingDatasetId],
  )

  const showMap = page === 'atlas'

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const normalized = query.toLowerCase()
    return allCountries.filter((country) => country.toLowerCase().includes(normalized)).slice(0, 8)
  }, [query, allCountries])

  const selectedCapital = selectedCountryCode ? capitals[selectedCountryCode] : undefined

  function openDatasetPage(datasetId: string) {
    setViewingDatasetId(datasetId)
    setPage('dataset')
  }

  function openDatasetsIndex() {
    setViewingDatasetId(null)
    setPage('datasets')
  }

  function focusCountry(country: string, countryCode?: string, preferredDatasetId?: string) {
    const resolvedCode = countryCode
      ?? countryCodes[country]
      ?? datasets.find((dataset) => dataset.country === country)?.countryCode
      ?? null
    const nextDatasets = datasetsForCountry(country)
    const preferred = preferredDatasetId
      ? nextDatasets.find((dataset) => dataset.id === preferredDatasetId)
      : undefined
    const nextDataset = preferred ?? nextDatasets[0] ?? null
    setSelectedCountry(country)
    setSelectedCountryCode(resolvedCode)
    setActiveDatasetId(nextDataset?.id ?? null)
    setSelectedRegion(null)
    setQuery('')
    setPage('atlas')
    setViewingDatasetId(null)

    if (!mapRef.current) return
    if (nextDataset) {
      fitDataset(mapRef.current, nextDataset)
      return
    }

    const countryFeature = mapRef.current
      .querySourceFeatures('countries')
      .find((feature) => feature.properties?.name === country)
    if (countryFeature?.geometry && 'coordinates' in countryFeature.geometry) {
      const bounds = new maplibregl.LngLatBounds()
      extendBounds(bounds, countryFeature.geometry.coordinates)
      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, { padding: 120, maxZoom: 5, duration: 1400, pitch: 0, bearing: 0 })
      }
    }
  }

  function resetWorld() {
    setSelectedCountry(null)
    setSelectedCountryCode(null)
    setActiveDatasetId(null)
    setSelectedRegion(null)
    mapRef.current?.flyTo({ center: [8, 18], zoom: 1.7, pitch: 0, bearing: 0, duration: 1400 })
  }

  function viewDatasetOnMap(dataset: AtlasDataset) {
    focusCountry(dataset.country, dataset.countryCode, dataset.id)
  }

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [8, 18],
      zoom: 1.7,
      minZoom: 1.2,
      maxZoom: 10,
      attributionControl: false,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    const deckOverlay = new MapboxOverlay({ interleaved: false, layers: [] })
    map.addControl(deckOverlay as unknown as maplibregl.IControl)
    deckOverlayRef.current = deckOverlay

    map.on('style.load', () => {
      map.setProjection({ type: 'mercator' })
    })

    map.on('load', () => {
      map.addSource('countries', { type: 'geojson', data: COUNTRIES_URL })
      map.addLayer({
        id: 'available-countries',
        type: 'fill',
        source: 'countries',
        filter: ['match', ['get', 'name'], availableCountries, true, false],
        paint: { 'fill-color': '#1a73e8', 'fill-opacity': 0.18 },
      })
      map.addLayer({
        id: 'country-borders',
        type: 'line',
        source: 'countries',
        paint: { 'line-color': '#6b8cae', 'line-opacity': 0.45, 'line-width': 0.7 },
      })
      map.addLayer({
        id: 'countries-hit',
        type: 'fill',
        source: 'countries',
        paint: { 'fill-color': '#000000', 'fill-opacity': 0 },
      })
      map.addLayer({
        id: 'country-hover',
        type: 'fill',
        source: 'countries',
        filter: ['==', ['get', 'name'], ''],
        paint: { 'fill-color': '#1a73e8', 'fill-opacity': 0.16 },
      })
      map.addLayer({
        id: 'country-selected',
        type: 'fill',
        source: 'countries',
        filter: ['==', ['get', 'name'], ''],
        paint: {
          'fill-color': '#1a73e8',
          'fill-opacity': 0.24,
          'fill-outline-color': '#174ea6',
        },
      })
      map.addLayer({
        id: 'country-selected-border',
        type: 'line',
        source: 'countries',
        filter: ['==', ['get', 'name'], ''],
        paint: {
          'line-color': '#1a73e8',
          'line-opacity': 0.95,
          'line-width': 2.2,
          'line-blur': 0.15,
        },
      })

      map.on('click', 'countries-hit', (event: MapLayerMouseEvent) => {
        const country = event.features?.[0]?.properties?.name as string | undefined
        const code = event.features?.[0]?.properties?.['ISO3166-1-Alpha-2'] as string | undefined
        if (country) focusCountry(country, code)
      })
      map.on('mousemove', 'countries-hit', (event: MapLayerMouseEvent) => {
        const country = event.features?.[0]?.properties?.name as string | undefined
        map.setFilter('country-hover', ['==', ['get', 'name'], country ?? ''])
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'countries-hit', () => {
        map.setFilter('country-hover', ['==', ['get', 'name'], ''])
        map.getCanvas().style.cursor = ''
      })
      setMapReady(true)
    })

    fetch(COUNTRIES_URL)
      .then((response) => response.json())
      .then((collection: { features?: Array<{ properties?: { name?: string; 'ISO3166-1-Alpha-2'?: string } }> }) => {
        const names = collection.features
          ?.map((feature) => feature.properties?.name)
          .filter((name): name is string => Boolean(name))
          .sort((a, b) => a.localeCompare(b))
        if (names?.length) setAllCountries(names)
        const codes = Object.fromEntries(
          collection.features
            ?.filter((feature) => feature.properties?.name && feature.properties['ISO3166-1-Alpha-2'])
            .map((feature) => [feature.properties!.name!, feature.properties!['ISO3166-1-Alpha-2']!]) ?? [],
        )
        setCountryCodes(codes)
      })
      .catch(() => undefined)

    fetch('https://restcountries.com/v3.1/all?fields=cca2,capital,capitalInfo')
      .then((response) => response.json())
      .then((countries: Array<{ cca2?: string; capital?: string[]; capitalInfo?: { latlng?: [number, number] } }>) => {
        const records: Record<string, CapitalRecord> = {}
        countries.forEach((country) => {
          const latlng = country.capitalInfo?.latlng
          const name = country.capital?.[0]
          if (country.cca2 && name && latlng) {
            records[country.cca2] = { name, coordinates: [latlng[1], latlng[0]] }
          }
        })
        setCapitals(records)
      })
      .catch(() => undefined)

    return () => {
      deckOverlayRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    mapRef.current.setFilter('country-selected', ['==', ['get', 'name'], selectedCountry ?? ''])
    mapRef.current.setFilter('country-selected-border', ['==', ['get', 'name'], selectedCountry ?? ''])
  }, [mapReady, selectedCountry])

  useEffect(() => {
    if (!mapReady || !deckOverlayRef.current) return
    if (!activeDataset) {
      deckOverlayRef.current.setProps({ layers: [] })
      return
    }
    deckOverlayRef.current.setProps({
      layers: deckLayersForDataset(activeDataset, selectedRegion?.id ?? null, (region) => {
        setSelectedRegion(region)
        mapRef.current?.easeTo({
          center: region.coordinates,
          zoom: Math.max(mapRef.current.getZoom(), 4.6),
          duration: 700,
        })
      }),
    })
  }, [mapReady, activeDataset, selectedRegion])

  useEffect(() => {
    if (activeDataset && selectedRegion && !activeDataset.regions.some((region) => region.id === selectedRegion.id)) {
      setSelectedRegion(null)
    }
  }, [activeDataset, selectedRegion])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    const frame = requestAnimationFrame(() => map.resize())
    return () => cancelAnimationFrame(frame)
  }, [mapReady, selectedCountry, activeDatasetId, category, page])

  return (
    <main className={`app-shell ${showMap ? '' : 'static-page'}`}>
      <section className="data-section" aria-label="Serious data controls">
        <header>
          <button className="brand-button" onClick={() => setPage('atlas')} aria-label="Open atlas">
            <Brand />
          </button>
          <div className="header-stat"><b>{datasets.length}</b><span>deck.gl<br />layer demos</span></div>
          <nav className="site-nav" aria-label="Main navigation">
            <button className={page === 'atlas' ? 'active' : ''} onClick={() => setPage('atlas')}>
              <Layers size={14} /> Atlas
            </button>
            <button
              className={page === 'datasets' || page === 'dataset' ? 'active' : ''}
              onClick={openDatasetsIndex}
            >
              <Compass size={14} /> Datasets
            </button>
            <button className={page === 'about' ? 'active' : ''} onClick={() => setPage('about')}>
              <Info size={14} /> About
            </button>
            <button className={page === 'contact' ? 'active' : ''} onClick={() => setPage('contact')}>
              <Mail size={14} /> Contact
            </button>
          </nav>
        </header>

        {page === 'atlas' && (
          <div className={`explorer-panel ${selectedCountry ? 'country-mode' : ''}`}>
            {selectedCountry ? (
              <>
                <div className="explorer-intro">
                  <button className="world-back" onClick={resetWorld}><ArrowLeft size={15} /> World view</button>
                  <span className="panel-kicker">LAYER EXPLORER</span>
                  <h1>{selectedCountry}</h1>
                  {selectedCapital && (
                    <div className="capital-pill"><LocateFixed size={13} /> Capital · {selectedCapital.name}</div>
                  )}
                  <p>
                    {countryDatasets.length
                      ? 'Open a dataset page for source details, or select one to render it on the map below.'
                      : 'No layer demos published for this country yet.'}
                  </p>
                </div>

                <div className="explorer-columns">
                  <div className="fact-list">
                    {countryDatasets.map((dataset) => (
                      <div key={dataset.id} className={`dataset-row ${activeDataset?.id === dataset.id ? 'active' : ''}`}>
                        <button
                          className="dataset-select"
                          onClick={() => {
                            setActiveDatasetId(dataset.id)
                            setSelectedRegion(null)
                            if (mapRef.current) fitDataset(mapRef.current, dataset)
                          }}
                        >
                          <i style={{ background: dataset.accent }}>{dataset.mapLayer.slice(0, 3).toUpperCase()}</i>
                          <span>
                            <small>{dataset.category} · {layerLabels[dataset.mapLayer].split(' · ')[0]}</small>
                            <b>{dataset.title}</b>
                          </span>
                        </button>
                        <button className="dataset-info" onClick={() => openDatasetPage(dataset.id)} aria-label={`About ${dataset.title}`}>
                          <Info size={15} />
                        </button>
                      </div>
                    ))}
                    {!countryDatasets.length && (
                      <div className="empty-state">No deck.gl layer demos here yet.</div>
                    )}
                  </div>

                  {activeDataset && (
                    <div className="leaderboard">
                      <div className="leaderboard-head">
                        <Layers size={14} /> {layerLabels[activeDataset.mapLayer]}
                      </div>
                      {activeDataset.regions.slice(0, 6).map((region, index) => (
                        <button
                          key={region.id}
                          className={selectedRegion?.id === region.id ? 'active' : ''}
                          onClick={() => {
                            setSelectedRegion(region)
                            mapRef.current?.easeTo({
                              center: region.coordinates,
                              zoom: Math.max(mapRef.current.getZoom(), 4.6),
                              duration: 700,
                            })
                          }}
                        >
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <b>{region.name}</b>
                          <strong>{formatMetric(region.perCapita)}</strong>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="explorer-intro world-intro">
                <span className="panel-kicker"><Compass size={14} /> DECK.GL SHOWCASE LAYERS</span>
                <h1>Serious data,<br /><em>six layers.</em></h1>
                <p>
                  Search a country below, or browse dataset pages for what each layer measures, where the numbers come from, and which country they cover.
                </p>
                <div className="explore-hint">
                  <LocateFixed size={17} />
                  <span><b>Start with the United States</b>Six datasets, one per deck.gl layer type</span>
                </div>
              </div>
            )}
          </div>
        )}

        {page === 'datasets' && (
          <article className="content-page datasets-index">
            <span className="panel-kicker"><Compass size={14} /> DATASET CATALOG</span>
            <h1>Every layer,<br /><em>explained.</em></h1>
            <p className="page-lead">
              Open a dataset page to see what it measures, which country it covers, and where the data comes from.
            </p>
            <nav className="category-dock catalog-filters" aria-label="Dataset categories">
              <button className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>✦ <span>Everything</span></button>
              {categories.map((item) => (
                <button
                  key={item.name}
                  className={category === item.name ? 'active' : ''}
                  onClick={() => setCategory(item.name)}
                >
                  {item.emoji} <span>{item.name}</span>
                </button>
              ))}
            </nav>
            <div className="dataset-catalog">
              {catalogDatasets.map((dataset) => (
                <button key={dataset.id} className="dataset-card" onClick={() => openDatasetPage(dataset.id)}>
                  <i style={{ background: dataset.accent }} />
                  <span>
                    <small>{dataset.country} · {dataset.category}</small>
                    <b>{dataset.title}</b>
                    <em>{dataset.sourceLabel}</em>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
              {!catalogDatasets.length && <div className="empty-state">No datasets in this category.</div>}
            </div>
          </article>
        )}

        {page === 'dataset' && viewingDataset && (
          <DatasetPage
            dataset={viewingDataset}
            onBack={openDatasetsIndex}
            onViewMap={() => viewDatasetOnMap(viewingDataset)}
          />
        )}

        {page === 'about' && (
          <article className="content-page">
            <span className="panel-kicker"><Info size={14} /> ABOUT MAPSTOIT</span>
            <h1>Geospatial data,<br /><em>made visible.</em></h1>
            <p className="page-lead">
              mapstoit is an interactive data atlas built to show how serious public datasets behave across different visualization layers.
            </p>
            <div className="page-grid">
              <section>
                <small>01 · THE IDEA</small>
                <h2>One map, six visual languages</h2>
                <p>Compare polygon density, origin–destination arcs, spatial aggregation, screen grids, highway paths, and flight corridors without changing tools.</p>
              </section>
              <section>
                <small>02 · THE STACK</small>
                <h2>MapLibre + deck.gl</h2>
                <p>MapLibre provides the basemap while deck.gl renders fast, interactive WebGL layers over it. React and TypeScript power the interface.</p>
              </section>
              <section>
                <small>03 · THE DATA</small>
                <h2>Traceable public sources</h2>
                <p>Each dataset page documents the metric, country coverage, and source so you can verify what you are looking at.</p>
              </section>
            </div>
          </article>
        )}

        {page === 'contact' && (
          <article className="content-page contact-page">
            <span className="panel-kicker"><Mail size={14} /> CONTACT</span>
            <h1>Let’s map<br /><em>something useful.</em></h1>
            <p className="page-lead">
              Found a data issue, have a dataset suggestion, or want to contribute a new country view? Open a discussion in the project repository.
            </p>
            <div className="contact-actions">
              <a href="https://github.com/crumexhtx/animatedmapwebsite/issues/new" target="_blank" rel="noreferrer">
                <span><b>Report or suggest</b><small>Open a GitHub issue</small></span>
                <ArrowUpRight size={18} />
              </a>
              <a href="https://github.com/crumexhtx/animatedmapwebsite" target="_blank" rel="noreferrer">
                <span><b>View the project</b><small>Source code and updates</small></span>
                <ExternalLink size={18} />
              </a>
            </div>
          </article>
        )}

        {showMap && (
          <div className="controls-row map-controls">
            <div className="search-box">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a country…"
                aria-label="Search countries"
              />
              {query && <button onClick={() => setQuery('')}><X size={14} /></button>}
              {!!searchResults.length && (
                <div className="search-results">
                  {searchResults.map((country) => (
                    <button key={country} onClick={() => focusCountry(country)}>
                      {country}<ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <nav className="category-dock" aria-label="Dataset categories">
              <button className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>✦ <span>Everything</span></button>
              {categories.map((item) => (
                <button
                  key={item.name}
                  className={category === item.name ? 'active' : ''}
                  onClick={() => setCategory(item.name)}
                >
                  {item.emoji} <span>{item.name}</span>
                </button>
              ))}
            </nav>
          </div>
        )}
      </section>

      <section className={`map-section ${showMap ? '' : 'is-hidden'}`} aria-label="Map visualization">
        <div ref={mapContainer} className="world-map" />
        {activeDataset ? (
          <div className="map-caption dataset-caption">
            <span className="pulse-dot" />
            {activeDataset.title} · {layerLabels[activeDataset.mapLayer]}
          </div>
        ) : (
          <div className="map-caption">
            <span className="pulse-dot" /> Glowing countries have deck.gl layer demos
          </div>
        )}
        {!mapReady && <div className="map-loader"><Globe2 size={30} /> Spinning up the planet…</div>}
        {activeDataset && selectedRegion && (
          <RegionDrawer
            dataset={activeDataset}
            region={selectedRegion}
            onClose={() => setSelectedRegion(null)}
          />
        )}
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
