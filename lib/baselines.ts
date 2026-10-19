/**
 * Which NationalBaselines fields are true U.S. figures vs MapsToIt catalog averages.
 * Keep this as the single source of truth for “U.S. avg” vs “catalog avg” copy.
 */
export type BaselineKind = 'us' | 'catalog'

export const METRIC_BASELINE_KIND = {
  medianHouseholdIncome: 'us',
  medianHomeValue: 'us',
  medianRent: 'us',
  costOfLivingIndex: 'us',
  unemploymentRate: 'us',
  crimeViolent: 'catalog',
  crimeProperty: 'catalog',
  avgHighSummer: 'catalog',
  avgLowWinter: 'catalog',
  annualRainfall: 'catalog',
  sunnyDays: 'catalog',
  commuteMinutes: 'catalog',
  walkScore: 'catalog',
} as const satisfies Record<string, BaselineKind>

export type BaselineMetric = keyof typeof METRIC_BASELINE_KIND

export function baselineKind(metric: BaselineMetric): BaselineKind {
  return METRIC_BASELINE_KIND[metric]
}

/** Short phrase for deltas: "U.S. avg" / "catalog avg". */
export function baselineAvgPhrase(kind: BaselineKind) {
  return kind === 'us' ? 'U.S. avg' : 'catalog avg'
}

/** Prefix for the comparison column: "U.S." / "Catalog avg". */
export function baselinePrefix(kind: BaselineKind) {
  return kind === 'us' ? 'U.S.' : 'Catalog avg'
}

export function formatBaselineValue(kind: BaselineKind, value: string) {
  return `${baselinePrefix(kind)} ${value}`
}
