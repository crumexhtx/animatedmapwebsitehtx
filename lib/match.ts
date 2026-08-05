import type { CityRecord, NationalBaselines } from '@/lib/types'

export type MatchCriterion = 'cost' | 'safety' | 'income' | 'climate'

export type MatchWeights = Record<MatchCriterion, number>

export type ClimatePreference = 'any' | 'warm' | 'mild' | 'cold'

export type MatchFilters = {
  colMin: number
  colMax: number
  climate: ClimatePreference
  /** Exclude this slug (e.g. the baseline city for “find like”). */
  excludeSlug?: string
}

export type ScoredCity = {
  city: CityRecord
  score: number
  breakdown: Record<MatchCriterion, number>
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  cost: 3,
  safety: 3,
  income: 2,
  climate: 2,
}

export const DEFAULT_MATCH_FILTERS: MatchFilters = {
  colMin: 70,
  colMax: 160,
  climate: 'any',
}

export const MATCH_CRITERION_LABELS: Record<MatchCriterion, string> = {
  cost: 'Housing cost',
  safety: 'Safety',
  income: 'Income potential',
  climate: 'Climate fit',
}

type CatalogRanges = {
  colMin: number
  colMax: number
  incomeMin: number
  incomeMax: number
  crimeMin: number
  crimeMax: number
  summerMedian: number
  summerMaxDev: number
  winterMedian: number
  winterMaxDev: number
}

function crimeOk(city: CityRecord) {
  return city.crimeIndex.source !== 'data unavailable' && !city.crimeIndex.source.includes('curated')
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))))
}

function invertScale(value: number, min: number, max: number) {
  if (max === min) return 50
  return clamp(100 * ((max - value) / (max - min)))
}

function forwardScale(value: number, min: number, max: number) {
  if (max === min) return 50
  return clamp(100 * ((value - min) / (max - min)))
}

export function catalogRanges(catalog: CityRecord[], national: NationalBaselines): CatalogRanges {
  const colValues = catalog.map((c) => c.costOfLivingIndex)
  const incomeValues = catalog.map((c) => c.medianHouseholdIncome)
  const crimeValues = catalog.filter(crimeOk).map((c) => c.crimeIndex.violent)
  const summerValues = catalog.map((c) => c.climate.avgHighSummer)
  const winterValues = catalog.map((c) => c.climate.avgLowWinter)
  const summerMedian = national.avgHighSummer
  const winterMedian = national.avgLowWinter

  return {
    colMin: Math.min(...colValues),
    colMax: Math.max(...colValues),
    incomeMin: Math.min(...incomeValues),
    incomeMax: Math.max(...incomeValues),
    crimeMin: Math.min(...crimeValues),
    crimeMax: Math.max(...crimeValues),
    summerMedian,
    summerMaxDev: Math.max(...summerValues.map((v) => Math.abs(v - summerMedian)), 1),
    winterMedian,
    winterMaxDev: Math.max(...winterValues.map((v) => Math.abs(v - winterMedian)), 1),
  }
}

/** Per-criterion 0–100 scores (higher = more favorable for relocators). */
export function cityCriterionScores(
  city: CityRecord,
  ranges: CatalogRanges,
  climate: ClimatePreference,
): Record<MatchCriterion, number> {
  const cost = invertScale(city.costOfLivingIndex, ranges.colMin, ranges.colMax)
  const safety = crimeOk(city)
    ? invertScale(city.crimeIndex.violent, ranges.crimeMin, ranges.crimeMax)
    : 35
  const income = forwardScale(city.medianHouseholdIncome, ranges.incomeMin, ranges.incomeMax)

  let climateScore: number
  if (climate === 'warm') {
    // Prefer hotter summers and milder winters
    climateScore = clamp(
      0.6 * forwardScale(city.climate.avgHighSummer, 70, 105) +
        0.4 * forwardScale(city.climate.avgLowWinter, 0, 55),
    )
  } else if (climate === 'cold') {
    climateScore = clamp(
      0.55 * invertScale(city.climate.avgHighSummer, 70, 105) +
        0.45 * invertScale(city.climate.avgLowWinter, 0, 55),
    )
  } else if (climate === 'mild') {
    climateScore = clamp(
      0.6 *
        (100 *
          (1 - Math.abs(city.climate.avgHighSummer - ranges.summerMedian) / ranges.summerMaxDev)) +
        0.4 *
          (100 *
            (1 - Math.abs(city.climate.avgLowWinter - ranges.winterMedian) / ranges.winterMaxDev)),
    )
  } else {
    // any — mild summer relative to catalog + a bit of sunshine
    climateScore = clamp(
      0.7 *
        (100 *
          (1 - Math.abs(city.climate.avgHighSummer - ranges.summerMedian) / ranges.summerMaxDev)) +
        0.3 * forwardScale(city.climate.sunnyDays, 140, 300),
    )
  }

  return { cost, safety, income, climate: climateScore }
}

