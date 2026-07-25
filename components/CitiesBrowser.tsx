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

  const filtered = useMemo(() => {
    const list = stateFilter
      ? cities.filter((city) => city.stateSlug === stateFilter)
      : cities
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [cities, stateFilter])

  return (
    <>
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

      <ul className="city-list">
        {filtered.map((city) => (
          <li key={city.slug}>
            <Link href={cityPath(city)}>
              <strong>
                {city.name}, {city.stateCode}
              </strong>
              <span>
                {formatNumber(city.population)} · income {formatCurrency(city.medianHouseholdIncome)} · COL{' '}
                {city.costOfLivingIndex}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
