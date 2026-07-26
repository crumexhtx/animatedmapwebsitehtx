'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as maplibregl from 'maplibre-gl'
import type { MapLayerMouseEvent } from 'maplibre-gl'
import type { CityRecord } from '@/lib/types'
import { cityPath } from '@/lib/paths'
import 'maplibre-gl/dist/maplibre-gl.css'

/** Raster basemap — more reliable than CARTO vector GL styles on mobile Safari/Edge. */
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'MapsToIt raster',
  sources: {
    'raster-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#d7e0d9' },
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

const CITY_SOURCE = 'cities'
const CITY_LAYER = 'city-points'
const CITY_LAYER_STROKE = 'city-points-stroke'

type CityMapProps = {
  cities: CityRecord[]
  focus?: CityRecord | null
  className?: string
  variant?: 'default' | 'hero'
}

function citiesToGeoJSON(
  cities: CityRecord[],
  focusedSlug?: string | null,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: cities.map((city) => ({
      type: 'Feature',
      properties: {
        slug: city.slug,
        stateSlug: city.stateSlug,
        name: city.name,
        population: city.population,
        focused: city.slug === focusedSlug,
      },
      geometry: {
        type: 'Point',
        coordinates: city.coordinates,
      },
    })),
  }
}

function useTouchUi() {
  const [touchUi, setTouchUi] = useState(false)

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)')
    const narrow = window.matchMedia('(max-width: 720px)')
    const update = () => setTouchUi(coarse.matches || narrow.matches)
    update()
    coarse.addEventListener('change', update)
    narrow.addEventListener('change', update)
    return () => {
      coarse.removeEventListener('change', update)
      narrow.removeEventListener('change', update)
    }
  }, [])

  return touchUi
}

function ensureCityLayers(map: maplibregl.Map, touchUi: boolean) {
  if (!map.getSource(CITY_SOURCE)) {
    map.addSource(CITY_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }

  const radiusExpr: maplibregl.ExpressionSpecification = [
    'interpolate',
    ['linear'],
    ['sqrt', ['get', 'population']],
    300,
    touchUi ? 6 : 4,
    1500,
    touchUi ? 12 : 9,
    3000,
    touchUi ? 18 : 14,
  ]

  if (!map.getLayer(CITY_LAYER_STROKE)) {
    map.addLayer({
      id: CITY_LAYER_STROKE,
      type: 'circle',
      source: CITY_SOURCE,
      paint: {
        'circle-radius': radiusExpr,
        'circle-color': '#ffffff',
        'circle-opacity': 0.95,
        'circle-blur': 0.05,
      },
    })
  }

  if (!map.getLayer(CITY_LAYER)) {
    map.addLayer({
      id: CITY_LAYER,
      type: 'circle',
      source: CITY_SOURCE,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['sqrt', ['get', 'population']],
          300,
          touchUi ? 4 : 3,
          1500,
          touchUi ? 9 : 7,
          3000,
          touchUi ? 14 : 11,
        ],
        'circle-color': [
          'case',
          ['boolean', ['get', 'focused'], false],
          '#0e5a4e',
          '#1c7868',
        ],
        'circle-opacity': 0.95,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
      },
    })
  }
}

export function CityMap({
  cities,
  focus = null,
  className,
  variant = 'default',
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const router = useRouter()
  const touchUi = useTouchUi()
  const [ready, setReady] = useState(false)
  const citiesRef = useRef(cities)
  const focusRef = useRef(focus)
  const touchUiRef = useRef(touchUi)

  citiesRef.current = cities
  focusRef.current = focus
  touchUiRef.current = touchUi

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const narrow = window.matchMedia('(max-width: 720px)').matches
    let readySet = false
    let cancelled = false
    let interactionsBound = false

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: focusRef.current?.coordinates ?? [-98.35, 39.5],
      zoom: focusRef.current ? (narrow ? 7.1 : 8.5) : narrow ? 3.2 : 3.7,
      minZoom: 2,
      maxZoom: 14,
      attributionControl: false,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      // Pixel ratio can be high on phones; keep rendering sharp without blowing memory.
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    const bindInteractions = () => {
      if (interactionsBound) return
      interactionsBound = true

      map.on('click', CITY_LAYER, (event: MapLayerMouseEvent) => {
        const slug = event.features?.[0]?.properties?.slug as string | undefined
        const stateSlug = event.features?.[0]?.properties?.stateSlug as string | undefined
        if (!slug || !stateSlug) return
        router.push(cityPath({ slug, stateSlug }))
      })
      map.on('mouseenter', CITY_LAYER, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', CITY_LAYER, () => {
        map.getCanvas().style.cursor = ''
      })
    }

    const syncCities = () => {
      if (cancelled || !map.isStyleLoaded()) return
      ensureCityLayers(map, touchUiRef.current)
      bindInteractions()
      const source = map.getSource(CITY_SOURCE) as maplibregl.GeoJSONSource | undefined
      if (!source) return
      source.setData(citiesToGeoJSON(citiesRef.current, focusRef.current?.slug))
    }

    const forceResize = () => {
      if (cancelled || !mapRef.current) return
      map.resize()
    }

    const markReady = () => {
      if (readySet || cancelled) return
      readySet = true
      setReady(true)
      forceResize()
      requestAnimationFrame(forceResize)
      window.setTimeout(forceResize, 100)
      window.setTimeout(forceResize, 400)
    }

    const onStyleReady = () => {
      try {
        syncCities()
      } catch (error) {
        console.error('Failed to initialize city layers', error)
      }
      markReady()
    }

    map.on('load', onStyleReady)
    map.on('style.load', onStyleReady)
    map.on('error', (event) => {
      console.warn('MapLibre error', event.error)
    })

    const observer = new ResizeObserver(() => forceResize())
    observer.observe(containerRef.current)

    if (map.loaded() || map.isStyleLoaded()) {
      onStyleReady()
    }

    return () => {
      cancelled = true
      observer.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [router])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !map.isStyleLoaded()) return
    ensureCityLayers(map, touchUi)
    const source = map.getSource(CITY_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!source) return
    source.setData(citiesToGeoJSON(cities, focus?.slug))
  }, [ready, cities, focus, touchUi])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !focus) return
    const narrow = window.matchMedia('(max-width: 720px)').matches
    map.easeTo({
      center: focus.coordinates,
      zoom: Math.max(map.getZoom(), narrow ? 7.1 : 8.2),
      duration: 900,
    })
  }, [ready, focus])

  return (
    <div className={`city-map city-map-${variant} ${className ?? ''}`.trim()}>
      <div ref={containerRef} className="city-map-canvas" />
      {!ready && <div className="city-map-loader">Loading map…</div>}
    </div>
  )
}
