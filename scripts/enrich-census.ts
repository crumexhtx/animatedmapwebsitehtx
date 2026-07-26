/**
 * Enrich cities with ACS 5-year estimates from Census Bureau summary files
 * (www2.census.gov — no API key required).
 *
 * Resolves each city to an incorporated place / CDP via the Census Geocoder,
 * then looks up population, median household income, median home value, and
 * median gross rent from ACS 2023 5-year detailed tables.
 *
 * Output: data/raw/enrichments/census.json
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { loadSeedCities, sleep, writeEnrichment, ROOT } from './lib/io'

const ACS_YEAR = '2023'
const BASE = `https://www2.census.gov/programs-surveys/acs/summary_file/${ACS_YEAR}/table-based-SF/data/5YRData`
const TABLES = {
  population: 'acsdt5y2023-b01003.dat',
  income: 'acsdt5y2023-b19013.dat',
  homeValue: 'acsdt5y2023-b25077.dat',
  rent: 'acsdt5y2023-b25064.dat',
} as const

const CACHE_DIR = join(ROOT, 'data', 'raw', 'cache', 'acs')

export type CensusEnrichment = {
  generatedAt: string
  vintage: string
  national: {
    medianHomeValue: number
    medianGrossRent: number
    medianHouseholdIncome: number
  }
  cities: Record<
    string,
    {
      geoid: string
      placeName: string
      population: number
      medianHouseholdIncome: number
      medianHomePrice: number
      medianRent: number
      costOfLivingIndex: number
      source: string
    }
  >
}

type PlaceHit = { geoid: string; name: string }

async function downloadFile(url: string, dest: string) {
  if (existsSync(dest)) {
    console.log(`cache hit ${dest}`)
    return
  }
  mkdirSync(CACHE_DIR, { recursive: true })
  console.log(`downloading ${url}`)
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MapsToItCatalogBot/1.0 (research; contact hello@mapstoit.com)' },
  })
  if (!response.ok || !response.body) throw new Error(`download failed ${response.status} ${url}`)
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(dest))
}

function parseEstimate(raw: string | undefined): number | null {
  if (raw == null) return null
  const value = Number(raw)
  // Census uses large negative sentinels for N/A
  if (!Number.isFinite(value) || value < -100000) return null
  return value
}

/** Load GEO_ID → estimate for one ACS .dat table (pipe-delimited). */
function loadTableEstimates(path: string, needed: Set<string>): Map<string, number> {
  const text = readFileSync(path, 'utf8')
  const map = new Map<string, number>()
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('GEO_ID')) continue
    const [geoId, estimate] = line.split('|')
    if (!needed.has(geoId)) continue
    const value = parseEstimate(estimate)
    if (value != null) map.set(geoId, value)
  }
  return map
}

/** Known ACS place GEOIDs where the coordinate geocoder returns a non-ACS / consolidated mismatch. */
const PLACE_OVERRIDES: Record<string, PlaceHit> = {
  // Louisville–Jefferson County metro government (balance)
  'louisville-ky': {
    geoid: '1600000US2148006',
    name: 'Louisville/Jefferson County metro government (balance), Kentucky',
  },
}

