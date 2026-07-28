import type { CityRecord, NationalBaselines } from '@/lib/types'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'

export type CompareRow = {
  label: string
  values: string[]
  national: string
  context: string
}

function pctDelta(city: number, national: number) {
  if (!Number.isFinite(city) || !Number.isFinite(national) || national === 0) return null
  return ((city - national) / Math.abs(national)) * 100
}

function gapLabel(city: number, national: number, betterWhen: 'higher' | 'lower' | 'neutral' = 'neutral') {
  const delta = pctDelta(city, national)
  if (delta == null) return '—'
  const abs = Math.abs(delta)
  if (abs < 5) return 'Near national average'
  const direction = delta >= 0 ? 'above' : 'below'
  const tip =
    betterWhen === 'neutral'
      ? ''
      : betterWhen === 'lower' && delta < 0
        ? ' · relatively affordable / lower'
        : betterWhen === 'higher' && delta > 0
          ? ' · relatively higher'
          : ''
  return `${abs.toFixed(0)}% ${direction} national average${tip}`
}

export function buildCompareRows(
  cities: CityRecord[],
  national: NationalBaselines,
): CompareRow[] {
  const primary = cities[0]
  const crimeUnavailable = cities.some((city) => city.crimeIndex.source === 'data unavailable')

  return [
    {
      label: 'Population',
      values: cities.map((city) => formatNumber(city.population)),
      national: 'N/A',
      context: 'City limits only (not metro / MSA)',
    },
    {
      label: 'Median household income',
      values: cities.map((city) => formatCurrency(city.medianHouseholdIncome)),
      national: formatCurrency(national.medianHouseholdIncome),
      context: gapLabel(primary.medianHouseholdIncome, national.medianHouseholdIncome, 'higher'),
    },
    {
      label: 'Median home value',
      values: cities.map((city) => formatCurrency(city.medianHomePrice)),
      national: formatCurrency(national.medianHomeValue),
      context: gapLabel(primary.medianHomePrice, national.medianHomeValue, 'lower'),
    },
    {
      label: 'Median rent',
      values: cities.map((city) => formatCurrency(city.medianRent)),
      national: formatCurrency(national.medianRent),
      context: gapLabel(primary.medianRent, national.medianRent, 'lower'),
    },
    {
      label: 'Housing cost index',
      values: cities.map((city) => String(city.costOfLivingIndex)),
      national: String(national.costOfLivingIndex),
      context: '100 = U.S. average (ACS home + rent)',
    },
    {
      label: 'Unemployment',
      values: cities.map((city) => formatPercent(city.unemploymentRate)),
      national: formatPercent(national.unemploymentRate),
      context: 'County LAUS rate, not city-only',
    },
    {
      label: 'Avg commute',
      values: cities.map((city) => `${city.commute.avgMinutes} min`),
      national: `${national.commuteMinutes} min`,
      context: gapLabel(primary.commute.avgMinutes, national.commuteMinutes, 'lower'),
    },
    {
      label: 'Violent crime rate',
      values: cities.map((city) =>
        city.crimeIndex.source === 'data unavailable' ? 'Unavailable' : `${city.crimeIndex.violent} / 100k`,
      ),
      national: `${national.crimeViolent} / 100k`,
      context: crimeUnavailable
        ? 'FBI data gap for at least one city'
        : 'Citywide rate — inspect neighborhood / block data',
    },
    {
      label: 'Property crime rate',
      values: cities.map((city) =>
        city.crimeIndex.source === 'data unavailable' ? 'Unavailable' : `${city.crimeIndex.property} / 100k`,
      ),
      national: `${national.crimeProperty} / 100k`,
      context: crimeUnavailable
        ? 'FBI data gap for at least one city'
        : 'Citywide rate — inspect neighborhood / block data',
    },
    {
      label: 'Sunny days',
      values: cities.map((city) => `${city.climate.sunnyDays} days`),
      national: `${national.sunnyDays} days`,
      context: gapLabel(primary.climate.sunnyDays, national.sunnyDays, 'higher'),
    },
    {
      label: 'Summer high',
      values: cities.map((city) => `${city.climate.avgHighSummer}°F`),
      national: `${national.avgHighSummer}°F`,
      context: 'NOAA normals · nearest station',
    },
    {
      label: 'Winter low',
      values: cities.map((city) => `${city.climate.avgLowWinter}°F`),
      national: `${national.avgLowWinter}°F`,
      context: 'NOAA normals · nearest station',
    },
  ]
}

export function parseCompareSlugs(raw: string | string[] | undefined, limit = 3): string[] {
  if (!raw) return []
  const joined = Array.isArray(raw) ? raw.join(',') : raw
  const seen = new Set<string>()
  const slugs: string[] = []
  for (const part of joined.split(/[|,]/).map((value) => value.trim().toLowerCase())) {
    if (!part || seen.has(part)) continue
    seen.add(part)
    slugs.push(part)
    if (slugs.length >= limit) break
  }
  return slugs
}
