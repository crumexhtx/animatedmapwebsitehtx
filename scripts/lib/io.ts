import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CityRecord } from '../lib/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(__dirname, '..', '..')
export const SEED_PATH = join(ROOT, 'data', 'raw', 'cities-seed.json')
export const ENRICH_DIR = join(ROOT, 'data', 'raw', 'enrichments')

export function loadSeedCities(): CityRecord[] {
  return JSON.parse(readFileSync(SEED_PATH, 'utf8')) as CityRecord[]
}

export function writeEnrichment(name: string, payload: unknown) {
  mkdirSync(ENRICH_DIR, { recursive: true })
  const path = join(ENRICH_DIR, `${name}.json`)
  writeFileSync(path, JSON.stringify(payload, null, 2))
  return path
}

export function readEnrichment<T>(name: string): T | null {
  const path = join(ENRICH_DIR, `${name}.json`)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MapsToItCatalogBot/1.0 (research; contact hello@mapstoit.com)',
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${response.status} ${url} :: ${body.slice(0, 200)}`)
  }
  return response.json() as Promise<T>
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'MapsToItCatalogBot/1.0 (research; contact hello@mapstoit.com)',
    },
  })
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`)
  }
  return response.text()
}

export function haversineMiles(
  a: [number, number],
  b: [number, number],
) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
