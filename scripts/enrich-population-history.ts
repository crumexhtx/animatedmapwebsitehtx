/**
 * Pull annual city population estimates from the Census Bureau's Population
 * Estimates Program (PEP) API (api.census.gov — no key required, though
 * setting CENSUS_API_KEY raises the rate limit) for the ~15 years covered
 * by CityRecord.populationHistory.
 *
 * Reuses the place GEOID already resolved in data/raw/enrichments/census.json
 * (enrich-census.ts) instead of re-geocoding every city.
 *
 * PEP's API shape has changed across vintages, so this makes two kinds of
 * calls and treats each year independently — a year or a city missing data
 * is logged and skipped rather than failing the whole run:
 *   - 2020+ (current decade): one call per state returns every year since
 *     the 2020 census in a single response via POP_<year> columns.
 *   - pre-2020 (last decade): PEP published one dataset per vintage year,
 *     each returning that single year's estimate via a POP column — so this
 *     issues one call per state per year.
 *
 * Output: data/raw/enrichments/population-history.json
 */

import { fetchJson, readEnrichment, sleep, writeEnrichment } from './lib/io'
import type { CensusEnrichment } from './enrich-census'

const API_KEY = process.env.CENSUS_API_KEY
const HISTORY_YEARS = 15
const CURRENT_DECADE_START = 2020

const now = new Date()
// Census typically publishes a vintage's estimates roughly a year after the
// reference date, so the latest *requestable* year usually lags "today".
const LATEST_YEAR = now.getFullYear() - 1
const EARLIEST_YEAR = LATEST_YEAR - (HISTORY_YEARS - 1)

type PlaceRow = { geoid: string; slug: string; stateFips: string; placeFips: string }

export type PopulationHistoryEnrichment = {
  generatedAt: string
  earliestYear: number
  latestYear: number
  cities: Record<
    string,
    {
      points: Array<{ year: number; population: number }>
      source: string
    }
  >
}

function parseGeoid(geoid: string): { stateFips: string; placeFips: string } | null {
  // Table GEO_IDs look like 1600000US{2-digit state fips}{5-digit place fips}
  const match = /^1600000US(\d{2})(\d{5})$/.exec(geoid)
  if (!match) return null
  return { stateFips: match[1], placeFips: match[2] }
}

function withKey(url: string) {
  return API_KEY ? `${url}&key=${API_KEY}` : url
}

/** One call per state, covers every year from CURRENT_DECADE_START through `vintage`. */
async function fetchCurrentDecade(stateFips: string, vintage: number) {
  const years = []
  for (let year = CURRENT_DECADE_START; year <= vintage; year += 1) years.push(year)
  const popVars = years.map((year) => `POP_${year}`)
  const url = withKey(
    `https://api.census.gov/data/${vintage}/pep/population` +
      `?get=NAME,${popVars.join(',')}&for=place:*&in=state:${stateFips}`,
  )
  const rows = await fetchJson<string[][]>(url)
  const [header, ...body] = rows
  const colIndex = new Map(header.map((name, index) => [name, index]))
  const placeIndex = colIndex.get('place')
  if (placeIndex == null) throw new Error('missing place column')

  const byPlace = new Map<string, Array<{ year: number; population: number }>>()
  for (const row of body) {
    const placeFips = row[placeIndex]
    const points: Array<{ year: number; population: number }> = []
    for (const year of years) {
      const idx = colIndex.get(`POP_${year}`)
      if (idx == null) continue
      const value = Number(row[idx])
      if (Number.isFinite(value) && value > 0) points.push({ year, population: value })
    }
    if (points.length) byPlace.set(placeFips, points)
  }
  return byPlace
}

