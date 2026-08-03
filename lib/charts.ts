import type { CityRecord, NationalBaselines } from '@/lib/types'

export type RankingCity = {
  slug: string
  name: string
  stateCode: string
  stateSlug: string
  costOfLivingIndex: number
  medianHomePrice: number
  population: number
}

export type RadarMetricKey =
  | 'costOfLiving'
  | 'violentCrime'
  | 'income'
  | 'summerHigh'

export type RadarCitySeries = {
  slug: string
  name: string
  stateCode: string
  scores: Record<RadarMetricKey, number>
  raw: Record<RadarMetricKey, number | null>
}

/**
 * Normalization for compare radar charts (all axes 0–100).
 *
 * Method — min-max against catalog extremes, with direction flipped when
 * “higher raw = worse for relocators” so higher radar scores always mean
 * relatively more favorable on that axis:
 *
 *   costOfLiving  — lower COL index is better → score = 100 * (max - v) / (max - min)
 *   violentCrime  — lower rate is better → same invert
 *   income        — higher is better → score = 100 * (v - min) / (max - min)
 *   summerHigh    — closer to catalog median is “milder” → score = 100 * (1 - |v - median| / maxDev)
 *
 * Cities with unavailable crime (source === 'data unavailable' or curated seed)
 * get null raw / 0 score for the crime axis so they are visibly incomplete.
 */
export function buildRadarSeries(
  cities: CityRecord[],
  catalog: CityRecord[],
  national: NationalBaselines,
): RadarCitySeries[] {
  const colValues = catalog.map((c) => c.costOfLivingIndex)
  const incomeValues = catalog.map((c) => c.medianHouseholdIncome)
  const crimeCities = catalog.filter(
    (c) => c.crimeIndex.source !== 'data unavailable' && !c.crimeIndex.source.includes('curated'),
  )
  const crimeValues = crimeCities.map((c) => c.crimeIndex.violent)
  const summerValues = catalog.map((c) => c.climate.avgHighSummer)

  const colMin = Math.min(...colValues)
  const colMax = Math.max(...colValues)
  const incomeMin = Math.min(...incomeValues)
  const incomeMax = Math.max(...incomeValues)
  const crimeMin = Math.min(...crimeValues)
  const crimeMax = Math.max(...crimeValues)
  const summerMedian = national.avgHighSummer
  const summerMaxDev = Math.max(...summerValues.map((v) => Math.abs(v - summerMedian)), 1)

  const invertScale = (value: number, min: number, max: number) => {
    if (max === min) return 50
    return clamp(100 * ((max - value) / (max - min)))
  }
  const forwardScale = (value: number, min: number, max: number) => {
    if (max === min) return 50
    return clamp(100 * ((value - min) / (max - min)))
  }

  return cities.map((city) => {
    const crimeOk =
      city.crimeIndex.source !== 'data unavailable' && !city.crimeIndex.source.includes('curated')
    const rawCrime = crimeOk ? city.crimeIndex.violent : null

    return {
      slug: city.slug,
      name: city.name,
      stateCode: city.stateCode,
      raw: {
        costOfLiving: city.costOfLivingIndex,
        violentCrime: rawCrime,
        income: city.medianHouseholdIncome,
        summerHigh: city.climate.avgHighSummer,
      },
      scores: {
        costOfLiving: invertScale(city.costOfLivingIndex, colMin, colMax),
        violentCrime: rawCrime == null ? 0 : invertScale(rawCrime, crimeMin, crimeMax),
        income: forwardScale(city.medianHouseholdIncome, incomeMin, incomeMax),
        summerHigh: clamp(100 * (1 - Math.abs(city.climate.avgHighSummer - summerMedian) / summerMaxDev)),
      },
    }
  })
}

export const RADAR_METRIC_LABELS: Record<RadarMetricKey, string> = {
  costOfLiving: 'Housing affordability',
  violentCrime: 'Safety (lower crime)',
  income: 'Household income',
  summerHigh: 'Mild summer climate',
}

export function cheapestCities(cities: CityRecord[], limit = 10): RankingCity[] {
  return [...cities]
    .sort((a, b) => a.costOfLivingIndex - b.costOfLivingIndex || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(toRankingCity)
}

export function mostExpensiveCities(cities: CityRecord[], limit = 10): RankingCity[] {
  return [...cities]
    .sort((a, b) => b.costOfLivingIndex - a.costOfLivingIndex || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(toRankingCity)
}

export function costVsSafetyPoints(cities: CityRecord[]) {
  return cities
    .filter(
      (city) =>
        city.crimeIndex.source !== 'data unavailable' && !city.crimeIndex.source.includes('curated'),
    )
    .map((city) => ({
      slug: city.slug,
      name: city.name,
      stateCode: city.stateCode,
      stateSlug: city.stateSlug,
      costOfLivingIndex: city.costOfLivingIndex,
      violentCrime: city.crimeIndex.violent,
      medianHomePrice: city.medianHomePrice,
      population: city.population,
    }))
}

export function stateColAverages(cities: CityRecord[]) {
  const byState = new Map<string, { name: string; code: string; slug: string; values: number[] }>()
  for (const city of cities) {
    const row = byState.get(city.stateSlug) ?? {
      name: city.state,
      code: city.stateCode,
      slug: city.stateSlug,
      values: [],
    }
    row.values.push(city.costOfLivingIndex)
    byState.set(city.stateSlug, row)
  }
  return [...byState.values()].map((row) => ({
    name: row.name,
    code: row.code,
    slug: row.slug,
    cityCount: row.values.length,
    avgCostOfLivingIndex: Math.round(row.values.reduce((sum, v) => sum + v, 0) / row.values.length),
  }))
}

export type PopulationRaceCity = {
  slug: string
  name: string
  stateCode: string
  stateSlug: string
  byYear: Record<number, number>
}

/** Cities with multi-year PEP history for the national population race. */
export function populationRaceCities(cities: CityRecord[]): PopulationRaceCity[] {
  return cities
    .filter((city) => (city.populationHistory?.points.length ?? 0) >= 2)
    .map((city) => ({
      slug: city.slug,
      name: city.name,
      stateCode: city.stateCode,
      stateSlug: city.stateSlug,
      byYear: Object.fromEntries(
        city.populationHistory!.points.map((point) => [point.year, point.population]),
      ),
    }))
}

export function populationRaceYears(cities: PopulationRaceCity[]): number[] {
  const years = new Set<number>()
  for (const city of cities) {
    for (const year of Object.keys(city.byYear)) years.add(Number(year))
  }
  return [...years].sort((a, b) => a - b)
}

function toRankingCity(city: CityRecord): RankingCity {
  return {
    slug: city.slug,
    name: city.name,
    stateCode: city.stateCode,
    stateSlug: city.stateSlug,
    costOfLivingIndex: city.costOfLivingIndex,
    medianHomePrice: city.medianHomePrice,
    population: city.population,
  }
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))))
}
