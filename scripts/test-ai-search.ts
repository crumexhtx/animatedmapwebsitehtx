/**
 * Lightweight Node test suite for AI-search helpers (no extra test runner deps).
 * Run: npm test
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { allCities, getCity, nationalBaselines } from '../lib/catalog'
import {
  COMPARISON_PAIRS,
  buildComparisonCopy,
  comparisonPath,
  comparisonsForCity,
  getComparisonPair,
  parseComparisonSlug,
} from '../lib/comparison-pairs'
import {
  buildCityAnswerSections,
  buildCityDirectAnswer,
  buildCitySnapshotMetrics,
  buildStateDirectAnswer,
} from '../lib/snapshot'
import { getState } from '../lib/catalog'

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

describe('city snapshot / direct answer', () => {
  it('builds a 40–80 word crawlable direct answer', () => {
    const city = getCity('austin-tx')
    assert.ok(city)
    const answer = buildCityDirectAnswer(city, nationalBaselines)
    const words = wordCount(answer)
    assert.ok(words >= 40, `expected >=40 words, got ${words}`)
    assert.ok(words <= 95, `expected <=95 words, got ${words}`)
    assert.match(answer, /Austin/)
    assert.match(answer, /\d+/)
  })

  it('varies templates across unrelated cities', () => {
    const a = buildCityDirectAnswer(getCity('austin-tx')!, nationalBaselines)
    const b = buildCityDirectAnswer(getCity('seattle-wa')!, nationalBaselines)
    assert.notEqual(a, b)
  })

  it('emits proprietary snapshot metrics with national notes', () => {
    const city = getCity('houston-tx')!
    const metrics = buildCitySnapshotMetrics(city, nationalBaselines)
    assert.ok(metrics.length >= 6)
    assert.ok(metrics.some((m) => m.label === 'Housing cost index'))
    assert.ok(metrics.some((m) => m.note?.includes('U.S.') || m.note?.includes('avg') || m.note?.includes('FBI')))
  })
})

describe('answer-first sections', () => {
  it('uses question-style H2s and standalone answers', () => {
    const city = getCity('denver-co')!
    const sections = buildCityAnswerSections(city, nationalBaselines)
    assert.ok(sections.length >= 5)
    for (const section of sections) {
      assert.match(section.heading, /\?$/)
      assert.ok(wordCount(section.answer) >= 20)
    }
  })
})

describe('comparison pairs', () => {
  it('defines 8–10 curated pairs with resolvable cities', () => {
    assert.ok(COMPARISON_PAIRS.length >= 8 && COMPARISON_PAIRS.length <= 12)
    for (const pair of COMPARISON_PAIRS) {
      assert.ok(getCity(pair.a), `missing ${pair.a}`)
      assert.ok(getCity(pair.b), `missing ${pair.b}`)
      assert.equal(pair.slug, `${pair.a}-vs-${pair.b}`)
      assert.equal(comparisonPath(pair.slug), `/compare/${pair.slug}`)
      assert.ok(getComparisonPair(pair.slug))
      assert.deepEqual(parseComparisonSlug(pair.slug), { a: pair.a, b: pair.b })
    }
  })

  it('builds answer-first comparison copy and verdict', () => {
    const pair = COMPARISON_PAIRS[0]
    const a = getCity(pair.a)!
    const b = getCity(pair.b)!
    const copy = buildComparisonCopy(a, b, pair.intent)
    assert.ok(wordCount(copy.summary) >= 40)
    assert.ok(copy.pickA.includes(a.name))
    assert.ok(copy.pickB.includes(b.name))
    assert.ok(copy.verdict.length > 40)
  })

  it('links related comparisons from a city slug', () => {
    const related = comparisonsForCity('austin-tx')
    assert.ok(related.length >= 2)
    assert.ok(related.every((pair) => pair.a === 'austin-tx' || pair.b === 'austin-tx'))
  })
})

describe('state snapshot', () => {
  it('builds a direct answer for a state page', () => {
    const state = getState('texas')
    assert.ok(state)
    const answer = buildStateDirectAnswer(state)
    assert.ok(wordCount(answer) >= 35)
    assert.match(answer, /Texas/)
  })
})

describe('catalog sanity for AI pages', () => {
  it('has enough cities for SSG city pages', () => {
    assert.ok(allCities.length >= 100)
  })
})
