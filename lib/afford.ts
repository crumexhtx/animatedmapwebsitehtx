import type { CityRecord } from '@/lib/types'
import { catalogRanges } from '@/lib/match'

export type BudgetMode = 'rent' | 'buy'

export type CrimeTolerance = 'low' | 'medium' | 'any'

export type AffordSort = 'budget-fit' | 'safest' | 'walk-score' | 'commute' | 'income'

export type AffordFilters = {
  mode: BudgetMode
  /** null until the user enters a budget */
  budget: number | null
  crimeTolerance: CrimeTolerance
  minWalkScore: number
  maxCommute: number | null
  minSummerHigh: number | null
  maxSummerHigh: number | null
  minWinterLow: number | null
  maxWinterLow: number | null
  minMedianIncome: number | null
  sort: AffordSort
}

export type AffordMatch = {
  city: CityRecord
  budgetGap: number
  budgetUtilization: number
}

export type AffordCatalogBounds = {
  rentMin: number
  rentMax: number
  homeMin: number
  homeMax: number
  commuteMin: number
  commuteMax: number
  walkMin: number
  walkMax: number
  violentMin: number
  violentMax: number
  summerMin: number
  summerMax: number
  winterMin: number
  winterMax: number
  incomeMin: number
  incomeMax: number
}

export type RelaxSuggestion = {
  filterKey: keyof AffordFilters
  label: string
  wouldAdd: number
}

export const AFFORD_SORT_LABELS: Record<AffordSort, string> = {
  'budget-fit': 'Closest to budget',
  safest: 'Safest first',
  'walk-score': 'Best walk score',
  commute: 'Shortest commute',
  income: 'Highest income',
}

export const DEFAULT_AFFORD_FILTERS: AffordFilters = {
  mode: 'rent',
  budget: null,
  crimeTolerance: 'any',
  minWalkScore: 0,
  maxCommute: null,
  minSummerHigh: null,
  maxSummerHigh: null,
  minWinterLow: null,
  maxWinterLow: null,
  minMedianIncome: null,
  sort: 'budget-fit',
}

function crimeOk(city: CityRecord) {
  return city.crimeIndex.source !== 'data unavailable' && !city.crimeIndex.source.includes('curated')
}

function percentile(values: number[], pct: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))
  return sorted[index]
}

export function affordCatalogBounds(catalog: CityRecord[]): AffordCatalogBounds {
  const rents = catalog.map((city) => city.medianRent)
  const homes = catalog.map((city) => city.medianHomePrice)
  const commutes = catalog.map((city) => city.commute.avgMinutes)
  const walks = catalog.map((city) => city.commute.walkScore).filter((v): v is number => v != null)
  const violent = catalog.filter(crimeOk).map((city) => city.crimeIndex.violent)
  const summers = catalog.map((city) => city.climate.avgHighSummer)
  const winters = catalog.map((city) => city.climate.avgLowWinter)
  const incomes = catalog.map((city) => city.medianHouseholdIncome)

  return {
    rentMin: Math.min(...rents),
    rentMax: Math.max(...rents),
    homeMin: Math.min(...homes),
    homeMax: Math.max(...homes),
    commuteMin: Math.min(...commutes),
    commuteMax: Math.max(...commutes),
    walkMin: walks.length ? Math.min(...walks) : 0,
    walkMax: walks.length ? Math.max(...walks) : 100,
    violentMin: violent.length ? Math.min(...violent) : 0,
    violentMax: violent.length ? Math.max(...violent) : 1000,
    summerMin: Math.min(...summers),
    summerMax: Math.max(...summers),
    winterMin: Math.min(...winters),
    winterMax: Math.max(...winters),
    incomeMin: Math.min(...incomes),
    incomeMax: Math.max(...incomes),
  }
}

function crimeLimitForTolerance(tolerance: CrimeTolerance, catalog: CityRecord[]): number | null {
  if (tolerance === 'any') return null
  const violent = catalog.filter(crimeOk).map((city) => city.crimeIndex.violent)
  if (!violent.length) return null
  return tolerance === 'low' ? percentile(violent, 25) : percentile(violent, 75)
}

function passesCrimeFilter(city: CityRecord, filters: AffordFilters, catalog: CityRecord[]) {
  const limit = crimeLimitForTolerance(filters.crimeTolerance, catalog)
  if (limit == null) return true
  if (!crimeOk(city)) return false
  return city.crimeIndex.violent <= limit
}

function housingCost(city: CityRecord, mode: BudgetMode) {
  return mode === 'rent' ? city.medianRent : city.medianHomePrice
}

function toAffordMatch(city: CityRecord, filters: AffordFilters): AffordMatch {
  const cost = housingCost(city, filters.mode)
  const budget = filters.budget ?? cost
  return {
    city,
    budgetGap: budget - cost,
    budgetUtilization: budget > 0 ? cost / budget : 0,
  }
}