async function geocodePlace(lon: number, lat: number): Promise<PlaceHit | null> {
  const url =
    `https://geocoding.geo.census.gov/geocoder/geographies/coordinates` +
    `?x=${lon}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MapsToItCatalogBot/1.0 (research; contact hello@mapstoit.com)' },
  })
  if (!response.ok) throw new Error(`geocoder HTTP ${response.status}`)
  const json = (await response.json()) as {
    result?: {
      geographies?: {
        'Incorporated Places'?: Array<{ GEOID: string; NAME: string }>
        'Census Designated Places'?: Array<{ GEOID: string; NAME: string }>
      }
    }
  }
  const geos = json.result?.geographies
  const place = geos?.['Incorporated Places']?.[0] ?? geos?.['Census Designated Places']?.[0]
  if (!place?.GEOID) return null
  // Table GEO_IDs use 1600000US{state+place}
  return { geoid: `1600000US${place.GEOID}`, name: place.NAME }
}

function costIndex(home: number, rent: number, natHome: number, natRent: number) {
  const parts = [home / natHome, rent / natRent].filter((v) => Number.isFinite(v) && v > 0)
  if (!parts.length) return null
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100)
}

async function main() {
  const seed = loadSeedCities()
  mkdirSync(CACHE_DIR, { recursive: true })

  const paths: Record<keyof typeof TABLES, string> = {
    population: join(CACHE_DIR, TABLES.population),
    income: join(CACHE_DIR, TABLES.income),
    homeValue: join(CACHE_DIR, TABLES.homeValue),
    rent: join(CACHE_DIR, TABLES.rent),
  }

  for (const [key, file] of Object.entries(TABLES) as Array<[keyof typeof TABLES, string]>) {
    await downloadFile(`${BASE}/${file}`, paths[key])
  }

  const placeBySlug = new Map<string, PlaceHit>()
  let geoOk = 0
  for (let i = 0; i < seed.length; i++) {
    const city = seed[i]
    process.stdout.write(`\rgeocode [${i + 1}/${seed.length}] ${city.slug}          `)
    if (PLACE_OVERRIDES[city.slug]) {
      placeBySlug.set(city.slug, PLACE_OVERRIDES[city.slug])
      geoOk += 1
      continue
    }
    try {
      const [lon, lat] = city.coordinates
      const hit = await geocodePlace(lon, lat)
      if (hit) {
        placeBySlug.set(city.slug, hit)
        geoOk += 1
      } else {
        console.warn(`\ngeocode miss ${city.slug}`)
      }
    } catch (error) {
      console.warn(`\ngeocode fail ${city.slug}:`, error)
    }
    await sleep(80)
  }
  console.log(`\nGeocoded ${geoOk}/${seed.length} places`)

  const needed = new Set<string>(['0100000US'])
  for (const hit of placeBySlug.values()) needed.add(hit.geoid)

  console.log('Indexing ACS tables…')
  const pop = loadTableEstimates(paths.population, needed)
  const income = loadTableEstimates(paths.income, needed)
  const home = loadTableEstimates(paths.homeValue, needed)
  const rent = loadTableEstimates(paths.rent, needed)

  const natHome = home.get('0100000US')
  const natRent = rent.get('0100000US')
  const natIncome = income.get('0100000US')
  if (natHome == null || natRent == null || natIncome == null) {
    throw new Error('Missing national ACS baselines (0100000US)')
  }

  const cities: CensusEnrichment['cities'] = {}
  let ok = 0
  for (const city of seed) {
    const hit = placeBySlug.get(city.slug)
    if (!hit) continue
    const population = pop.get(hit.geoid)
    const medianHouseholdIncome = income.get(hit.geoid)
    const medianHomePrice = home.get(hit.geoid)
    const medianRent = rent.get(hit.geoid)
    if (
      population == null ||
      medianHouseholdIncome == null ||
      medianHomePrice == null ||
      medianRent == null
    ) {
      console.warn(`acs incomplete ${city.slug} ${hit.geoid}`)
      continue
    }
    const col = costIndex(medianHomePrice, medianRent, natHome, natRent)
    if (col == null) continue
    cities[city.slug] = {
      geoid: hit.geoid,
      placeName: hit.name,
      population: Math.round(population),
      medianHouseholdIncome: Math.round(medianHouseholdIncome),
      medianHomePrice: Math.round(medianHomePrice),
      medianRent: Math.round(medianRent),
      costOfLivingIndex: col,
      source: `U.S. Census Bureau ACS ${ACS_YEAR} 5-year (${hit.name}, ${hit.geoid})`,
    }
    ok += 1
  }

  const payload: CensusEnrichment = {
    generatedAt: new Date().toISOString(),
    vintage: `ACS ${ACS_YEAR} 5-year`,
    national: {
      medianHomeValue: Math.round(natHome),
      medianGrossRent: Math.round(natRent),
      medianHouseholdIncome: Math.round(natIncome),
    },
    cities,
  }
  const out = writeEnrichment('census', payload)
  console.log(`Wrote ${ok}/${seed.length} census enrichments → ${out}`)
  if (ok < seed.length * 0.85) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
