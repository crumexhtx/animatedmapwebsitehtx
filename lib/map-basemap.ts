import type { StyleSpecification } from 'maplibre-gl'

const CARTO_SUBDOMAINS = ['a', 'b', 'c', 'd'] as const

/** CARTO raster tiles now require a free API key — see https://carto.com/basemaps/apikey */
export function cartoApiKey() {
  return process.env.NEXT_CARTO_API_KEY?.trim() || ''
}

function cartoTileUrl(subdomain: string, key: string) {
  return `https://${subdomain}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`
}

function osmTileUrl() {
  return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
}

export type BasemapProvider = 'carto' | 'osm'

/** Pick basemap at build/runtime. Without a CARTO key we use OSM so visitors never see the watermark. */
export function resolveBasemapProvider(): BasemapProvider {
  return cartoApiKey() ? 'carto' : 'osm'
}

export function buildRasterBasemapStyle(provider: BasemapProvider = resolveBasemapProvider()): StyleSpecification {
  const key = cartoApiKey()
  const useCarto = provider === 'carto' && Boolean(key)

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
