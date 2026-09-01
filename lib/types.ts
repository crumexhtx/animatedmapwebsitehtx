export type CrimeIndex = {
  violent: number
  property: number
  source: string
}

export type Climate = {
  avgHighSummer: number
  avgLowWinter: number
  annualRainfall: number
  sunnyDays: number
}

export type Commute = {
  avgMinutes: number
  walkScore?: number
}

export type CitySources = {
  census?: string
  bls?: string
  fbi?: string
  noaa?: string
}

/** When each upstream enrichment batch was last refreshed and what data vintage it represents. */
export type SourceFreshnessEntry = {
  /** ISO date (YYYY-MM-DD) when MapsToIt last pulled or merged this source. */
  asOf: string
  /** Human-readable coverage window, e.g. "ACS 2023 5-year" or "2019 offenses". */
  vintage?: string
}

export type CitySourceFreshness = {
  census?: SourceFreshnessEntry
  bls?: SourceFreshnessEntry
  crime?: SourceFreshnessEntry
  climate?: SourceFreshnessEntry
  population?: SourceFreshnessEntry
}

export type PopulationHistoryPoint = {
  year: number
  population: number
}

export type PopulationHistory = {
  points: PopulationHistoryPoint[]
  source: string
}

export type CityImage = {
  url: string
  alt: string
  credit: string
  creditUrl: string
}

export type CityRecord = {
  slug: string
  name: string
  state: string
  stateSlug: string
  stateCode: string
  population: number
  medianHouseholdIncome: number
  costOfLivingIndex: number
  medianHomePrice: number
  medianRent: number
  crimeIndex: CrimeIndex
  climate: Climate
  commute: Commute
  unemploymentRate: number
  description: string
  neighborhoods?: string[]
  nearbyCities: string[]
  lastUpdated: string
  sourceFreshness?: CitySourceFreshness
  sources: CitySources
  coordinates: [number, number]
  featured?: boolean
  populationHistory?: PopulationHistory
  images?: CityImage[]
}

export type StateRecord = {
  slug: string
  name: string
  code: string
  cityCount: number
  population: number
  medianHouseholdIncome: number
  costOfLivingIndex: number
  description: string
  citySlugs: string[]
}

export type CatalogIndex = {
  generatedAt: string
  cityCount: number
  stateCount: number
  featuredSlugs: string[]
}

/** Baselines used on city pages for “vs national / catalog average” comparisons. */
export type NationalBaselines = {
  generatedAt: string
  medianHouseholdIncome: number
  medianHomeValue: number
  medianRent: number
  costOfLivingIndex: number
  unemploymentRate: number
  unemploymentPeriod?: string
  crimeViolent: number
  crimeProperty: number
  avgHighSummer: number
  avgLowWinter: number
  annualRainfall: number
  sunnyDays: number
  commuteMinutes: number
  walkScore: number
  notes: {
    acs: string
    bls: string
    crime: string
    climate: string
    commute: string
  }
}
