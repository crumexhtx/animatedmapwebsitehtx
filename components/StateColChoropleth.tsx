'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export type StateColAverage = {
  name: string
  code: string
  slug: string
  cityCount: number
  avgCostOfLivingIndex: number
}

/** Local copy preferred; CDN fallback if missing. */
const GEO_URLS = [
  '/geo/us-states.json',
  'https://cdn.jsdelivr.net/gh/PublicaMundi/MappingAPI@master/data/geojson/us-states.json',
]

const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'MapsToIt state costs',
  sources: {
    'raster-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#c5d6c8' },
    },
    {
      id: 'raster-basemap',
      type: 'raster',
      source: 'raster-tiles',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
}

function colorForIndex(value: number | undefined, min: number, max: number) {
  if (value == null) return 'rgba(215, 224, 217, 0.55)'
  if (max === min) return 'rgba(15, 107, 92, 0.85)'
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const r = Math.round(216 + (15 - 216) * t)
  const g = Math.round(239 + (107 - 239) * t)
  const b = Math.round(232 + (92 - 232) * t)
  return `rgba(${r}, ${g}, ${b}, 0.88)`
}

async function loadStatesGeoJson() {
  for (const url of GEO_URLS) {
    try {
      const response = await fetch(url)
      if (!response.ok) continue
      const data = await response.json()
      if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) return data
    } catch {
      // try next source
    }
  }
  throw new Error('Could not load US states GeoJSON')
}

export function StateColChoropleth({ states }: { states: StateColAverage[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<StateColAverage | null>(null)

  const byName = useMemo(
    () => new Map(states.map((state) => [state.name.toLowerCase(), state])),
    [states],
  )
  const values = states.map((state) => state.avgCostOfLivingIndex)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 100

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [-97.5, 38.5],
      zoom: 3.4,
      minZoom: 2,
      maxZoom: 8,
      attributionControl: false,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    })
    mapRef.current = map
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    const forceResize = () => {
      if (cancelled || !mapRef.current) return
      map.resize()
    }

    const onLoad = async () => {
      try {
        const geojson = await loadStatesGeoJson()
        if (cancelled || !mapRef.current) return

        const colored = {
          type: 'FeatureCollection' as const,
          features: geojson.features.map(
            (feature: {
              type: string
              geometry: unknown
              properties?: Record<string, unknown> | null
            }) => {
              const name = String(feature.properties?.name ?? '')
              const match = byName.get(name.toLowerCase())
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  stateName: match?.name ?? name,
                  stateCode: match?.code ?? '',
                  stateSlug: match?.slug ?? '',
                  avgCol: match?.avgCostOfLivingIndex ?? null,
                  cityCount: match?.cityCount ?? 0,
                  fill: colorForIndex(match?.avgCostOfLivingIndex, min, max),
                },
              }
            },
          ),
        }

        if (map.getSource('states')) {
          ;(map.getSource('states') as maplibregl.GeoJSONSource).setData(colored as never)
        } else {
          map.addSource('states', { type: 'geojson', data: colored as never })
          map.addLayer({
            id: 'states-fill',
            type: 'fill',
            source: 'states',
            paint: {
              'fill-color': ['get', 'fill'],
              'fill-opacity': 1,
            },
          })
          map.addLayer({
            id: 'states-outline',
            type: 'line',
            source: 'states',
            paint: {
              'line-color': '#14201c',
              'line-width': 0.7,
              'line-opacity': 0.4,
            },
          })
        }

        map.on('mousemove', 'states-fill', (event) => {
          map.getCanvas().style.cursor = 'pointer'
          const props = event.features?.[0]?.properties
          if (!props) return
          const match = byName.get(String(props.stateName ?? props.name ?? '').toLowerCase())
          setHover(
            match ?? {
              name: String(props.stateName ?? props.name ?? 'Unknown'),
              code: String(props.stateCode ?? ''),
              slug: String(props.stateSlug ?? ''),
              cityCount: Number(props.cityCount ?? 0),
              avgCostOfLivingIndex: Number(props.avgCol ?? 0),
            },
          )
        })
        map.on('mouseleave', 'states-fill', () => {
          map.getCanvas().style.cursor = ''
          setHover(null)
        })
        map.on('click', 'states-fill', (event) => {
          const slug = event.features?.[0]?.properties?.stateSlug
          if (slug) router.push(`/states/${slug}`)
        })

        if (!cancelled) {
          setReady(true)
          setError(null)
          forceResize()
          requestAnimationFrame(forceResize)
          window.setTimeout(forceResize, 120)
        }
      } catch (err) {
        console.error('choropleth load failed', err)
        if (!cancelled) setError('State map data could not be loaded. The ranked list below still works.')
      }
    }

    if (map.loaded()) {
      void onLoad()
    } else {
      map.on('load', () => {
        void onLoad()
      })
    }

    window.addEventListener('resize', forceResize)

    return () => {
      cancelled = true
      window.removeEventListener('resize', forceResize)
      map.remove()
      mapRef.current = null
    }
  }, [byName, max, min, router])

  return (
    <div className="choropleth">
      <div className="choropleth-map" ref={containerRef} />
      {!ready && !error ? <div className="city-map-loader choropleth-loader">Loading state map…</div> : null}
      {error ? <p className="chart-active">{error}</p> : null}
      <div className="choropleth-legend" aria-hidden>
        <span>Lower COL avg</span>
        <span className="choropleth-ramp" />
        <span>Higher COL avg</span>
      </div>
      <p className="chart-active" aria-live="polite">
        {hover
          ? hover.cityCount
            ? `${hover.name}: catalog avg housing index ${hover.avgCostOfLivingIndex} across ${hover.cityCount} cities — click for state page`
            : `${hover.name}: no MapsToIt cities in catalog yet`
          : 'Hover a state for catalog-average housing cost · click mapped states to open the state page'}
      </p>
    </div>
  )
}
