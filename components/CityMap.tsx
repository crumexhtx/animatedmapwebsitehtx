'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as maplibregl from 'maplibre-gl'
import type { MapLayerMouseEvent } from 'maplibre-gl'
import type { CityRecord } from '@/lib/types'
import { cityPath } from '@/lib/paths'
import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * Voyager raster basemap — readable streets/terrain so the map isn’t a flat gray field.
 * City profiles are overlaid as tappable dots (size ≈ population).
 */
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'MapsToIt cities',
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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

const CITY_SOURCE = 'cities'
const CITY_LAYER = 'city-points'
const CITY_LAYER_HALO = 'city-points-halo'
const CITY_LABELS = 'city-labels'
const LABEL_MIN_POPULATION = 350_000

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
        label: city.population >= LABEL_MIN_POPULATION || city.slug === focusedSlug ? 1 : 0,
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

function populationRadius(touchUi: boolean): maplibregl.ExpressionSpecification {
  // Use raw population (not sqrt) so mid-size cities stay visible at U.S. zoom.
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    2,
    [
      'interpolate',
      ['linear'],
      ['get', 'population'],
      50_000,
      touchUi ? 5 : 4,
      300_000,
      touchUi ? 8 : 6,
      1_000_000,
      touchUi ? 11 : 9,
      5_000_000,
      touchUi ? 16 : 13,
    ],
    5,
    [
      'interpolate',
      ['linear'],
      ['get', 'population'],
      50_000,
      touchUi ? 8 : 6,
      300_000,
      touchUi ? 12 : 10,
      1_000_000,
      touchUi ? 16 : 13,
      5_000_000,
      touchUi ? 22 : 18,
    ],
    8,
    [
      'interpolate',
      ['linear'],
      ['get', 'population'],
      50_000,
      touchUi ? 10 : 8,
      300_000,
      touchUi ? 15 : 12,
      1_000_000,
      touchUi ? 20 : 16,
      5_000_000,
      touchUi ? 28 : 22,
    ],
  ]
}

function ensureCityLayers(map: maplibregl.Map, touchUi: boolean) {
  if (!map.getSource(CITY_SOURCE)) {
    map.addSource(CITY_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }

  if (!map.getLayer(CITY_LAYER_HALO)) {
    map.addLayer({
      id: CITY_LAYER_HALO,
      type: 'circle',
      source: CITY_SOURCE,
      paint: {
        'circle-radius': populationRadius(touchUi),
        'circle-color': '#ffffff',
        'circle-opacity': 0.9,
        'circle-blur': 0.15,
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
          ['zoom'],
          2,
          [
            'interpolate',
            ['linear'],
            ['get', 'population'],
            50_000,
            touchUi ? 3.5 : 3,
            300_000,
            touchUi ? 6 : 5,
            1_000_000,
            touchUi ? 9 : 7,
            5_000_000,
            touchUi ? 13 : 11,
          ],
          5,
          [
            'interpolate',
            ['linear'],
            ['get', 'population'],
            50_000,
            touchUi ? 6 : 5,
            300_000,
            touchUi ? 10 : 8,
            1_000_000,
            touchUi ? 13 : 11,
            5_000_000,
            touchUi ? 18 : 15,
          ],
          8,
          [
            'interpolate',
            ['linear'],
            ['get', 'population'],
            50_000,
            touchUi ? 8 : 6,
            300_000,
            touchUi ? 12 : 10,
            1_000_000,
            touchUi ? 16 : 13,
            5_000_000,
            touchUi ? 22 : 18,
          ],
        ],
        'circle-color': [
          'case',
          ['boolean', ['get', 'focused'], false],
          '#f0a202',
          '#0f6b5c',
        ],
        'circle-opacity': 0.95,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    })
  }

  if (!map.getLayer(CITY_LABELS)) {
    map.addLayer({
      id: CITY_LABELS,
      type: 'symbol',
      source: CITY_SOURCE,
      filter: ['==', ['get', 'label'], 1],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': touchUi ? 12 : 11,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-optional': true,
        'text-padding': 2,
        'symbol-sort-key': ['-', ['get', 'population']],
      },
      paint: {
        'text-color': '#14201c',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.4,
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
      center: focusRef.current?.coordinates ?? [-97.5, 38.5],
      zoom: focusRef.current ? (narrow ? 7.1 : 8.5) : narrow ? 3.35 : 3.85,
      minZoom: 2,
      maxZoom: 14,
      attributionControl: false,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    const openCity = (event: MapLayerMouseEvent) => {
      const slug = event.features?.[0]?.properties?.slug as string | undefined
      const stateSlug = event.features?.[0]?.properties?.stateSlug as string | undefined
      if (!slug || !stateSlug) return
      router.push(cityPath({ slug, stateSlug }))
    }

    const bindInteractions = () => {
      if (interactionsBound) return
      interactionsBound = true

      map.on('click', CITY_LAYER, openCity)
      map.on('click', CITY_LABELS, openCity)
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
      {ready && (
        <div className="map-legend" role="note">
          <span className="map-legend-dot" aria-hidden />
          <span>
            <strong>{cities.length} cities</strong>
            {' — '}
            larger dots = bigger population. Tap a dot for cost of living, housing, safety & climate.
          </span>
        </div>
      )}
      {!ready && <div className="city-map-loader">Loading map…</div>}
    </div>
  )
}
