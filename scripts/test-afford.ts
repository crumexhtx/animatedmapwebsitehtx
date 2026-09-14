/**
 * Unit tests for affordability ranking / URL helpers.
 * Run: npm test
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_AFFORD_FILTERS,
  affordPath,
  cheapestWithinMode,
  filterAffordCities,
  parseAffordFilters,
  searchAffordCities,
  sortAffordResults,
  suggestRelaxedFilter,
  type AffordFilters,
} from '../lib/afford'
import { testCity } from './lib/city-fixture'

const cheap = testCity({
  slug: 'cheap-tx',
  name: 'Cheap',
  medianRent: 1000,
  medianHomePrice: 150000,
  medianHouseholdIncome: 55000,
  crimeIndex: { violent: 100, property: 800, source: 'FBI CDE' },
  commute: { avgMinutes: 15, walkScore: 80 },
  climate: { avgHighSummer: 95, avgLowWinter: 45, annualRainfall: 30, sunnyDays: 250 },
})

const mid = testCity({
  slug: 'mid-tx',
  name: 'Mid',
  medianRent: 1500,
  medianHomePrice: 300000,
  medianHouseholdIncome: 70000,
  crimeIndex: { violent: 400, property: 2000, source: 'FBI CDE' },
  commute: { avgMinutes: 25, walkScore: 50 },
})

const pricey = testCity({
  slug: 'pricey-tx',
  name: 'Pricey',
  medianRent: 2500,
  medianHomePrice: 600000,
  medianHouseholdIncome: 110000,
  crimeIndex: { violent: 800, property: 3200, source: 'FBI CDE' },
  commute: { avgMinutes: 40, walkScore: 90 },
  climate: { avgHighSummer: 75, avgLowWinter: 20, annualRainfall: 45, sunnyDays: 180 },
})

const curated = testCity({
  slug: 'curated-tx',
  name: 'Curated',
  medianRent: 1200,
  crimeIndex: { violent: 50, property: 100, source: 'curated seed estimate' },
})

const unavailable = testCity({
  slug: 'gap-tx',
  name: 'Gap',
  medianRent: 1100,
  crimeIndex: { violent: 0, property: 0, source: 'data unavailable' },
})

const noWalk = testCity({
  slug: 'nowalk-tx',
  name: 'NoWalk',
  medianRent: 1300,
  commute: { avgMinutes: 20, walkScore: undefined },
})

const catalog = [cheap, mid, pricey, curated, unavailable, noWalk]

function filters(overrides: Partial<AffordFilters> = {}): AffordFilters {
  return {
    ...DEFAULT_AFFORD_FILTERS,
    budget: 2000,
    ...overrides,
  }
}

describe('filterAffordCities', () => {
  it('returns no matches until a positive budget is set', () => {
    assert.deepEqual(filterAffordCities(catalog, filters({ budget: null })), [])
    assert.deepEqual(filterAffordCities(catalog, filters({ budget: 0 })), [])
  })

  it('keeps cities at or under the rent budget and drops those above', () => {
    const matches = filterAffordCities(catalog, filters({ budget: 1500, mode: 'rent' }))
    const slugs = matches.map((m) => m.city.slug).sort()
    assert.deepEqual(slugs, ['cheap-tx', 'curated-tx', 'gap-tx', 'mid-tx', 'nowalk-tx'])
  })

  it('computes leftover budget and utilization against housing cost', () => {
    const [match] = filterAffordCities([cheap], filters({ budget: 2000, mode: 'rent' }))
    assert.equal(match.budgetGap, 1000)
    assert.equal(match.budgetUtilization, 0.5)
  })

  it('uses home price when mode is buy', () => {
    const matches = filterAffordCities(catalog, filters({ budget: 200000, mode: 'buy' }))
    assert.deepEqual(
      matches.map((m) => m.city.slug),
      ['cheap-tx'],
    )
  })

  it('excludes curated and unavailable crime when a crime tolerance is set', () => {
    const matches = filterAffordCities(catalog, filters({ crimeTolerance: 'low' }))
    const slugs = matches.map((m) => m.city.slug)
    assert.ok(slugs.includes('cheap-tx'))
    assert.ok(!slugs.includes('curated-tx'))
    assert.ok(!slugs.includes('gap-tx'))
  })

  it('drops cities missing a walk score when a minimum is required', () => {
    const matches = filterAffordCities(catalog, filters({ minWalkScore: 70 }))
    const slugs = matches.map((m) => m.city.slug)
    assert.ok(slugs.includes('cheap-tx'))
    assert.ok(!slugs.includes('nowalk-tx'))
    assert.ok(!slugs.includes('mid-tx'))
  })

  it('applies commute, climate, and income filters', () => {
    const matches = filterAffordCities(
      [cheap, mid, pricey],
      filters({
        maxCommute: 20,
        minSummerHigh: 90,
        minMedianIncome: 50000,
      }),
    )
    assert.deepEqual(
      matches.map((m) => m.city.slug),
      ['cheap-tx'],
    )
  })
})

describe('sortAffordResults / searchAffordCities', () => {
  it('ranks budget-fit by highest utilization of the budget', () => {
    const sorted = searchAffordCities([cheap, mid], filters({ budget: 2000, sort: 'budget-fit' }))
    assert.deepEqual(
      sorted.map((m) => m.city.slug),
      ['mid-tx', 'cheap-tx'],
    )
  })

  it('ranks safest first and sends missing crime data to the end', () => {
    const matches = filterAffordCities([cheap, mid, curated], filters({ crimeTolerance: 'any' }))
    const sorted = sortAffordResults(matches, 'safest')
    assert.equal(sorted[0].city.slug, 'cheap-tx')
    assert.equal(sorted[sorted.length - 1].city.slug, 'curated-tx')
  })

  it('ranks walk score descending and commute ascending', () => {
    const walk = searchAffordCities([cheap, mid], filters({ sort: 'walk-score' }))
    assert.equal(walk[0].city.slug, 'cheap-tx')
    const commute = searchAffordCities([cheap, mid], filters({ sort: 'commute' }))
    assert.equal(commute[0].city.slug, 'cheap-tx')
  })

  it('ranks income descending', () => {
    const sorted = searchAffordCities([cheap, mid], filters({ sort: 'income' }))
    assert.equal(sorted[0].city.slug, 'mid-tx')
  })
})

describe('suggestRelaxedFilter', () => {
  it('returns null when matches already exist or budget itself is impossible', () => {
    assert.equal(suggestRelaxedFilter(catalog, filters({ budget: 2000 })), null)
    assert.equal(suggestRelaxedFilter(catalog, filters({ budget: 50 })), null)
  })

  it('suggests the optional filter whose removal restores the most cities', () => {
    const suggestion = suggestRelaxedFilter(
      catalog,
      filters({
        minWalkScore: 70,
        maxCommute: 10,
      }),
    )
    assert.ok(suggestion)
    assert.equal(suggestion.filterKey, 'maxCommute')
    assert.ok(suggestion.wouldAdd >= 1)
  })
})

describe('parseAffordFilters / affordPath', () => {
  it('parses query params with defaults and clamps walk score', () => {
    const parsed = parseAffordFilters({
      mode: 'buy',
      budget: '350000',
      crime: 'low',
      sort: 'safest',
      walk: '150',
      commute: '30',
    })
    assert.equal(parsed.mode, 'buy')
    assert.equal(parsed.budget, 350000)
    assert.equal(parsed.crimeTolerance, 'low')
    assert.equal(parsed.sort, 'safest')
    assert.equal(parsed.minWalkScore, 100)
    assert.equal(parsed.maxCommute, 30)
  })

  it('falls back to rent / budget-fit on unknown values', () => {
    const parsed = parseAffordFilters({ mode: 'lease', sort: 'random', crime: 'extreme' })
    assert.equal(parsed.mode, 'rent')
    assert.equal(parsed.sort, 'budget-fit')
    assert.equal(parsed.crimeTolerance, 'any')
    assert.equal(parsed.budget, null)
  })

  it('round-trips non-default filters into a shareable path', () => {
    const path = affordPath({
      mode: 'buy',
      budget: 275000.4,
      crimeTolerance: 'medium',
      minWalkScore: 40,
      sort: 'income',
    })
    assert.equal(path, '/afford?mode=buy&budget=275000&crime=medium&walk=40&sort=income')
    assert.equal(affordPath({}), '/afford?mode=rent')
  })
})

describe('cheapestWithinMode', () => {
  it('returns the lowest-cost city for the selected housing mode', () => {
    assert.equal(cheapestWithinMode([mid, cheap, pricey], 'rent')?.slug, 'cheap-tx')
    assert.equal(cheapestWithinMode([], 'rent'), null)
  })
})
