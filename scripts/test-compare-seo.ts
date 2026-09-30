/**
 * SEO helpers for /compare query URLs (noindex / canonical).
 * Run: npm test
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareCanonicalPath } from '../lib/compare'
import { findComparisonPair } from '../lib/comparison-pairs'
import { comparePath, compareToolPath } from '../lib/paths'

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
