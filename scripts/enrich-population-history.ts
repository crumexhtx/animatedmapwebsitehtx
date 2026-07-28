/**
 * Pull annual city population estimates from the Census Bureau's Population
 * Estimates Program (PEP) API (api.census.gov). A free CENSUS_API_KEY is required
 * — without it the API returns an HTML "Missing Key" page (HTTP 200) instead of JSON.
 * Request a key at https://api.census.gov/data/key_signup.html
 *
 * Reuses the place GEOID already resolved in data/raw/enrichments/census.json
 * (enrich-census.ts) instead of re-geocoding every city.
 *
 * Census API coverage for place-level PEP totals:
 *   - Vintage 2019 (`/data/2019/pep/population`) exposes a DATE_CODE time series
 *     covering July 1 estimates for 2010–2019 for places — one call per state.
 *   - Per-year paths like `/data/2011/pep/population` do not exist (404 / HTML).
 *   - Post-2019 place totals are not on the Census API ("current estimates are
 *     unable to be supported by the API at this time"), so we optionally append
 *     the ACS 5-year population from the census enrichment as a recent anchor.
 *
 * Output: data/raw/enrichments/population-history.json
 */

import { fetchJson, readEnrichment, sleep, writeEnrichment } from './lib/io'
import type { CensusEnrichment } from './enrich-census'

const API_KEY = process.env.CENSUS_API_KEY
const HISTORY_YEARS = 15
/** Last place-level PEP totals vintage available on the Census API. */
const LEGACY_VINTAGE = 2019
const ACS_ANCHOR_YEAR = 2023

const LATEST_YEAR = Math.max(LEGACY_VINTAGE, ACS_ANCHOR_YEAR)
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
  return `${url}${url.includes('?') ? '&' : '?'}key=${API_KEY}`
}

/**
 * Vintage 2019 DATE_CODE → calendar year for July 1 resident population estimates.
 * Codes 1–2 are April 1, 2010 census / estimates base (skipped); 3–12 are 7/1/2010–2019.
 */
function yearFromDateCode(dateCode: number, dateDesc?: string): number | null {
  if (dateDesc) {
    // e.g. "7/1/2015 population estimate"
    const july = /7\/1\/(\d{4})/i.exec(dateDesc)
    if (july) return Number(july[1])
    return null
  }
  if (dateCode >= 3 && dateCode <= 12) return 2007 + dateCode
  return null
}

/**
 * One call per state — returns July 1 place estimates for 2010–2019 via DATE_CODE.
 */
async function fetchLegacyDecade(stateFips: string) {
  const url = withKey(
    `https://api.census.gov/data/${LEGACY_VINTAGE}/pep/population` +
      `?get=NAME,POP,DATE_CODE,DATE_DESC&for=place:*&in=state:${stateFips}`,
  )
  const rows = await fetchJson<string[][]>(url)
  const [header, ...body] = rows
  const colIndex = new Map(header.map((name, index) => [name, index]))
  const placeIndex = colIndex.get('place')
  const popIndex = colIndex.get('POP')
  const dateCodeIndex = colIndex.get('DATE_CODE')
  const dateDescIndex = colIndex.get('DATE_DESC')
  if (placeIndex == null || popIndex == null || dateCodeIndex == null) {
    throw new Error('missing place/POP/DATE_CODE column')
  }

  const byPlace = new Map<string, Array<{ year: number; population: number }>>()
  for (const row of body) {
    const dateCode = Number(row[dateCodeIndex])
    const dateDesc = dateDescIndex != null ? row[dateDescIndex] : undefined
    const year = yearFromDateCode(dateCode, dateDesc)
    if (year == null || year < EARLIEST_YEAR) continue
    const value = Number(row[popIndex])
    if (!Number.isFinite(value) || value <= 0) continue

    const placeFips = row[placeIndex]
    const existing = byPlace.get(placeFips) ?? []
    // Prefer the first July 1 point for a year; skip duplicates.
    if (existing.some((point) => point.year === year)) continue
    existing.push({ year, population: value })
    byPlace.set(placeFips, existing)
  }
  return byPlace
}

async function main() {
  if (!API_KEY) {
    console.error(
      'population-history: CENSUS_API_KEY is required.\n' +
        '  1. Request a free key: https://api.census.gov/data/key_signup.html\n' +
        '  2. Then run (PowerShell):\n' +
        '     $env:CENSUS_API_KEY="your-key-here"\n' +
        '     npm run enrich:population-history',
    )
    process.exit(1)
  }

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
    `population-history: fetching PEP ${LEGACY_VINTAGE} time series (2010–2019) for ${places.length} cities across ${byState.size} states`,
  )

  let stateIndex = 0
  for (const [stateFips, list] of byState) {
    stateIndex += 1
    process.stdout.write(`\r[legacy decade ${stateIndex}/${byState.size}] state ${stateFips}          `)
    try {
      const byPlace = await fetchLegacyDecade(stateFips)
      for (const place of list) {
        const points = byPlace.get(place.placeFips)
        if (!points?.length) continue
        const existing = pointsBySlug.get(place.slug) ?? []
        pointsBySlug.set(place.slug, [...existing, ...points])
      }
    } catch (error) {
      console.warn(`\npopulation-history: ${LEGACY_VINTAGE} time-series fetch failed for state ${stateFips}:`, error)
    }
    await sleep(200)
  }
  console.log('')

  // ACS anchor — Census API no longer publishes post-2019 place PEP totals.
  let acsAnchors = 0
  for (const place of places) {
    const acs = census.cities[place.slug]
    if (!acs?.population) continue
    const existing = pointsBySlug.get(place.slug) ?? []
    if (existing.some((point) => point.year === ACS_ANCHOR_YEAR)) continue
    existing.push({ year: ACS_ANCHOR_YEAR, population: Math.round(acs.population) })
    pointsBySlug.set(place.slug, existing)
    acsAnchors += 1
  }
  console.log(`population-history: appended ACS ${ACS_ANCHOR_YEAR} population for ${acsAnchors} cities`)

  const cities: PopulationHistoryEnrichment['cities'] = {}
  let ok = 0
  for (const [slug, points] of pointsBySlug) {
    if (points.length < 2) continue // a single point isn't a trend
    const sorted = [...points].sort((a, b) => a.year - b.year)
    const hasAcs = sorted.some((point) => point.year === ACS_ANCHOR_YEAR)
    cities[slug] = {
      points: sorted,
      source: hasAcs
        ? `U.S. Census Bureau PEP (2010–2019) + ACS ${ACS_ANCHOR_YEAR} 5-year`
        : `U.S. Census Bureau Population Estimates Program, ${sorted[0].year}-${sorted[sorted.length - 1].year}`,
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
