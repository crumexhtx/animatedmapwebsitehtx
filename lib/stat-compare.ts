import { baselineAvgPhrase, baselinePrefix, type BaselineKind } from '@/lib/baselines'
import { formatCurrency, formatPercent } from '@/lib/format'

export type CompareTone = 'higher' | 'lower' | 'near' | 'neutral'

export type CompareResult = {
  national: string
  deltaLabel: string
  tone: CompareTone
}

function pctDelta(city: number, national: number) {
  if (!Number.isFinite(city) || !Number.isFinite(national) || national === 0) return null
  return ((city - national) / Math.abs(national)) * 100
}

function toneFromPct(delta: number): CompareTone {
  if (Math.abs(delta) < 5) return 'near'
  return delta > 0 ? 'higher' : 'lower'
}

export function compareCurrency(city: number, national: number, kind: BaselineKind): CompareResult | undefined {
  const delta = pctDelta(city, national)
  if (delta == null) return undefined
  const abs = Math.abs(delta)
  const direction = delta >= 0 ? 'above' : 'below'
  const avg = baselineAvgPhrase(kind)
  return {
    national: formatBaselineValue(kind, formatCurrency(national)),
    deltaLabel:
      abs < 5 ? `Near ${avg} (${formatCurrency(national)})` : `${abs.toFixed(0)}% ${direction} ${avg}`,
    tone: toneFromPct(delta),
  }
}

export function compareNumber(
  city: number,
  national: number,
  formatNational: (value: number) => string,
  kind: BaselineKind,
  unit = '',
): CompareResult | undefined {
  const delta = pctDelta(city, national)
  if (delta == null) return undefined
  const abs = Math.abs(delta)
  const direction = delta >= 0 ? 'above' : 'below'
  const formatted = `${formatNational(national)}${unit}`
  const avg = baselineAvgPhrase(kind)
  return {
    national: formatBaselineValue(kind, formatted),
    deltaLabel: abs < 5 ? `Near ${avg} (${formatted})` : `${abs.toFixed(0)}% ${direction} ${avg}`,
    tone: toneFromPct(delta),
  }
}

function formatBaselineValue(kind: BaselineKind, value: string) {
  return `${baselinePrefix(kind)} ${value}`
}

function pointWord(abs: number) {
  return abs.toFixed(1) === '1.0' ? 'pt' : 'pts'
}

/** Point-difference compare (unemployment, temperatures). */
export function comparePoints(
  city: number,
  national: number,
  kind: BaselineKind,
  options: {
    nearThreshold: number
    formatNational: (value: number) => string
    /** Shown after the delta, e.g. "U.S. rate" or "catalog avg". */
    ratePhrase?: string
  },
): CompareResult | undefined {
  const delta = city - national
  if (!Number.isFinite(delta)) return undefined
  const abs = Math.abs(delta)
  const direction = delta >= 0 ? 'above' : 'below'
  const formatted = options.formatNational(national)
  const phrase = options.ratePhrase ?? baselineAvgPhrase(kind)
  return {
    national: formatBaselineValue(kind, formatted),
    deltaLabel:
      abs < options.nearThreshold
        ? `Near ${phrase} (${formatted})`
        : `${abs.toFixed(1)} ${pointWord(abs)} ${direction} ${phrase}`,
    tone: abs < options.nearThreshold ? 'near' : delta > 0 ? 'higher' : 'lower',
  }
}

export function compareUnemployment(city: number, national: number): CompareResult | undefined {
  return comparePoints(city, national, 'us', {
    nearThreshold: 0.5,
    formatNational: (value) => formatPercent(value),
    ratePhrase: 'U.S. rate',
  })
}
