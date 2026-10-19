/**
 * Baselines, unemployment wording, crime source labels, nearby-by-distance.
 * Run: npm test
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { METRIC_BASELINE_KIND, baselineAvgPhrase } from '../lib/baselines'
import { compareCurrency, compareNumber, compareUnemployment } from '../lib/stat-compare'
import { publicCrimeSource, crimeRateNote, crimeSourceKind } from '../lib/crime-source'
import { nearestCitySlugs } from '../lib/geo'
import { allCities, getCity, getSameNameCities } from '../lib/catalog'

describe('METRIC_BASELINE_KIND', () => {
  it('marks ACS/BLS fields as U.S. and crime/climate/commute as catalog', () => {
    assert.equal(METRIC_BASELINE_KIND.medianHouseholdIncome, 'us')
    assert.equal(METRIC_BASELINE_KIND.unemploymentRate, 'us')
    assert.equal(METRIC_BASELINE_KIND.crimeViolent, 'catalog')
    assert.equal(METRIC_BASELINE_KIND.commuteMinutes, 'catalog')
    assert.equal(METRIC_BASELINE_KIND.avgHighSummer, 'catalog')
    assert.equal(baselineAvgPhrase('catalog'), 'catalog avg')
  })
})

describe('compare helpers', () => {
  it('uses catalog avg for crime-style percent deltas', () => {
    const result = compareNumber(1072.2, 586.6, (v) => String(v), 'catalog')
    assert.ok(result)
    assert.match(result.deltaLabel, /catalog avg/)
    assert.match(result.national, /^Catalog avg /)
    assert.doesNotMatch(result.deltaLabel, /U\.S\. avg/)
  })

  it('keeps U.S. avg for housing currency', () => {
    const result = compareCurrency(253400, 303400, 'us')
    assert.ok(result)
    assert.match(result.deltaLabel, /U\.S\. avg/)
    assert.match(result.national, /^U\.S\. /)
  })

  it('phrases unemployment as points vs the U.S. rate', () => {
    const near = compareUnemployment(4.4, 4.2)
    assert.ok(near)
    assert.equal(near.tone, 'near')
    assert.match(near.deltaLabel, /4\.2%/)
    assert.doesNotMatch(near.deltaLabel, /pts/)

    const above = compareUnemployment(5.2, 4.2)
    assert.ok(above)
    assert.equal(above.tone, 'higher')
    assert.equal(above.deltaLabel, '1.0 pt above U.S. rate')
    assert.equal(above.national, 'U.S. 4.2%')
  })
})

describe('publicCrimeSource', () => {
  it('strips pipeline diagnostics from Table 8 labels', () => {
    assert.equal(
      publicCrimeSource(
        'FBI CIUS Table 8 (2019) city offenses known to law enforcement — rates per 100k; CDE API unavailable at enrich time',
      ),
      'FBI CIUS Table 8 (2019), city offenses per 100k',
    )
    assert.equal(crimeSourceKind('FBI CIUS Table 8 (2019), city offenses per 100k'), 'cius')
    assert.equal(crimeRateNote('FBI CIUS Table 8 (2019), city offenses per 100k'), 'per 100k · citywide')
    assert.doesNotMatch(crimeRateNote('FBI CIUS Table 8 (2019), city offenses per 100k'), /annualized/)
  })
})

describe('nearestCitySlugs', () => {
  it('returns the closest cities by great-circle distance and never includes self', () => {
    const houston = { slug: 'houston-tx', coordinates: [-95.3698, 29.7604] as [number, number] }
    const sugar = { slug: 'sugar-land-tx', coordinates: [-95.6349, 29.6197] as [number, number] }
    const dallas = { slug: 'dallas-tx', coordinates: [-96.797, 32.7767] as [number, number] }
    const austin = { slug: 'austin-tx', coordinates: [-97.7431, 30.2672] as [number, number] }
    const seattle = { slug: 'seattle-wa', coordinates: [-122.3321, 47.6062] as [number, number] }
    const nearby = nearestCitySlugs(houston, [houston, sugar, dallas, austin, seattle], 3)
    assert.equal(nearby[0], 'sugar-land-tx')
    assert.ok(!nearby.includes('houston-tx'))
    assert.ok(!nearby.includes('seattle-wa'))
  })
})

describe('catalog expansion', () => {
  it('publishes the 20 new cities including Houston suburbs', () => {
    assert.ok(allCities.length >= 245)
    for (const slug of [
      'sugar-land-tx',
      'pearland-tx',
      'league-city-tx',
      'conroe-tx',
      'pasadena-tx',
      'meridian-id',
      'columbus-ga',
    ]) {
      assert.ok(getCity(slug), `missing ${slug}`)
    }
  })

  it('lists Houston suburbs among Houston nearby cities', () => {
    const houston = getCity('houston-tx')
    assert.ok(houston)
    const nearby = houston.nearbyCities
    for (const slug of ['sugar-land-tx', 'pearland-tx', 'pasadena-tx', 'league-city-tx']) {
      assert.ok(nearby.includes(slug), `expected ${slug} near Houston, got ${nearby.join(', ')}`)
    }
  })

  it('keeps same-name cities on distinct state slugs', () => {
    for (const name of ['Pasadena', 'Fayetteville', 'Columbia', 'Rochester', 'Columbus']) {
      const matches = allCities.filter((city) => city.name === name)
      assert.ok(matches.length >= 2, `expected twins for ${name}`)
      const states = new Set(matches.map((city) => city.stateCode))
      assert.equal(states.size, matches.length, `${name} state collision`)
    }
    const pasadenaTx = getCity('pasadena-tx')
    assert.ok(pasadenaTx)
    const twins = getSameNameCities(pasadenaTx)
    assert.ok(twins.some((city) => city.slug === 'pasadena-ca'))
  })
})
