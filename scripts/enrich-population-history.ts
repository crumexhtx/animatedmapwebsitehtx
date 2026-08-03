/**
 * Pull annual city population estimates from Census Bureau PEP city/town CSVs
 * on www2.census.gov (no API key required).
 *
 * Reuses place GEOIDs from data/raw/enrichments/census.json.
 *
 * Sources:
 *   - 2010–2019: sub-est2019_all.csv (SUMLEV 162 incorporated places)
 *   - 2020–2024: sub-est2024.csv
 *
 * Output: data/raw/enrichments/population-history.json
 */

import { readEnrichment, writeEnrichment } from './lib/io'
import type { CensusEnrichment } from './enrich-census'

const LEGACY_CSV =
  'https://www2.census.gov/programs-surveys/popest/datasets/2010-2019/cities/totals/sub-est2019_all.csv'
const CURRENT_CSV =
  'https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/cities/totals/sub-est2024.csv'

const LEGACY_YEARS = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019] as const
const CURRENT_YEARS = [2020, 2021, 2022, 2023, 2024] as const

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
  const match = /^1600000US(\d{2})(\d{5})$/.exec(geoid)
  if (!match) return null
  return { stateFips: match[1], placeFips: match[2] }
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current)
  return cells
}

async function loadCsv(url: string) {
  console.log(`population-history: downloading ${url.split('/').slice(-2).join('/')}`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  const text = await response.text()
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0)
  const header = parseCsvLine(lines[0])
  const col = new Map(header.map((name, index) => [name, index]))
  return { lines: lines.slice(1), col }
}

function fipsKey(state: string, place: string) {
  return `${state.padStart(2, '0')}${place.padStart(5, '0')}`
}

async function main() {
  const census = readEnrichment<CensusEnrichment>('census')
  if (!census) {
    console.error('population-history: run enrich-census first (needs cached place GEOIDs)')
    process.exit(1)
  }

  const slugByFips = new Map<string, string>()
  for (const [slug, row] of Object.entries(census.cities)) {
    const parsed = parseGeoid(row.geoid)
    if (!parsed) {
      console.warn(`population-history: could not parse geoid for ${slug} (${row.geoid})`)
      continue
    }
    slugByFips.set(fipsKey(parsed.stateFips, parsed.placeFips), slug)
  }

  const pointsBySlug = new Map<string, Array<{ year: number; population: number }>>()

  const legacy = await loadCsv(LEGACY_CSV)
  for (const line of legacy.lines) {
    const cells = parseCsvLine(line)
    const sumlev = cells[legacy.col.get('SUMLEV')!]
    if (sumlev !== '162') continue
    const state = cells[legacy.col.get('STATE')!]
    const place = cells[legacy.col.get('PLACE')!]
    const slug = slugByFips.get(fipsKey(state, place))
    if (!slug) continue
    const points = pointsBySlug.get(slug) ?? []
    for (const year of LEGACY_YEARS) {
      const raw = cells[legacy.col.get(`POPESTIMATE${year}`)!]
      const population = Number(raw)
      if (!Number.isFinite(population) || population <= 0) continue
      if (points.some((point) => point.year === year)) continue
      points.push({ year, population })
    }
    pointsBySlug.set(slug, points)
  }

  const current = await loadCsv(CURRENT_CSV)
  for (const line of current.lines) {
    const cells = parseCsvLine(line)
    const sumlev = cells[current.col.get('SUMLEV')!]
    if (sumlev !== '162') continue
    const state = cells[current.col.get('STATE')!]
    const place = cells[current.col.get('PLACE')!]
    const slug = slugByFips.get(fipsKey(state, place))
    if (!slug) continue
    const points = pointsBySlug.get(slug) ?? []
    for (const year of CURRENT_YEARS) {
      const raw = cells[current.col.get(`POPESTIMATE${year}`)!]
      const population = Number(raw)
      if (!Number.isFinite(population) || population <= 0) continue
      if (points.some((point) => point.year === year)) continue
      points.push({ year, population })
    }
    pointsBySlug.set(slug, points)
  }

  const cities: PopulationHistoryEnrichment['cities'] = {}
  let ok = 0
  for (const [slug, points] of pointsBySlug) {
    if (points.length < 2) continue
    const sorted = [...points].sort((a, b) => a.year - b.year)
    cities[slug] = {
      points: sorted,
      source: `U.S. Census Bureau PEP city/town estimates (${sorted[0].year}–${sorted[sorted.length - 1].year})`,
    }
    ok += 1
  }

  const allYears = Object.values(cities).flatMap((row) => row.points.map((point) => point.year))
  const payload: PopulationHistoryEnrichment = {
    generatedAt: new Date().toISOString(),
    earliestYear: allYears.length ? Math.min(...allYears) : 2010,
    latestYear: allYears.length ? Math.max(...allYears) : 2024,
    cities,
  }
  const out = writeEnrichment('population-history', payload)
  console.log(`Wrote ${ok}/${slugByFips.size} population-history enrichments → ${out}`)
  if (ok === 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
