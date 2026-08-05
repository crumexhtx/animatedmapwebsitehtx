'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import type { CityRecord, NationalBaselines } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/format'
import {
  DEFAULT_MATCH_FILTERS,
  DEFAULT_MATCH_WEIGHTS,
  MATCH_CRITERION_LABELS,
  scoreCities,
  type ClimatePreference,
  type MatchFilters,
  type MatchWeights,
} from '@/lib/match'
import { cityPath, comparePath, matchPath } from '@/lib/paths'

export function MatchCities({
  cities,
  national,
  initialWeights = DEFAULT_MATCH_WEIGHTS,
  initialFilters = DEFAULT_MATCH_FILTERS,
  baselineSlug,
}: {
  cities: CityRecord[]
  national: NationalBaselines
  initialWeights?: MatchWeights
  initialFilters?: MatchFilters
  baselineSlug?: string
}) {
  const [, startTransition] = useTransition()
  const [weights, setWeights] = useState<MatchWeights>(initialWeights)
  const [filters, setFilters] = useState<MatchFilters>(initialFilters)
  const [limit, setLimit] = useState(12)

  const baseline = baselineSlug ? cities.find((city) => city.slug === baselineSlug) : undefined

  const ranked = useMemo(
    () => scoreCities(cities, cities, national, weights, filters).slice(0, limit),
    [cities, national, weights, filters, limit],
  )

  const shareHref = matchPath({
    like: filters.excludeSlug ?? baselineSlug,
    colMin: filters.colMin,
    colMax: filters.colMax,
    climate: filters.climate,
    weights,
  })

  const setWeight = (key: keyof MatchWeights, value: number) => {
    startTransition(() => {
      setWeights((prev) => ({ ...prev, [key]: value }))
    })
  }

  const setFilter = <K extends keyof MatchFilters>(key: K, value: MatchFilters[K]) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    })
  }

  return (
    <div className="compare-tool match-tool">
      {baseline ? (
        <p className="match-baseline">
          Finding cities like{' '}
          <Link href={cityPath(baseline)}>
            {baseline.name}, {baseline.stateCode}
          </Link>{' '}
          (similar housing-cost band and climate preference). Adjust weights below to refine.
        </p>
      ) : null}

      <div className="match-controls">
        <fieldset className="match-fieldset">
          <legend>Housing cost index range</legend>
          <div className="match-range-row">
            <label>
              Min
              <input
                type="number"
                min={60}
                max={220}
                value={filters.colMin}
                onChange={(event) => setFilter('colMin', Number(event.target.value))}
              />
            </label>
            <label>
              Max
              <input
                type="number"
                min={60}
                max={220}
                value={filters.colMax}
                onChange={(event) => setFilter('colMax', Number(event.target.value))}
              />
            </label>
            <p className="match-hint">100 ≈ U.S. average housing costs</p>
          </div>
        </fieldset>

        <fieldset className="match-fieldset">
          <legend>Climate preference</legend>
          <div className="match-climate">
            {(['any', 'warm', 'mild', 'cold'] as ClimatePreference[]).map((option) => (
              <label key={option} className={filters.climate === option ? 'is-active' : undefined}>
                <input
                  type="radio"
                  name="climate"
                  value={option}
                  checked={filters.climate === option}
                  onChange={() => setFilter('climate', option)}
                />
                {option === 'any' ? 'Any' : option[0].toUpperCase() + option.slice(1)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="match-fieldset">
          <legend>Priority weights (0–5)</legend>
          <div className="match-weights">
            {(Object.keys(MATCH_CRITERION_LABELS) as (keyof MatchWeights)[]).map((key) => (
              <label key={key} className="match-weight">
                <span>
                  {MATCH_CRITERION_LABELS[key]}
                  <strong>{weights[key]}</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={weights[key]}
                  onChange={(event) => setWeight(key, Number(event.target.value))}
                />
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="match-results-heading">
        <h2>Best fits</h2>
        <p>
          {ranked.length
            ? `Top ${ranked.length} catalog cities for your weights and filters.`
            : 'No cities match these filters — widen the cost range or set climate to Any.'}
        </p>
      </div>

      {ranked.length ? (
        <ol className="match-results">
          {ranked.map(({ city, score, breakdown }, index) => (
            <li key={city.slug} className="match-result">
              <div className="match-result-main">
                <span className="match-rank">{index + 1}</span>
                <div>
                  <Link href={cityPath(city)}>
                    <strong>
                      {city.name}, {city.stateCode}
                    </strong>
                  </Link>
                  <p>
                    Index {city.costOfLivingIndex} · income {formatCurrency(city.medianHouseholdIncome)} ·{' '}
                    {formatNumber(city.population)} people
                  </p>
                </div>
                <div className="match-score" aria-label={`Fit score ${score}`}>
                  <strong>{Math.round(score)}</strong>
                  <span>fit</span>
                </div>
              </div>
              <div className="match-breakdown" aria-hidden>
                {(Object.keys(breakdown) as (keyof MatchWeights)[]).map((key) => (
                  <span key={key}>
                    {MATCH_CRITERION_LABELS[key].split(' ')[0]} {Math.round(breakdown[key])}
                  </span>
                ))}
              </div>
              <div className="match-result-actions">
                <Link className="button button-secondary" href={comparePath([city.slug, baselineSlug ?? ''].filter(Boolean))}>
                  {baselineSlug ? `Compare with ${baseline?.name ?? 'baseline'}` : 'Open in Compare'}
                </Link>
                <Link className="button button-secondary" href={cityPath(city)}>
                  Full profile
                </Link>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {ranked.length >= limit && limit < 30 ? (
        <button type="button" className="button button-secondary" onClick={() => setLimit((n) => n + 8)}>
          Show more
        </button>
      ) : null}

      <p className="compare-share">
        Shareable link: <Link href={shareHref}>{shareHref}</Link>
      </p>
    </div>
  )
}
