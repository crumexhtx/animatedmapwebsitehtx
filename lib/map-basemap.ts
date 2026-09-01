import type { StyleSpecification } from 'maplibre-gl'

const CARTO_SUBDOMAINS = ['a', 'b', 'c', 'd'] as const

let warnedOsmFallback = false

/**
 * CARTO basemap keys are browser keys (like Google Maps) — restrict by HTTP referrer
 * in the CARTO dashboard, not by hiding the value. Must use NEXT_PUBLIC_ so Next.js
 * inlines it into client bundles (CityMap is a client component).
 */
export function cartoApiKey() {
  return process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim() || ''
}

function cartoTileUrl(subdomain: string, key: string) {
  return `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`
}

function osmTileUrl() {
  return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
}

export type BasemapProvider = 'carto' | 'osm'

/** Pick basemap at runtime. Without a CARTO key we fall back to OSM (see warn below). */
export function resolveBasemapProvider(): BasemapProvider {
  return cartoApiKey() ? 'carto' : 'osm'
}

function warnOsmFallbackOnce() {
  if (warnedOsmFallback || typeof console === 'undefined') return
  warnedOsmFallback = true
  console.warn(
    '[MapsToIt] CARTO basemap key missing or invalid — using OpenStreetMap tiles. ' +
      'OSM tile servers are for light/non-production use only; set NEXT_PUBLIC_CARTO_API_KEY ' +
      'or configure an alternate paid tile provider before scaling traffic.',
  )
}

export function buildRasterBasemapStyle(provider: BasemapProvider = resolveBasemapProvider()): StyleSpecification {
  const key = cartoApiKey()
  const useCarto = provider === 'carto' && Boolean(key)

  if (!useCarto) warnOsmFallbackOnce()

  const tiles = useCarto
    ? CARTO_SUBDOMAINS.map((subdomain) => cartoTileUrl(subdomain, key))
    : [osmTileUrl()]

  const attribution = useCarto
    ? '© <a href="https://carto.com/attributions">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

  return {
    version: 8,
    name: useCarto ? 'MapsToIt cities (CARTO Voyager)' : 'MapsToIt cities (OpenStreetMap)',
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles,
        tileSize: 256,
        attribution,
        maxzoom: useCarto ? 20 : 19,
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
}

/** @internal Test helper — whether tile URLs include a CARTO key query param. */
export function cartoTilesIncludeKey(style: StyleSpecification) {
  const source = style.sources?.['raster-tiles']
  if (!source || source.type !== 'raster') return false
  const tiles = source.tiles ?? []
  return tiles.some((url) => /[?&]key=.+/.test(url))
}
