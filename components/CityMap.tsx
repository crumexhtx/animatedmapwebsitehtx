'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as maplibregl from 'maplibre-gl'
import type { MapCity } from '@/lib/map-data'
import { cityPath } from '@/lib/paths'
import 'maplibre-gl/dist/maplibre-gl.css'

/** Voyager raster basemap — city markers are DOM overlays (reliable on mobile). */
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'MapsToIt cities',
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

type CityMapProps = {
  cities: MapCity[]
  focus?: MapCity | null
  className?: string
  variant?: 'default' | 'hero'
}

function markerSize(population: number, touchUi: boolean) {
  const min = touchUi ? 12 : 10
  const max = touchUi ? 28 : 24
  const t = Math.min(1, Math.max(0, (Math.sqrt(population) - 220) / 2600))
  return Math.round(min + t * (max - min))
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

export function CityMap({
  cities,
  focus = null,
  className,
  variant = 'default',
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const router = useRouter()
  const touchUi = useTouchUi()
  const [ready, setReady] = useState(false)
  const focusRef = useRef(focus)
  focusRef.current = focus

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const narrow = window.matchMedia('(max-width: 720px)').matches
    let cancelled = false
    let readySet = false

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

    map.on('load', markReady)
    map.on('error', (event) => {
      console.warn('MapLibre error', event.error)
      markReady()
    })

    const observer = new ResizeObserver(() => forceResize())
    observer.observe(containerRef.current)

    if (map.loaded()) markReady()

    return () => {
      cancelled = true
      observer.disconnect()
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Place / refresh city markers once the map is ready.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    const sorted = [...cities].sort((a, b) => a.population - b.population)

    for (const city of sorted) {
      const size = markerSize(city.population, touchUi)
      const focused = focus?.slug === city.slug
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `city-marker${focused ? ' is-focused' : ''}`
      button.style.width = `${size}px`
      button.style.height = `${size}px`
      button.setAttribute('aria-label', `${city.name}, ${city.stateCode}`)
      button.title = `${city.name}, ${city.stateCode}`

      if (city.population >= 350_000 || focused) {
        const label = document.createElement('span')
        label.className = 'city-marker-label'
        label.textContent = city.name
        button.appendChild(label)
      }

      button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        router.push(cityPath(city))
      })

      const marker = new maplibregl.Marker({
        element: button,
        anchor: 'center',
      })
        .setLngLat(city.coordinates)
        .addTo(map)

      markersRef.current.push(marker)
    }
  }, [ready, cities, focus, touchUi, router])

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
