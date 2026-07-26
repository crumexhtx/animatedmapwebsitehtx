'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as maplibregl from 'maplibre-gl'
import type { MapLayerMouseEvent } from 'maplibre-gl'
import type { CityRecord } from '@/lib/types'
import { cityPath } from '@/lib/paths'
import 'maplibre-gl/dist/maplibre-gl.css'

const BASE_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'raster-tiles': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© CARTO © OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#d9e4dc' } },
    { id: 'raster-basemap', type: 'raster', source: 'raster-tiles', minzoom: 0, maxzoom: 19 },
  ],
}

const CITY_SOURCE = 'cities'
const CITY_LAYER = 'city-points'
const CITY_LAYER_STROKE = 'city-points-stroke'
const STYLE_TIMEOUT_MS = 6000

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

  if (!map.getLayer(CITY_LAYER_STROKE)) {
    map.addLayer({
      id: CITY_LAYER_STROKE,
      type: 'circle',
      source: CITY_SOURCE,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['sqrt', ['get', 'population']],
          200,
          touchUi ? 7 : 4,
          2000,
          touchUi ? 14 : 10,
          5000,
          touchUi ? 20 : 16,
        ],
        'circle-color': '#ffffff',
        'circle-opacity': 0.95,
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
          200,
          touchUi ? 5 : 3,
          2000,
          touchUi ? 11 : 8,
          5000,
          touchUi ? 17 : 13,
        ],
        'circle-color': [
          'case',
          ['boolean', ['get', 'focused'], false],
          '#0e5a4e',
          '#1c7868',
        ],
        'circle-opacity': 0.92,
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
      zoom: focusRef.current ? (narrow ? 7.1 : 8.5) : narrow ? 3.05 : 3.6,
      minZoom: 2.5,
      maxZoom: 12,
      attributionControl: false,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
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

    const markReady = () => {
      if (readySet || cancelled) return
      readySet = true
      window.clearTimeout(styleTimer)
      setReady(true)
      requestAnimationFrame(() => map.resize())
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
      const message = `${event.error?.message ?? ''} ${event.error ?? ''}`
      const isStyleFailure =
        /failed to fetch|ajaxerror|could not load|status 4\d\d|status 5\d\d/i.test(message)
      if (cancelled || !isStyleFailure) return
      // Avoid thrashing if we already fell back.
      if (map.getSource('raster-tiles')) return
      console.warn('Basemap style failed, using raster fallback', event.error)
      map.setStyle(FALLBACK_STYLE)
    })

    const styleTimer = window.setTimeout(() => {
      if (readySet || cancelled) return
      if (!map.isStyleLoaded()) {
        console.warn('Basemap style timed out, using raster fallback')
        map.setStyle(FALLBACK_STYLE)
        return
      }
      onStyleReady()
    }, STYLE_TIMEOUT_MS)

    const observer = new ResizeObserver(() => {
      map.resize()
    })
    observer.observe(containerRef.current)

    if (map.loaded() || map.isStyleLoaded()) {
      onStyleReady()
    }

    return () => {
      cancelled = true
      window.clearTimeout(styleTimer)
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
