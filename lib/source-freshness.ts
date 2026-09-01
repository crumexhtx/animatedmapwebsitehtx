import type { CityRecord, CitySourceFreshness, SourceFreshnessEntry } from '@/lib/types'

const YEAR_IN_MS = 365.25 * 24 * 60 * 60 * 1000

/** Parse a four-digit year from a source label or vintage string. */
export function parseVintageYear(text?: string | null): number | null {
  if (!text) return null
  const paren = /\((\d{4})\)/.exec(text)
  if (paren) return Number(paren[1])
  const acs = /ACS\s+(\d{4})/i.exec(text)
  if (acs) return Number(acs[1])
  const pep = /PEP\s+(\d{4})/i.exec(text)
  if (pep) return Number(pep[1])
  const trailing = /(\d{4})\s*$/.exec(text.trim())
  if (trailing) return Number(trailing[1])
  const any = /\b(19|20)\d{2}\b/.exec(text)
  return any ? Number(any[0]) : null
}

function isoDate(iso: string) {
  return iso.slice(0, 10)
}

function inferCrimeVintage(source?: string) {
  if (!source) return undefined
  const year = parseVintageYear(source)
  if (source.includes('CIUS Table 8') && year) return `${year} offenses (FBI Table 8 fallback)`
  if (source.includes('Crime Data Explorer') && year) return `${year} CDE monthly rates`
  if (year) return `${year} data`
  return undefined
}

function inferClimateVintage(source?: string) {
  if (!source) return undefined
  if (/1991[–-]2020/.test(source)) return '1991–2020 NOAA normals'
  return undefined
}

function inferCensusVintage(source?: string) {
  if (!source) return undefined
  const year = parseVintageYear(source)
  if (year && source.includes('ACS')) return `ACS ${year} 5-year`
  if (year) return `Census ${year}`
  return undefined
}

function inferBlsVintage(source?: string) {
  if (!source) return undefined
  const match = /·\s*([^·]+)$/.exec(source)
  return match ? match[1].trim() : undefined
}

/** Fallback when catalog JSON predates sourceFreshness (infer from source labels). */
export function inferSourceFreshness(city: CityRecord): CitySourceFreshness {
  const catalogAsOf = city.lastUpdated
  const latestPep = city.populationHistory?.points.at(-1)

  return {
    census: city.sources.census
      ? { asOf: catalogAsOf, vintage: inferCensusVintage(city.sources.census) }
      : undefined,
    bls: city.sources.bls
      ? { asOf: catalogAsOf, vintage: inferBlsVintage(city.sources.bls) }
      : undefined,
    crime: city.sources.fbi
      ? { asOf: catalogAsOf, vintage: inferCrimeVintage(city.sources.fbi) }
      : undefined,
    climate: city.sources.noaa
      ? { asOf: catalogAsOf, vintage: inferClimateVintage(city.sources.noaa) }
      : undefined,
    population: city.populationHistory
      ? {
          asOf: catalogAsOf,
          vintage: latestPep ? `Census PEP ${latestPep.year}` : undefined,
        }
      : undefined,
  }
}

export function resolveSourceFreshness(city: CityRecord): CitySourceFreshness {
  const base = city.sourceFreshness ?? inferSourceFreshness(city)
  return { ...base }
}

export function newestAsOf(freshness: CitySourceFreshness): string | null {
  const dates = Object.values(freshness)
    .map((entry) => entry?.asOf)
    .filter((value): value is string => Boolean(value))
  if (!dates.length) return null
  return dates.sort().at(-1) ?? null
}

export function isMeaningfullyStale(
  entry: SourceFreshnessEntry | undefined,
  referenceAsOf: string,
): boolean {
  if (!entry) return false

  const refTime = Date.parse(referenceAsOf)
  const entryTime = Date.parse(entry.asOf)
  if (Number.isFinite(refTime) && Number.isFinite(entryTime) && refTime - entryTime > YEAR_IN_MS) {
    return true
  }

  const refYear = parseVintageYear(referenceAsOf) ?? new Date(referenceAsOf).getUTCFullYear()
  const entryYear = parseVintageYear(entry.vintage) ?? parseVintageYear(entry.asOf)
  if (entryYear != null && refYear - entryYear > 1) return true

  return false
}

export function formatFreshnessLabel(entry: SourceFreshnessEntry | undefined, stale = false) {
  if (!entry) return null
  const vintage = entry.vintage ? ` · ${entry.vintage}` : ''
  const prefix = stale ? 'Older data' : 'Data'
  return `${prefix} as of ${entry.asOf}${vintage}`
}

export type FreshnessKey = keyof CitySourceFreshness

export function freshnessForKey(city: CityRecord, key: FreshnessKey) {
  const freshness = resolveSourceFreshness(city)
  const entry = freshness[key]
  const reference = newestAsOf(freshness) ?? city.lastUpdated
  const stale = isMeaningfullyStale(entry, reference)
  return { entry, stale, label: formatFreshnessLabel(entry, stale) }
}