function matchesClimateBand(city: CityRecord, climate: ClimatePreference) {
  if (climate === 'any') return true
  const summer = city.climate.avgHighSummer
  const winter = city.climate.avgLowWinter
  if (climate === 'warm') return summer >= 88 || winter >= 40
  if (climate === 'cold') return summer <= 84 && winter <= 25
  // mild: not extreme heat or deep freeze
  return summer >= 78 && summer <= 90 && winter >= 20 && winter <= 45
}

/**
 * Pure scoring layer: filter + weight cities. Higher score = better fit.
 * Weights are relative; zero-weight criteria are ignored.
 */
export function scoreCities(
  cities: CityRecord[],
  catalog: CityRecord[],
  national: NationalBaselines,
  weights: MatchWeights,
  filters: MatchFilters = DEFAULT_MATCH_FILTERS,
): ScoredCity[] {
  const ranges = catalogRanges(catalog, national)
  const weightSum =
    Math.max(weights.cost, 0) +
    Math.max(weights.safety, 0) +
    Math.max(weights.income, 0) +
    Math.max(weights.climate, 0)

  const filtered = cities.filter((city) => {
    if (filters.excludeSlug && city.slug === filters.excludeSlug) return false
    if (city.costOfLivingIndex < filters.colMin || city.costOfLivingIndex > filters.colMax) {
      return false
    }
    return matchesClimateBand(city, filters.climate)
  })

  const scored = filtered.map((city) => {
    const breakdown = cityCriterionScores(city, ranges, filters.climate)
    const score =
      weightSum <= 0
        ? 0
        : clamp(
            (breakdown.cost * Math.max(weights.cost, 0) +
              breakdown.safety * Math.max(weights.safety, 0) +
              breakdown.income * Math.max(weights.income, 0) +
              breakdown.climate * Math.max(weights.climate, 0)) /
              weightSum,
          )
    return { city, score, breakdown }
  })

  return scored.sort(
    (a, b) => b.score - a.score || a.city.name.localeCompare(b.city.name),
  )
}

/** Derive matcher defaults from a baseline city (“find cities like this”). */
export function filtersFromCity(city: CityRecord): MatchFilters {
  const col = city.costOfLivingIndex
  const summer = city.climate.avgHighSummer
  const winter = city.climate.avgLowWinter
  let climate: ClimatePreference = 'mild'
  if (summer >= 92 || winter >= 42) climate = 'warm'
  else if (summer <= 82 && winter <= 22) climate = 'cold'

  return {
    colMin: Math.max(60, col - 20),
    colMax: Math.min(220, col + 20),
    climate,
    excludeSlug: city.slug,
  }
}

export function parseMatchWeights(
  params: Record<string, string | string[] | undefined>,
): MatchWeights {
  const read = (key: string, fallback: number) => {
    const raw = params[key]
    const value = Number(Array.isArray(raw) ? raw[0] : raw)
    return Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : fallback
  }
  return {
    cost: read('wCost', DEFAULT_MATCH_WEIGHTS.cost),
    safety: read('wSafety', DEFAULT_MATCH_WEIGHTS.safety),
    income: read('wIncome', DEFAULT_MATCH_WEIGHTS.income),
    climate: read('wClimate', DEFAULT_MATCH_WEIGHTS.climate),
  }
}

export function parseMatchFilters(
  params: Record<string, string | string[] | undefined>,
  baseline?: CityRecord | null,
): MatchFilters {
  const base = baseline ? filtersFromCity(baseline) : DEFAULT_MATCH_FILTERS
  const readNum = (key: string, fallback: number) => {
    const raw = params[key]
    const value = Number(Array.isArray(raw) ? raw[0] : raw)
    return Number.isFinite(value) ? value : fallback
  }
  const climateRaw = Array.isArray(params.climate) ? params.climate[0] : params.climate
  const climate =
    climateRaw === 'warm' || climateRaw === 'mild' || climateRaw === 'cold' || climateRaw === 'any'
      ? climateRaw
      : base.climate

  return {
    colMin: readNum('colMin', base.colMin),
    colMax: readNum('colMax', base.colMax),
    climate,
    excludeSlug: baseline?.slug ?? base.excludeSlug,
  }
}
