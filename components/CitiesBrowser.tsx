'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { CityRecord, StateRecord } from '@/lib/types'
import { cityPath } from '@/lib/paths'
import { formatCurrency, formatNumber } from '@/lib/format'

export function CitiesBrowser({
  cities,
  states,
}: {
  cities: CityRecord[]
  states: StateRecord[]
}) {
  const [stateFilter, setStateFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const list = cities.filter((city) => {
      if (stateFilter && city.stateSlug !== stateFilter) return false
      if (!normalized) return true
      return (
        city.name.toLowerCase().includes(normalized)
        || city.state.toLowerCase().includes(normalized)
        || city.stateCode.toLowerCase().includes(normalized)
        || city.slug.includes(normalized.replace(/\s+/g, '-'))
      )
    })
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [cities, stateFilter, query])

  return (
    <>
      <div className="cities-controls">
        <label className="cities-search">
          <span className="sr-only">Search cities</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cities or states"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>

        <label className="filter-select">
          <span className="sr-only">Filter by state</span>
          <select
            value={stateFilter ?? ''}
            onChange={(event) => setStateFilter(event.target.value || null)}
          >
            <option value="">All states</option>
            {states.map((state) => (
              <option key={state.slug} value={state.slug}>
                {state.name} ({state.code})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-bar" aria-label="Filter by state">
        <button
          type="button"
          className={!stateFilter ? 'is-active' : undefined}
          onClick={() => setStateFilter(null)}
        >
          All
        </button>
        {states.map((state) => (
          <button
            key={state.slug}
            type="button"
            className={stateFilter === state.slug ? 'is-active' : undefined}
            onClick={() => setStateFilter(state.slug)}
          >
            {state.code}
          </button>
        ))}
      </div>

      <p className="cities-count" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? 'city' : 'cities'}
        {stateFilter || query ? ' match' : ' in catalog'}
      </p>

      <ul className="city-list">
        {filtered.map((city) => (
          <li key={city.slug}>
            <Link href={cityPath(city)}>
              <strong>
                {city.name}, {city.stateCode}
              </strong>
              <span>
                {formatNumber(city.population)} · income {formatCurrency(city.medianHouseholdIncome)} · Housing index{' '}
                {city.costOfLivingIndex}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
