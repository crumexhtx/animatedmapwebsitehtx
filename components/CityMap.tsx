'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ScatterplotLayer } from '@deck.gl/layers'
import type { PickingInfo } from '@deck.gl/core'
import type { CityRecord } from '@/lib/types'
import { cityPath } from '@/lib/paths'
import 'maplibre-gl/dist/maplibre-gl.css'

const BASE_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#d9e4dc' } }],
}

type CityMapProps = {
  cities: CityRecord[]
  focus?: CityRecord | null
  className?: string
}

export function CityMap({ cities, focus = null, className }: CityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: focus?.coordinates ?? [-98.35, 39.5],
      zoom: focus ? 8.5 : 3.6,
      minZoom: 2.8,
      maxZoom: 12,
      attributionControl: false,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    const overlay = new MapboxOverlay({ interleaved: false, layers: [] })
    map.addControl(overlay as unknown as maplibregl.IControl)
    overlayRef.current = overlay

    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      setReady(true)
    }

    map.once('load', settle)
    map.on('error', () => {
      if (settled) return
      map.setStyle(FALLBACK_STYLE)
      map.once('idle', settle)
    })

    const observer = new ResizeObserver(() => map.resize())
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      overlayRef.current = null
      map.remove()
      mapRef.current = null
    }
    // Mount once; focus changes are handled in a separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready || !overlayRef.current) return

    overlayRef.current.setProps({
      layers: [
        new ScatterplotLayer<CityRecord>({
          id: 'city-points',
          data: cities,
          pickable: true,
          opacity: 0.9,
          stroked: true,
          filled: true,
          radiusScale: 1,
          radiusMinPixels: 4,
          radiusMaxPixels: 18,
          lineWidthMinPixels: 1,
          getPosition: (city) => city.coordinates,
          getRadius: (city) => Math.sqrt(city.population) * 0.9,
          getFillColor: (city) =>
            focus?.slug === city.slug ? [14, 90, 78, 255] : [28, 120, 104, 200],
          getLineColor: [255, 255, 255, 220],
          onClick: (info: PickingInfo<CityRecord>) => {
            if (!info.object) return
            router.push(cityPath(info.object))
          },
        }),
      ],
    })
  }, [ready, cities, focus, router])

  useEffect(() => {
    if (!ready || !mapRef.current || !focus) return
    mapRef.current.easeTo({
      center: focus.coordinates,
      zoom: Math.max(mapRef.current.getZoom(), 8.2),
      duration: 900,
    })
  }, [ready, focus])

  return (
    <div className={`city-map ${className ?? ''}`}>
      <div ref={containerRef} className="city-map-canvas" />
      {!ready && <div className="city-map-loader">Loading map…</div>}
    </div>
  )
}
