import type { CityRecord, NationalBaselines } from '../../lib/types'

export const testNational: NationalBaselines = {
  generatedAt: '2026-01-01',
  medianHouseholdIncome: 78538,
  medianHomeValue: 303400,
  medianRent: 1348,
  costOfLivingIndex: 100,
  unemploymentRate: 4.2,
  crimeViolent: 400,
  crimeProperty: 2000,
  avgHighSummer: 87,
  avgLowWinter: 34,
  annualRainfall: 33,
  sunnyDays: 268,
  commuteMinutes: 25,
  walkScore: 45,
  notes: {
    acs: 'test',
    bls: 'test',
    crime: 'test',
    climate: 'test',
    commute: 'test',
  },
}

export function testCity(overrides: Partial<CityRecord> & Pick<CityRecord, 'slug' | 'name'>): CityRecord {
  const { crimeIndex, climate, commute, sources, ...rest } = overrides
  return {
    state: 'Texas',
    stateSlug: 'texas',
    stateCode: 'TX',
    population: 100000,
    medianHouseholdIncome: 70000,
    costOfLivingIndex: 100,
    medianHomePrice: 300000,
    medianRent: 1400,
    unemploymentRate: 4,
    description: 'Test city.',
    nearbyCities: [],
    lastUpdated: '2026-01-01',
    coordinates: [-95.37, 29.76],
    ...rest,
    crimeIndex: {
      violent: 400,
      property: 2000,
      source: 'FBI CDE',
      ...crimeIndex,
    },
    climate: {
      avgHighSummer: 90,
      avgLowWinter: 35,
      annualRainfall: 40,
      sunnyDays: 220,
      ...climate,
    },
    commute: {
      avgMinutes: 25,
      walkScore: 50,
      ...commute,
    },
    sources: {
      ...sources,
    },
  }
}
