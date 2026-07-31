import type { CityRecord } from '@/lib/types'

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

function cheaperHousing(a: CityRecord, b: CityRecord) {
  return a.costOfLivingIndex <= b.costOfLivingIndex ? a : b
}

export function buildComparisonCopy(a: CityRecord, b: CityRecord, intent: string): ComparisonVerdict {
  const cheaper = cheaperHousing(a, b)
  const pricier = cheaper.slug === a.slug ? b : a
  const incomeLeader = a.medianHouseholdIncome >= b.medianHouseholdIncome ? a : b
  const shorterCommute = a.commute.avgMinutes <= b.commute.avgMinutes ? a : b

  const summary =
    `${a.name}, ${a.stateCode} vs ${b.name}, ${b.stateCode} is a common relocator matchup (${intent.toLowerCase()}). ` +
    `${cheaper.name} posts the lower MapsToIt housing cost index (${cheaper.costOfLivingIndex} vs ${pricier.costOfLivingIndex}; 100 = U.S. avg), ` +
    `with median homes near $${cheaper.medianHomePrice.toLocaleString('en-US')} versus $${pricier.medianHomePrice.toLocaleString('en-US')}. ` +
    `${incomeLeader.name} shows the higher median household income ($${incomeLeader.medianHouseholdIncome.toLocaleString('en-US')}), ` +
    `while ${shorterCommute.name} edges the shorter average commute (${shorterCommute.commute.avgMinutes} vs ${shorterCommute.slug === a.slug ? b.commute.avgMinutes : a.commute.avgMinutes} minutes).`

  const pickA =
    `Choose ${a.name} when you prioritize its specific mix: housing index ${a.costOfLivingIndex}, ` +
    `median rent $${a.medianRent.toLocaleString('en-US')}, unemployment ${a.unemploymentRate.toFixed(1)}%, ` +
    `and ${a.climate.avgHighSummer}°F summer highs` +
    `${a.neighborhoods?.length ? ` — with research often starting in ${a.neighborhoods.slice(0, 2).join(' and ')}` : ''}.`

  const pickB =
    `Choose ${b.name} when that profile fits better: housing index ${b.costOfLivingIndex}, ` +
    `median rent $${b.medianRent.toLocaleString('en-US')}, unemployment ${b.unemploymentRate.toFixed(1)}%, ` +
    `and ${b.climate.avgHighSummer}°F summer highs` +
    `${b.neighborhoods?.length ? ` — newcomers often compare ${b.neighborhoods.slice(0, 2).join(' and ')}` : ''}.`

  const verdict =
    `Short verdict: pick ${cheaper.name} if housing cost is the binding constraint; ` +
    `pick ${pricier.name} if you are optimizing for ${pricier.slug === incomeLeader.slug ? 'higher local incomes' : 'its climate, commute, or job-market fit'} ` +
    `and can absorb the ${Math.abs(a.costOfLivingIndex - b.costOfLivingIndex)}-point housing-index gap. ` +
    `Open each full city profile for neighborhood lists, sources, and the interactive compare tool.`

  return { summary, pickA, pickB, verdict }
}
