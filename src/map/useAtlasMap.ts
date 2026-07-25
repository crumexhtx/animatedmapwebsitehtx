import { useEffect, useRef, useState, type RefObject } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, MapLayerMouseEvent, StyleSpecification } from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { availableCountries } from '../data'

const COUNTRIES_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
const BASE_STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const OFFLINE_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e8e6e1' } }],
}
const STYLE_LOAD_TIMEOUT_MS = 8000

export function useAtlasMap(
  mapContainer: RefObject<HTMLDivElement | null>,
  onCountryClick: (country: string, countryCode?: string) => void,
) {
  const mapRef = useRef<MapLibreMap | null>(null)
  const deckOverlayRef = useRef<MapboxOverlay | null>(null)
  const onCountryClickRef = useRef(onCountryClick)
  const [mapReady, setMapReady] = useState(false)
  const [allCountries, setAllCountries] = useState<string[]>(availableCountries)
  const [countryCodes, setCountryCodes] = useState<Record<string, string>>({})

  useEffect(() => {
    onCountryClickRef.current = onCountryClick
  })

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: BASE_STYLE_URL,
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

    let initialized = false
    let fallenBack = false

    function initializeCountryLayers() {
      if (initialized) return
      initialized = true
      window.clearTimeout(fallbackTimer)
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
        if (country) onCountryClickRef.current(country, code)
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
    }

    function fallBackToOfflineStyle() {
      if (fallenBack || initialized) return
      fallenBack = true
      map.once('idle', initializeCountryLayers)
      map.setStyle(OFFLINE_FALLBACK_STYLE)
    }

    map.once('load', initializeCountryLayers)
    map.on('error', (event) => {
      console.error('Map style failed to load, falling back to offline style:', event.error)
      fallBackToOfflineStyle()
    })
    const fallbackTimer = window.setTimeout(fallBackToOfflineStyle, STYLE_LOAD_TIMEOUT_MS)

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

    return () => {
      window.clearTimeout(fallbackTimer)
      deckOverlayRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [mapContainer])

  useEffect(() => {
    if (!mapContainer.current) return
    const container = mapContainer.current
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [mapContainer])

  return {
    mapRef,
    deckOverlayRef,
    mapReady,
    allCountries,
    countryCodes,
  }
}
