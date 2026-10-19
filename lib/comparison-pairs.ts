import type { CityRecord } from '@/lib/types'
import { isFbiVerifiedCrime } from '@/lib/crime-source'

export type ComparisonPair = {
  /** URL slug: `{a}-vs-{b}` with city slugs */
  slug: string
  a: string
  b: string
  intent: string
}

/**
 * High-intent relocator pairs — SSG landing pages for AI/search citations.
 * Keep order stable; sitemap and index follow this list.
 */
export const COMPARISON_PAIRS: ComparisonPair[] = [
  { slug: 'austin-tx-vs-denver-co', a: 'austin-tx', b: 'denver-co', intent: 'Tech / lifestyle boomtown tradeoff' },
  { slug: 'austin-tx-vs-seattle-wa', a: 'austin-tx', b: 'seattle-wa', intent: 'Tech hub cost swap' },
  { slug: 'san-francisco-ca-vs-austin-tx', a: 'san-francisco-ca', b: 'austin-tx', intent: 'Bay Area exit to lower housing costs' },
  { slug: 'los-angeles-ca-vs-phoenix-az', a: 'los-angeles-ca', b: 'phoenix-az', intent: 'California to Sun Belt affordability' },
  { slug: 'new-york-ny-vs-chicago-il', a: 'new-york-ny', b: 'chicago-il', intent: 'Largest U.S. metro cost contrast' },
  { slug: 'dallas-tx-vs-houston-tx', a: 'dallas-tx', b: 'houston-tx', intent: 'Intra-Texas mega-city choice' },
  { slug: 'seattle-wa-vs-portland-or', a: 'seattle-wa', b: 'portland-or', intent: 'Pacific Northwest peer markets' },
  { slug: 'nashville-tn-vs-atlanta-ga', a: 'nashville-tn', b: 'atlanta-ga', intent: 'Southeast growth destinations' },
  { slug: 'miami-fl-vs-tampa-fl', a: 'miami-fl', b: 'tampa-fl', intent: 'Florida cost and climate tradeoff' },
  { slug: 'raleigh-nc-vs-charlotte-nc', a: 'raleigh-nc', b: 'charlotte-nc', intent: 'North Carolina Triangle vs banking hub' },
]

export function comparisonPath(slug: string) {
  return `/compare/${slug}`
}

export function getComparisonPair(slug: string) {
  return COMPARISON_PAIRS.find((pair) => pair.slug === slug)
}

/** Curated pair for two city slugs, either order. */
export function findComparisonPair(a: string, b: string) {
  return COMPARISON_PAIRS.find(
    (pair) => (pair.a === a && pair.b === b) || (pair.a === b && pair.b === a),
  )
}

export function comparisonsForCity(citySlug: string) {
  return COMPARISON_PAIRS.filter((pair) => pair.a === citySlug || pair.b === citySlug)
}

export function parseComparisonSlug(slug: string): { a: string; b: string } | null {
  const match = COMPARISON_PAIRS.find((pair) => pair.slug === slug)
  if (match) return { a: match.a, b: match.b }
  const parts = slug.split('-vs-')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return { a: parts[0], b: parts[1] }
}

export type ComparisonVerdict = {
  summary: string
  pickA: string
  pickB: string
  verdict: string
}

export type ComparisonGapKey = 'income' | 'housing' | 'commute' | 'crime' | 'unemployment' | 'summer'

export type ComparisonGap = {
  key: ComparisonGapKey
  /** Gap size in threshold units — used only to rank claims. */
  size: number
  leader: CityRecord
  other: CityRecord
  phrase: string
}

const THRESHOLD = {
  incomePct: 5,
  housingPoints: 5,
  commuteMinutes: 3,
  crimePct: 15,
  unemploymentPts: 0.5,
  summerF: 4,
} as const

function money(value: number) {
  return `$${value.toLocaleString('en-US')}`
}

function relPct(left: number, right: number) {
  const base = Math.min(left, right)
  if (!Number.isFinite(base) || base === 0) return 0
  return (Math.abs(left - right) / base) * 100
}

function otherOf(leader: CityRecord, a: CityRecord, b: CityRecord) {
  return leader.slug === a.slug ? b : a
}