export function filterAffordCities(catalog: CityRecord[], filters: AffordFilters): AffordMatch[] {
  if (filters.budget == null || filters.budget <= 0) return []

  const matches = catalog.filter((city) => {
    const cost = housingCost(city, filters.mode)
    if (cost > filters.budget!) return false
    if (!passesCrimeFilter(city, filters, catalog)) return false

    if (filters.minWalkScore > 0) {
      if (city.commute.walkScore == null || city.commute.walkScore < filters.minWalkScore) return false
    }

    if (filters.maxCommute != null && city.commute.avgMinutes > filters.maxCommute) return false
    if (filters.minSummerHigh != null && city.climate.avgHighSummer < filters.minSummerHigh) return false
    if (filters.maxSummerHigh != null && city.climate.avgHighSummer > filters.maxSummerHigh) return false
    if (filters.minWinterLow != null && city.climate.avgLowWinter < filters.minWinterLow) return false
    if (filters.maxWinterLow != null && city.climate.avgLowWinter > filters.maxWinterLow) return false
    if (filters.minMedianIncome != null && city.medianHouseholdIncome < filters.minMedianIncome) return false

    return true
  })

  return matches.map((city) => toAffordMatch(city, filters))
}

export function sortAffordResults(matches: AffordMatch[], sort: AffordSort): AffordMatch[] {
  const sorted = [...matches]
  switch (sort) {
    case 'safest':
      sorted.sort((a, b) => {
        const av = crimeOk(a.city) ? a.city.crimeIndex.violent : Number.POSITIVE_INFINITY
        const bv = crimeOk(b.city) ? b.city.crimeIndex.violent : Number.POSITIVE_INFINITY
        return av - bv || a.city.name.localeCompare(b.city.name)
      })
      break
    case 'walk-score':
      sorted.sort((a, b) => {
        const av = a.city.commute.walkScore ?? -1
        const bv = b.city.commute.walkScore ?? -1
        return bv - av || a.city.name.localeCompare(b.city.name)
      })
      break
    case 'commute':
      sorted.sort(
        (a, b) =>
          a.city.commute.avgMinutes - b.city.commute.avgMinutes ||
          a.city.name.localeCompare(b.city.name),
      )
      break
    case 'income':
      sorted.sort(
        (a, b) =>
          b.city.medianHouseholdIncome - a.city.medianHouseholdIncome ||
          a.city.name.localeCompare(b.city.name),
      )
      break
    default:
      sorted.sort(
        (a, b) =>
          b.budgetUtilization - a.budgetUtilization ||
          b.budgetGap - a.budgetGap ||
          a.city.name.localeCompare(b.city.name),
      )
  }
  return sorted
}

export function searchAffordCities(catalog: CityRecord[], filters: AffordFilters) {
  const matches = filterAffordCities(catalog, filters)
  return sortAffordResults(matches, filters.sort)
}

const OPTIONAL_FILTER_KEYS: Array<keyof AffordFilters> = [
  'crimeTolerance',
  'minWalkScore',
  'maxCommute',
  'minSummerHigh',
  'maxSummerHigh',
  'minWinterLow',
  'maxWinterLow',
  'minMedianIncome',
]

function isOptionalFilterActive(filters: AffordFilters, key: keyof AffordFilters) {
  switch (key) {
    case 'crimeTolerance':
      return filters.crimeTolerance !== 'any'
    case 'minWalkScore':
      return filters.minWalkScore > 0
    case 'maxCommute':
      return filters.maxCommute != null
    case 'minSummerHigh':
      return filters.minSummerHigh != null
    case 'maxSummerHigh':
      return filters.maxSummerHigh != null
    case 'minWinterLow':
      return filters.minWinterLow != null
    case 'maxWinterLow':
      return filters.maxWinterLow != null
    case 'minMedianIncome':
      return filters.minMedianIncome != null
    default:
      return false
  }
}

function withoutFilter(filters: AffordFilters, key: keyof AffordFilters): AffordFilters {
  const next = { ...filters }
  switch (key) {
    case 'crimeTolerance':
      next.crimeTolerance = 'any'
      break
    case 'minWalkScore':
      next.minWalkScore = 0
      break
    case 'maxCommute':
      next.maxCommute = null
      break
    case 'minSummerHigh':
      next.minSummerHigh = null
      break
    case 'maxSummerHigh':
      next.maxSummerHigh = null
      break
    case 'minWinterLow':
      next.minWinterLow = null
      break
    case 'maxWinterLow':
      next.maxWinterLow = null
      break
    case 'minMedianIncome':
      next.minMedianIncome = null
      break
    default:
      break
  }
  return next
}

const RELAX_LABELS: Partial<Record<keyof AffordFilters, string>> = {
  crimeTolerance: 'crime tolerance',
  minWalkScore: 'minimum walk score',
  maxCommute: 'commute limit',
  minSummerHigh: 'summer temperature floor',
  maxSummerHigh: 'summer temperature ceiling',
  minWinterLow: 'winter temperature floor',
  maxWinterLow: 'winter temperature ceiling',
  minMedianIncome: 'minimum income',
}

