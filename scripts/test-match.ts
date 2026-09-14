/**
 * Unit tests for city match scoring / URL helpers.
 * Run: npm test
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_MATCH_FILTERS,
  DEFAULT_MATCH_WEIGHTS,
  catalogRanges,
  cityCriterionScores,
  filtersFromCity,
  parseMatchFilters,
  parseMatchWeights,
  scoreCities,
} from '../lib/match'
import { testCity, testNational } from './lib/city-fixture'

const affordable = testCity({
  slug: 'affordable-tx',
  name: 'Affordable',
  costOfLivingIndex: 80,
  medianHouseholdIncome: 60000,
  crimeIndex: { violent: 120, property: 900, source: 'FBI CDE' },
  climate: { avgHighSummer: 96, avgLowWinter: 48, annualRainfall: 30, sunnyDays: 260 },
})

const expensive = testCity({
  slug: 'expensive-tx',
  name: 'Expensive',
  costOfLivingIndex: 160,
  medianHouseholdIncome: 120000,
  crimeIndex: { violent: 700, property: 3000, source: 'FBI CDE' },
  climate: { avgHighSummer: 72, avgLowWinter: 18, annualRainfall: 40, sunnyDays: 160 },
})

const curated = testCity({
  slug: 'curated-tx',
  name: 'Curated',
  costOfLivingIndex: 100,
  crimeIndex: { violent: 10, property: 10, source: 'curated seed estimate' },
  climate: { avgHighSummer: 84, avgLowWinter: 32, annualRainfall: 40, sunnyDays: 200 },
})

const catalog = [affordable, expensive, curated]

describe('cityCriterionScores', () => {
  it('scores cheaper and safer cities higher on cost and safety', () => {
    const ranges = catalogRanges(catalog, testNational)
    const low = cityCriterionScores(affordable, ranges, 'any')
    const high = cityCriterionScores(expensive, ranges, 'any')
    assert.ok(low.cost > high.cost)
    assert.ok(low.safety > high.safety)
    assert.ok(high.income > low.income)
  })

  it('gives curated / unavailable crime a fixed mid-low safety score', () => {
    const ranges = catalogRanges(catalog, testNational)
    const scores = cityCriterionScores(curated, ranges, 'any')
    assert.equal(scores.safety, 35)
  })
})

describe('scoreCities', () => {
  it('excludes the baseline slug and cities outside the COL window', () => {
    const scored = scoreCities(catalog, catalog, testNational, DEFAULT_MATCH_WEIGHTS, {
      ...DEFAULT_MATCH_FILTERS,
      colMin: 70,
      colMax: 120,
      climate: 'any',
      excludeSlug: 'curated-tx',
    })
    assert.deepEqual(
      scored.map((row) => row.city.slug),
      ['affordable-tx'],
    )
  })

  it('returns score 0 when every weight is zero', () => {
    const scored = scoreCities(catalog, catalog, testNational, {
      cost: 0,
      safety: 0,
      income: 0,
      climate: 0,
    }, { ...DEFAULT_MATCH_FILTERS, climate: 'any' })
    assert.ok(scored.length > 0)
    assert.ok(scored.every((row) => row.score === 0))
  })

  it('filters to the warm climate band', () => {
    const scored = scoreCities(catalog, catalog, testNational, DEFAULT_MATCH_WEIGHTS, {
      colMin: 60,
      colMax: 200,
      climate: 'warm',
    })
    assert.deepEqual(
      scored.map((row) => row.city.slug),
      ['affordable-tx'],
    )
  })

  it('sorts higher scores first', () => {
    const scored = scoreCities(
      [affordable, expensive],
      catalog,
      testNational,
      { cost: 5, safety: 0, income: 0, climate: 0 },
      { colMin: 60, colMax: 200, climate: 'any' },
    )
    assert.equal(scored[0].city.slug, 'affordable-tx')
    assert.ok(scored[0].score > scored[1].score)
  })
})

describe('filtersFromCity', () => {
  it('derives a warm band and COL window around a hot city', () => {
    const filters = filtersFromCity(affordable)
    assert.equal(filters.climate, 'warm')
    assert.equal(filters.excludeSlug, 'affordable-tx')
    assert.equal(filters.colMin, 60)
    assert.equal(filters.colMax, 100)
  })

  it('derives a cold band for a city with cool summers and winters', () => {
    const filters = filtersFromCity(expensive)
    assert.equal(filters.climate, 'cold')
    assert.equal(filters.colMin, 140)
    assert.equal(filters.colMax, 180)
  })
})

describe('parseMatchWeights / parseMatchFilters', () => {
  it('clamps weights to 0–5 and uses defaults when missing', () => {
    const weights = parseMatchWeights({ wCost: '9', wSafety: '-1', wIncome: 'not-a-number' })
    assert.equal(weights.cost, 5)
    assert.equal(weights.safety, 0)
    assert.equal(weights.income, DEFAULT_MATCH_WEIGHTS.income)
    assert.equal(weights.climate, DEFAULT_MATCH_WEIGHTS.climate)
  })

  it('parses filters, falling back to the baseline city when params are absent', () => {
    const parsed = parseMatchFilters({}, affordable)
    assert.equal(parsed.climate, 'warm')
    assert.equal(parsed.excludeSlug, 'affordable-tx')
    assert.equal(parsed.colMin, 60)
  })

  it('accepts explicit climate and COL overrides', () => {
    const parsed = parseMatchFilters(
      { climate: 'mild', colMin: '90', colMax: '130' },
      expensive,
    )
    assert.equal(parsed.climate, 'mild')
    assert.equal(parsed.colMin, 90)
    assert.equal(parsed.colMax, 130)
    assert.equal(parsed.excludeSlug, 'expensive-tx')
  })
})
