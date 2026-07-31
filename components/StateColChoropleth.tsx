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

/** Public domain US states GeoJSON (name property matches catalog state names). */
const GEO_URL =
  'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'

function colorForIndex(value: number | undefined, min: number, max: number) {
  if (value == null) return '#d7e0d9'
  if (max === min) return '#0f6b5c'
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const r = Math.round(216 + (15 - 216) * t)
  const g = Math.round(239 + (107 - 239) * t)
  const b = Math.round(232 + (92 - 232) * t)
  return `rgb(${r}, ${g}, ${b})`
}

export function StateColChoropleth({ states }: { states: StateColAverage[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState<StateColAverage | null>(null)

  const byName = useMemo(
    () => new Map(states.map((state) => [state.name.toLowerCase(), state])),
    [states],
  )
  const values = states.map((state) => state.avgCostOfLivingIndex)
  const min = Math.min(...values)
  const max = Math.max(...values)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#f3f6f2' },
          },
        ],
      },
      center: [-98.5, 39.5],
      zoom: 3.2,
      attributionControl: true,
      cooperativeGestures: true,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    fetch(GEO_URL)
      .then((response) => response.json())
      .then((geojson: {
        type: string
        features: Array<{
          type: string
          geometry: unknown
          properties?: Record<string, unknown> | null
        }>
      }) => {
        if (cancelled || !mapRef.current) return

        const colored = {
          type: 'FeatureCollection' as const,
          features: geojson.features.map((feature) => {
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
          }),
        }

        map.addSource('states', { type: 'geojson', data: colored as never })
        map.addLayer({
          id: 'states-fill',
          type: 'fill',
          source: 'states',
          paint: {
            'fill-color': ['get', 'fill'],
            'fill-opacity': 0.92,
          },
        })
        map.addLayer({
          id: 'states-outline',
          type: 'line',
          source: 'states',
          paint: {
            'line-color': '#14201c',
            'line-width': 0.6,
            'line-opacity': 0.35,
          },
        })

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

        setReady(true)
      })
      .catch((error) => {
        console.error('choropleth load failed', error)
      })

    return () => {
      cancelled = true
      map.remove()
      mapRef.current = null
    }
  }, [byName, max, min, router])

  return (
    <div className="choropleth">
      <div className="choropleth-map" ref={containerRef} />
      {!ready ? <div className="city-map-loader choropleth-loader">Loading state map…</div> : null}
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