/** One call per state per year — PEP's pre-2020 vintages only expose a single year each. */
async function fetchLegacyYear(stateFips: string, year: number) {
  const url = withKey(
    `https://api.census.gov/data/${year}/pep/population?get=POP,GEONAME&for=place:*&in=state:${stateFips}`,
  )
  const rows = await fetchJson<string[][]>(url)
  const [header, ...body] = rows
  const colIndex = new Map(header.map((name, index) => [name, index]))
  const placeIndex = colIndex.get('place')
  const popIndex = colIndex.get('POP')
  if (placeIndex == null || popIndex == null) throw new Error('missing place/POP column')

  const byPlace = new Map<string, number>()
  for (const row of body) {
    const value = Number(row[popIndex])
    if (Number.isFinite(value) && value > 0) byPlace.set(row[placeIndex], value)
  }
  return byPlace
}

async function main() {
  const census = readEnrichment<CensusEnrichment>('census')
  if (!census) {
    console.error('population-history: run enrich-census first (needs cached place GEOIDs)')
    process.exit(1)
  }

  const places: PlaceRow[] = []
  for (const [slug, row] of Object.entries(census.cities)) {
    const parsed = parseGeoid(row.geoid)
    if (!parsed) {
      console.warn(`population-history: could not parse geoid for ${slug} (${row.geoid})`)
      continue
    }
    places.push({ geoid: row.geoid, slug, ...parsed })
  }

  const byState = new Map<string, PlaceRow[]>()
  for (const place of places) {
    const list = byState.get(place.stateFips) ?? []
    list.push(place)
    byState.set(place.stateFips, list)
  }

  const pointsBySlug = new Map<string, Array<{ year: number; population: number }>>()

  console.log(
    `population-history: fetching ${EARLIEST_YEAR}-${LATEST_YEAR} for ${places.length} cities across ${byState.size} states`,
  )

  // Current-decade estimates (one call per state).
  let stateIndex = 0
  for (const [stateFips, list] of byState) {
    stateIndex += 1
    process.stdout.write(`\r[current decade ${stateIndex}/${byState.size}] state ${stateFips}          `)
    try {
      const byPlace = await fetchCurrentDecade(stateFips, Math.min(LATEST_YEAR, now.getFullYear()))
      for (const place of list) {
        const points = byPlace.get(place.placeFips)
        if (!points) continue
        const existing = pointsBySlug.get(place.slug) ?? []
        pointsBySlug.set(place.slug, [...existing, ...points])
      }
    } catch (error) {
      console.warn(`\npopulation-history: current-decade fetch failed for state ${stateFips}:`, error)
    }
    await sleep(150)
  }
  console.log('')

  // Legacy per-year estimates for years before the current decade.
  for (let year = Math.max(EARLIEST_YEAR, 2010); year < CURRENT_DECADE_START; year += 1) {
    stateIndex = 0
    for (const [stateFips, list] of byState) {
      stateIndex += 1
      process.stdout.write(`\r[${year} ${stateIndex}/${byState.size}] state ${stateFips}          `)
      try {
        const byPlace = await fetchLegacyYear(stateFips, year)
        for (const place of list) {
          const population = byPlace.get(place.placeFips)
          if (population == null) continue
          const existing = pointsBySlug.get(place.slug) ?? []
          pointsBySlug.set(place.slug, [...existing, { year, population }])
        }
      } catch (error) {
        console.warn(`\npopulation-history: ${year} fetch failed for state ${stateFips}:`, error)
      }
      await sleep(150)
    }
    console.log('')
  }

  const cities: PopulationHistoryEnrichment['cities'] = {}
  let ok = 0
  for (const [slug, points] of pointsBySlug) {
    if (points.length < 2) continue // a single point isn't a trend
    const sorted = [...points].sort((a, b) => a.year - b.year)
    cities[slug] = {
      points: sorted,
      source: `U.S. Census Bureau Population Estimates Program, ${sorted[0].year}-${sorted[sorted.length - 1].year}`,
    }
    ok += 1
  }

  const payload: PopulationHistoryEnrichment = {
    generatedAt: new Date().toISOString(),
    earliestYear: EARLIEST_YEAR,
    latestYear: LATEST_YEAR,
    cities,
  }
  const out = writeEnrichment('population-history', payload)
  console.log(`Wrote ${ok}/${places.length} population-history enrichments → ${out}`)
  if (ok === 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
