/**
 * SEO helpers for /compare query URLs (noindex / canonical).
 * Run: npm test
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareCanonicalPath } from '../lib/compare'
import { buildComparisonCopy, findComparisonPair } from '../lib/comparison-pairs'
import { getCity } from '../lib/catalog'
import { comparePath, compareToolPath } from '../lib/paths'
import { testCity } from './lib/city-fixture'

describe('compare tool vs landing URLs', () => {
  it('keeps the interactive tool on a query string', () => {
    assert.equal(
      compareToolPath(['yonkers-ny', 'new-york-ny']),
      '/compare?cities=yonkers-ny,new-york-ny',
    )
    assert.equal(compareToolPath([]), '/compare')
  })

  it('uses the curated pair page when a public compare link matches one', () => {
    assert.equal(comparePath(['austin-tx', 'denver-co']), '/compare/austin-tx-vs-denver-co')
    assert.equal(comparePath(['denver-co', 'austin-tx']), '/compare/austin-tx-vs-denver-co')
  })

  it('falls back to the tool for pairs that are not curated landing pages', () => {
    assert.equal(
      comparePath(['yonkers-ny', 'new-york-ny']),
      '/compare?cities=yonkers-ny,new-york-ny',
    )
  })
})

describe('compareCanonicalPath', () => {
  it('canonicalizes query URLs to the hub, not a noindex tag', () => {
    assert.equal(
      compareCanonicalPath({ cities: 'yonkers-ny,new-york-ny' }),
      '/compare',
    )
    assert.equal(compareCanonicalPath({ mode: 'match', like: 'provo-ut' }), '/compare')
    assert.equal(compareCanonicalPath({ cities: 'little-rock-ar' }), '/compare')
  })

  it('canonicalizes a curated pair query to the static pair page', () => {
    assert.equal(
      compareCanonicalPath({ cities: 'austin-tx,denver-co' }),
      '/compare/austin-tx-vs-denver-co',
    )
    assert.equal(
      compareCanonicalPath({ mode: 'compare', cities: 'denver-co,austin-tx' }),
      '/compare/austin-tx-vs-denver-co',
    )
  })
})

describe('findComparisonPair', () => {
  it('matches either slug order', () => {
    const forward = findComparisonPair('miami-fl', 'tampa-fl')
    const reverse = findComparisonPair('tampa-fl', 'miami-fl')
    assert.ok(forward)
    assert.equal(forward, reverse)
    assert.equal(findComparisonPair('yonkers-ny', 'new-york-ny'), undefined)
  })
})

describe('buildComparisonCopy thresholds', () => {
  const baseA = testCity({
    slug: 'alpha-tx',
    name: 'Alpha',
    medianHouseholdIncome: 70000,
    costOfLivingIndex: 100,
    commute: { avgMinutes: 25, walkScore: 50 },
    crimeIndex: { violent: 200, property: 900, source: 'FBI CDE' },
    unemploymentRate: 4.0,
    climate: { avgHighSummer: 90, avgLowWinter: 35, annualRainfall: 40, sunnyDays: 220 },
  })

  it('does not claim an income winner on a near-tie', () => {
    const copy = buildComparisonCopy(
      baseA,
      testCity({
        slug: 'beta-tx',
        name: 'Beta',
        medianHouseholdIncome: 71000,
        costOfLivingIndex: 100,
        commute: { avgMinutes: 25, walkScore: 50 },
        crimeIndex: { violent: 200, property: 900, source: 'FBI CDE' },
        unemploymentRate: 4.0,
        climate: { avgHighSummer: 90, avgLowWinter: 35, annualRainfall: 40, sunnyDays: 220 },
      }),
      'Near-tie test',
    )
    assert.doesNotMatch(copy.summary, /higher median household income/i)
    assert.doesNotMatch(copy.verdict, /higher local incomes/i)
    assert.match(copy.summary, /roughly even/)
  })

  it('includes a large FBI-verified violent-crime gap in the verdict', () => {
    const copy = buildComparisonCopy(
      baseA,
      testCity({
        slug: 'beta-tx',
        name: 'Beta',
        medianHouseholdIncome: 70000,
        costOfLivingIndex: 100,
        commute: { avgMinutes: 25, walkScore: 50 },
        crimeIndex: { violent: 400, property: 1800, source: 'FBI CIUS Table 8 (2019), city offenses per 100k' },
        unemploymentRate: 4.0,
        climate: { avgHighSummer: 90, avgLowWinter: 35, annualRainfall: 40, sunnyDays: 220 },
      }),
      'Crime-gap test',
    )
    assert.match(copy.summary, /violent-offense rate/)
    assert.match(copy.verdict, /violent-offense/)
    assert.match(copy.verdict, /Alpha/)
  })

  it('skips crime in the verdict when either city is unavailable or curated', () => {
    const unavailable = buildComparisonCopy(
      baseA,
      testCity({
        slug: 'beta-tx',
        name: 'Beta',
        medianHouseholdIncome: 70000,
        costOfLivingIndex: 100,
        commute: { avgMinutes: 25, walkScore: 50 },
        crimeIndex: { violent: 800, property: 3000, source: 'data unavailable' },
        unemploymentRate: 4.0,
        climate: { avgHighSummer: 90, avgLowWinter: 35, annualRainfall: 40, sunnyDays: 220 },
      }),
      'Unavailable crime',
    )
    const curated = buildComparisonCopy(
      baseA,
      testCity({
        slug: 'gamma-tx',
        name: 'Gamma',
        medianHouseholdIncome: 70000,
        costOfLivingIndex: 100,
        commute: { avgMinutes: 25, walkScore: 50 },
        crimeIndex: { violent: 800, property: 3000, source: 'curated seed estimate' },
        unemploymentRate: 4.0,
        climate: { avgHighSummer: 90, avgLowWinter: 35, annualRainfall: 40, sunnyDays: 220 },
      }),
      'Curated crime',
    )
    assert.doesNotMatch(unavailable.summary, /violent-offense/)
    assert.doesNotMatch(unavailable.verdict, /violent-offense/)
    assert.doesNotMatch(curated.summary, /violent-offense/)
    assert.doesNotMatch(curated.verdict, /violent-offense/)
  })

  it('does not claim an Austin vs Denver income winner and does mention the crime gap', () => {
    const a = getCity('austin-tx')
    const b = getCity('denver-co')
    assert.ok(a && b)
    const copy = buildComparisonCopy(a, b, 'Tech / lifestyle boomtown tradeoff')
    assert.doesNotMatch(copy.summary, /higher median household income/)
    assert.doesNotMatch(copy.verdict, /higher local incomes/)
    assert.match(copy.verdict, /violent-offense/)
    assert.match(copy.verdict, /Austin/)
  })
})