/** Meaningful metric gaps only — below-threshold differences are omitted. */
export function comparisonGaps(a: CityRecord, b: CityRecord): ComparisonGap[] {
  const gaps: ComparisonGap[] = []

  const incomePct = relPct(a.medianHouseholdIncome, b.medianHouseholdIncome)
  if (incomePct >= THRESHOLD.incomePct) {
    const leader = a.medianHouseholdIncome >= b.medianHouseholdIncome ? a : b
    const other = otherOf(leader, a, b)
    gaps.push({
      key: 'income',
      size: incomePct / THRESHOLD.incomePct,
      leader,
      other,
      phrase: `${leader.name} shows the higher median household income (${money(leader.medianHouseholdIncome)} vs ${money(other.medianHouseholdIncome)})`,
    })
  }

  const housingPts = Math.abs(a.costOfLivingIndex - b.costOfLivingIndex)
  if (housingPts >= THRESHOLD.housingPoints) {
    const leader = a.costOfLivingIndex <= b.costOfLivingIndex ? a : b
    const other = otherOf(leader, a, b)
    gaps.push({
      key: 'housing',
      size: housingPts / THRESHOLD.housingPoints,
      leader,
      other,
      phrase:
        `${leader.name} posts the lower MapsToIt housing cost index (${leader.costOfLivingIndex} vs ${other.costOfLivingIndex}; 100 = U.S. avg), ` +
        `with median homes near ${money(leader.medianHomePrice)} versus ${money(other.medianHomePrice)}`,
    })
  }

  const commuteMin = Math.abs(a.commute.avgMinutes - b.commute.avgMinutes)
  if (commuteMin >= THRESHOLD.commuteMinutes) {
    const leader = a.commute.avgMinutes <= b.commute.avgMinutes ? a : b
    const other = otherOf(leader, a, b)
    gaps.push({
      key: 'commute',
      size: commuteMin / THRESHOLD.commuteMinutes,
      leader,
      other,
      phrase: `${leader.name} has the shorter average commute (${leader.commute.avgMinutes} vs ${other.commute.avgMinutes} minutes)`,
    })
  }

  const bothVerified = isFbiVerifiedCrime(a.crimeIndex.source) && isFbiVerifiedCrime(b.crimeIndex.source)
  if (bothVerified) {
    const crimePct = relPct(a.crimeIndex.violent, b.crimeIndex.violent)
    if (crimePct >= THRESHOLD.crimePct) {
      const leader = a.crimeIndex.violent <= b.crimeIndex.violent ? a : b
      const other = otherOf(leader, a, b)
      gaps.push({
        key: 'crime',
        size: crimePct / THRESHOLD.crimePct,
        leader,
        other,
        phrase: `${leader.name} has the lower citywide violent-offense rate (${leader.crimeIndex.violent} vs ${other.crimeIndex.violent} per 100k)`,
      })
    }
  }

  const unempPts = Math.abs(a.unemploymentRate - b.unemploymentRate)
  if (unempPts >= THRESHOLD.unemploymentPts) {
    const leader = a.unemploymentRate <= b.unemploymentRate ? a : b
    const other = otherOf(leader, a, b)
    gaps.push({
      key: 'unemployment',
      size: unempPts / THRESHOLD.unemploymentPts,
      leader,
      other,
      phrase: `${leader.name} shows the lower county unemployment rate (${leader.unemploymentRate.toFixed(1)}% vs ${other.unemploymentRate.toFixed(1)}%)`,
    })
  }

  const summerF = Math.abs(a.climate.avgHighSummer - b.climate.avgHighSummer)
  if (summerF >= THRESHOLD.summerF) {
    const leader = a.climate.avgHighSummer >= b.climate.avgHighSummer ? a : b
    const other = otherOf(leader, a, b)
    gaps.push({
      key: 'summer',
      size: summerF / THRESHOLD.summerF,
      leader,
      other,
      phrase: `${leader.name} runs hotter in summer (${leader.climate.avgHighSummer}°F vs ${other.climate.avgHighSummer}°F)`,
    })
  }

  return gaps.sort((left, right) => right.size - left.size || left.key.localeCompare(right.key))
}

