'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AffordFiltersPanel } from '@/components/AffordFilters'
import { AffordMap } from '@/components/AffordMap'
import { AffordResults } from '@/components/AffordResults'
import type { CityRecord } from '@/lib/types'
import {
  affordCatalogBounds,
  affordPath,
  cheapestWithinMode,
  searchAffordCities,
  suggestRelaxedFilter,
  type AffordFilters,
} from '@/lib/afford'
import { formatCurrency } from '@/lib/format'

export function AffordWorkspace({
  cities,
  initialFilters,
}: {
  cities: CityRecord[]
  initialFilters: AffordFilters
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [filters, setFilters] = useState<AffordFilters>(initialFilters)
  const [limit, setLimit] = useState(15)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bounds = useMemo(() => affordCatalogBounds(cities), [cities])

  const matches = useMemo(() => searchAffordCities(cities, filters), [cities, filters])
  const relaxation = useMemo(() => suggestRelaxedFilter(cities, filters), [cities, filters])
  const shareHref = affordPath(filters)

  const setFilter = <K extends keyof AffordFilters>(key: K, value: AffordFilters[K]) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, [key]: value }))
      setLimit(15)
    })
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const next = affordPath(filters)
      router.replace(next, { scroll: false })
    }, 180)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters, router])

  const cheapest = filters.budget != null ? cheapestWithinMode(cities, filters.mode) : null
  const budgetEmpty = filters.budget == null || filters.budget <= 0

  return (
    <div className="afford-workspace">
      <aside className="afford-sidebar">
        <AffordFiltersPanel filters={filters} bounds={bounds} onChange={setFilter} />
        <p className="compare-share">
          Shareable link: <Link href={shareHref}>{shareHref}</Link>
        </p>
      </aside>

      <div className="afford-main">
        <div className="afford-summary">
          {budgetEmpty ? (
            <p className="afford-count">Enter a housing budget to search {cities.length} mapped cities.</p>
          ) : (
            <p className="afford-count" aria-live="polite">
              <strong>{matches.length}</strong> {matches.length === 1 ? 'city matches' : 'cities match'}
              {filters.mode === 'rent'
                ? ` median rent ≤ ${formatCurrency(filters.budget!)}`
                : ` median home ≤ ${formatCurrency(filters.budget!)}`}
            </p>
          )}
        </div>

        {!budgetEmpty ? <AffordMap cities={matches.map((match) => match.city)} /> : null}

        {budgetEmpty ? (
          <div className="afford-empty" role="status">
            <p>
              Start with your monthly rent cap or max purchase price. Results update live as you adjust filters — no page
              reload.
            </p>
            <p className="match-hint">
              Cheapest mapped {filters.mode === 'rent' ? 'rent' : 'home'}:{' '}
              {cheapest
                ? filters.mode === 'rent'
                  ? `${cheapest.name}, ${cheapest.stateCode} (${formatCurrency(cheapest.medianRent)}/mo)`
                  : `${cheapest.name}, ${cheapest.stateCode} (${formatCurrency(cheapest.medianHomePrice)} median home)`
                : '—'}
            </p>
          </div>
        ) : matches.length ? (
          <AffordResults
            matches={matches}
            filters={filters}
            limit={limit}
            onShowMore={() => setLimit((value) => value + 12)}
          />
        ) : (
          <div className="afford-empty" role="status">
            <p>
              <strong>No cities match</strong> these filters.
            </p>
            {relaxation ? (
              <p>
                Try relaxing <strong>{relaxation.label}</strong> — that alone would add about {relaxation.wouldAdd}{' '}
                {relaxation.wouldAdd === 1 ? 'city' : 'cities'} within your budget.
              </p>
            ) : cheapest ? (
              <p>
                No mapped city has a median {filters.mode === 'rent' ? 'rent' : 'home value'} under{' '}
                {formatCurrency(filters.budget!)}. The lowest in this catalog is{' '}
                <Link href={affordPath({ ...filters, budget: housingCostForMode(cheapest, filters.mode) })}>
                  {cheapest.name}, {cheapest.stateCode}
                </Link>{' '}
                at {formatCurrency(housingCostForMode(cheapest, filters.mode))}
                {filters.mode === 'rent' ? '/mo' : ''}.
              </p>
            ) : (
              <p>Try raising your budget or setting crime tolerance to Any.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function housingCostForMode(city: CityRecord, mode: AffordFilters['mode']) {
  return mode === 'rent' ? city.medianRent : city.medianHomePrice
}
