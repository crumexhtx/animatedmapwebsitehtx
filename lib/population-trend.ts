export type MonthlyPopulationPoint = {
  /** Fractional calendar year for chart positioning (e.g. 2014.5 ≈ mid-2014). */
  t: number
  year: number
  month: number
  population: number
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** Linear interpolation between annual PEP estimates — one point per month. */
export function expandYearlyPointsToMonthly(
  points: Array<{ year: number; population: number }>,
): MonthlyPopulationPoint[] {
  if (points.length === 0) return []
  if (points.length === 1) {
    const point = points[0]
    return [{ t: point.year, year: point.year, month: 7, population: point.population }]
  }

  const monthly: MonthlyPopulationPoint[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]
    const end = points[i + 1]
    for (let m = 0; m < 12; m++) {
      const frac = m / 12
      monthly.push({
        t: start.year + m / 12,
        year: start.year,
        month: m + 1,
        population: Math.round(start.population + (end.population - start.population) * frac),
      })
    }
  }

  const last = points[points.length - 1]
  monthly.push({ t: last.year, year: last.year, month: 12, population: last.population })
  return monthly
}

export function formatPopulationPeriod(year: number, month: number) {
  return `${MONTH_LABELS[month - 1]} ${year}`
}

/** ~same total playback duration as the old yearly step (700ms × year gaps). */
export function monthlyPlaybackIntervalMs(yearlyPointCount: number) {
  if (yearlyPointCount < 2) return 700
  const monthlySteps = (yearlyPointCount - 1) * 12
  return Math.max(35, Math.round((700 * (yearlyPointCount - 1)) / monthlySteps))
}