export function suggestRelaxedFilter(
  catalog: CityRecord[],
  filters: AffordFilters,
): RelaxSuggestion | null {
  if (filters.budget == null || filters.budget <= 0) return null

  const baselineCount = filterAffordCities(catalog, filters).length
  if (baselineCount > 0) return null

  const budgetOnly = {
    ...DEFAULT_AFFORD_FILTERS,
    mode: filters.mode,
    budget: filters.budget,
    sort: filters.sort,
  }
  const budgetOnlyCount = filterAffordCities(catalog, budgetOnly).length
  if (budgetOnlyCount === 0) return null

  let best: RelaxSuggestion | null = null
  for (const key of OPTIONAL_FILTER_KEYS) {
    if (!isOptionalFilterActive(filters, key)) continue
    const relaxed = withoutFilter(filters, key)
    const count = filterAffordCities(catalog, relaxed).length
    if (count <= 0) continue
    const wouldAdd = count - baselineCount
    if (!best || wouldAdd > best.wouldAdd) {
      best = {
        filterKey: key,
        label: RELAX_LABELS[key] ?? String(key),
        wouldAdd,
      }
    }
  }

  return best
}

export function cheapestWithinMode(catalog: CityRecord[], mode: BudgetMode) {
  const sorted = [...catalog].sort(
    (a, b) => housingCost(a, mode) - housingCost(b, mode) || a.name.localeCompare(b.name),
  )
  return sorted[0] ?? null
}

function readParam(params: Record<string, string | string[] | undefined>, key: string) {
  const raw = params[key]
  return Array.isArray(raw) ? raw[0] : raw
}

function readNum(params: Record<string, string | string[] | undefined>, key: string) {
  const value = Number(readParam(params, key))
  return Number.isFinite(value) ? value : null
}

export function parseAffordFilters(
  params: Record<string, string | string[] | undefined>,
): AffordFilters {
  const modeRaw = readParam(params, 'mode')
  const mode: BudgetMode = modeRaw === 'buy' ? 'buy' : 'rent'

  const budget = readNum(params, 'budget')

  const crimeRaw = readParam(params, 'crime')
  const crimeTolerance: CrimeTolerance =
    crimeRaw === 'low' || crimeRaw === 'medium' ? crimeRaw : 'any'

  const sortRaw = readParam(params, 'sort')
  const sort: AffordSort =
    sortRaw === 'safest' ||
    sortRaw === 'walk-score' ||
    sortRaw === 'commute' ||
    sortRaw === 'income'
      ? sortRaw
      : 'budget-fit'

  const minWalkScore = readNum(params, 'walk') ?? 0

  return {
    mode,
    budget,
    crimeTolerance,
    minWalkScore: Math.max(0, Math.min(100, minWalkScore)),
    maxCommute: readNum(params, 'commute'),
    minSummerHigh: readNum(params, 'summerMin'),
    maxSummerHigh: readNum(params, 'summerMax'),
    minWinterLow: readNum(params, 'winterMin'),
    maxWinterLow: readNum(params, 'winterMax'),
    minMedianIncome: readNum(params, 'incomeMin'),
    sort,
  }
}

export function affordPath(filters: Partial<AffordFilters>) {
  const params = new URLSearchParams()
  const mode = filters.mode ?? DEFAULT_AFFORD_FILTERS.mode
  params.set('mode', mode)

  if (filters.budget != null && filters.budget > 0) {
    params.set('budget', String(Math.round(filters.budget)))
  }

  const crime = filters.crimeTolerance ?? DEFAULT_AFFORD_FILTERS.crimeTolerance
  if (crime !== 'any') params.set('crime', crime)

  const walk = filters.minWalkScore ?? 0
  if (walk > 0) params.set('walk', String(Math.round(walk)))

  if (filters.maxCommute != null) params.set('commute', String(Math.round(filters.maxCommute)))
  if (filters.minSummerHigh != null) params.set('summerMin', String(Math.round(filters.minSummerHigh)))
  if (filters.maxSummerHigh != null) params.set('summerMax', String(Math.round(filters.maxSummerHigh)))
  if (filters.minWinterLow != null) params.set('winterMin', String(Math.round(filters.minWinterLow)))
  if (filters.maxWinterLow != null) params.set('winterMax', String(Math.round(filters.maxWinterLow)))
  if (filters.minMedianIncome != null) params.set('incomeMin', String(Math.round(filters.minMedianIncome)))

  const sort = filters.sort ?? DEFAULT_AFFORD_FILTERS.sort
  if (sort !== 'budget-fit') params.set('sort', sort)

  const query = params.toString()
  return query ? `/afford?${query}` : '/afford'
}

/** Used for contextual hints — re-export catalog crime range from match helper. */
export function affordCrimeContext(catalog: CityRecord[], national: Parameters<typeof catalogRanges>[1]) {
  const ranges = catalogRanges(catalog, national)
  return { violentMin: ranges.crimeMin, violentMax: ranges.crimeMax }
}