function evenCorePhrase(gaps: ComparisonGap[]) {
  const present = new Set(gaps.map((gap) => gap.key))
  const items: string[] = []
  if (!present.has('income')) items.push('median incomes')
  if (!present.has('housing')) items.push('housing cost indexes')
  if (!present.has('commute')) items.push('average commutes')
  if (!items.length) return ''
  if (items.length === 1) return `${items[0]} are roughly even`
  if (items.length === 2) return `${items[0]} and ${items[1]} are roughly even`
  return `${items[0]}, ${items[1]}, and ${items[2]} are roughly even`
}

function pickClauses(gaps: ComparisonGap[]) {
  const byKey = new Map(gaps.map((gap) => [gap.key, gap]))
  const clauses: string[] = []
  const housing = byKey.get('housing')
  const crime = byKey.get('crime')
  const income = byKey.get('income')
  const commute = byKey.get('commute')
  const unemployment = byKey.get('unemployment')
  const summer = byKey.get('summer')

  if (housing) clauses.push(`pick ${housing.leader.name} if housing cost is the binding constraint`)
  if (crime) clauses.push(`pick ${crime.leader.name} if the lower citywide violent-offense rate matters more`)
  if (income) clauses.push(`pick ${income.leader.name} for higher local incomes`)
  if (clauses.length < 2 && commute) clauses.push(`pick ${commute.leader.name} for the shorter commute`)
  if (clauses.length < 2 && unemployment) {
    clauses.push(`pick ${unemployment.leader.name} for the lower unemployment reading`)
  }
  if (clauses.length < 2 && summer) {
    clauses.push(`pick ${summer.other.name} if you prefer cooler summer highs`)
  }
  return clauses
}

export function buildComparisonCopy(a: CityRecord, b: CityRecord, intent: string): ComparisonVerdict {
  const gaps = comparisonGaps(a, b)
  const opener =
    `${a.name}, ${a.stateCode} vs ${b.name}, ${b.stateCode} is a common relocator matchup (${intent.toLowerCase()}). `

  const even = evenCorePhrase(gaps)
  const gapSentences = gaps.map((gap) => gap.phrase)
  const summaryBody = gapSentences.length
    ? `${gapSentences.join('. ')}.${even ? ` ${even.charAt(0).toUpperCase()}${even.slice(1)}.` : ''}`
    : `The two markets look roughly even on income, housing cost, commute, unemployment, and summer heat.`

  const summary = `${opener}${summaryBody}`

  const pickA =
    `Choose ${a.name} when you prioritize its specific mix: housing index ${a.costOfLivingIndex}, ` +
    `median rent ${money(a.medianRent)}, unemployment ${a.unemploymentRate.toFixed(1)}%, ` +
    `and ${a.climate.avgHighSummer}°F summer highs` +
    `${a.neighborhoods?.length ? ` — with research often starting in ${a.neighborhoods.slice(0, 2).join(' and ')}` : ''}.`

  const pickB =
    `Choose ${b.name} when that profile fits better: housing index ${b.costOfLivingIndex}, ` +
    `median rent ${money(b.medianRent)}, unemployment ${b.unemploymentRate.toFixed(1)}%, ` +
    `and ${b.climate.avgHighSummer}°F summer highs` +
    `${b.neighborhoods?.length ? ` — newcomers often compare ${b.neighborhoods.slice(0, 2).join(' and ')}` : ''}.`

  const clauses = pickClauses(gaps)
  const housing = gaps.find((gap) => gap.key === 'housing')
  const housingGap = housing
    ? ` The housing-index gap is ${Math.abs(a.costOfLivingIndex - b.costOfLivingIndex)} points.`
    : ''
  const closer = ' Open each full city profile for neighborhood lists, sources, and the interactive compare tool.'

  const verdict = clauses.length
    ? `Short verdict: ${clauses.join('; ')}.${housingGap}${closer}`
    : `Short verdict: ${a.name} and ${b.name} look roughly even on the metrics MapsToIt ranks here — choose on job-market fit and neighborhoods rather than a headline number.${closer}`

  return { summary, pickA, pickB, verdict }
}
