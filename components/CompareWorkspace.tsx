'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CompareCities } from '@/components/CompareCities'
import { MatchCities } from '@/components/MatchCities'
import type { CityRecord, NationalBaselines } from '@/lib/types'
import type { MatchFilters, MatchWeights } from '@/lib/match'
import { comparePath, matchPath } from '@/lib/paths'

export type CompareMode = 'compare' | 'match'

export function CompareWorkspace({
  cities,
  national,
  mode,
  initialSlugs = [],
  matchWeights,
  matchFilters,
  baselineSlug,
}: {
  cities: CityRecord[]
  national: NationalBaselines
  mode: CompareMode
  initialSlugs?: string[]
  matchWeights: MatchWeights
  matchFilters: MatchFilters
  baselineSlug?: string
}) {
  const router = useRouter()

  const switchMode = (next: CompareMode) => {
    if (next === mode) return
    if (next === 'compare') {
      router.push(comparePath(initialSlugs))
      return
    }
    router.push(
      matchPath({
        like: baselineSlug ?? matchFilters.excludeSlug,
        colMin: matchFilters.colMin,
        colMax: matchFilters.colMax,
        climate: matchFilters.climate,
        weights: matchWeights,
      }),
    )
  }

  return (
    <div className="compare-workspace">
      <div className="compare-mode-tabs" role="tablist" aria-label="Compare tool mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'compare'}
          className={mode === 'compare' ? 'is-active' : undefined}
          onClick={() => switchMode('compare')}
        >
          Compare cities
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'match'}
          className={mode === 'match' ? 'is-active' : undefined}
          onClick={() => switchMode('match')}
        >
          Find a match
        </button>
      </div>

      {mode === 'compare' ? (
        <div role="tabpanel">
          <CompareCities cities={cities} national={national} initialSlugs={initialSlugs} />
        </div>
      ) : (
        <div role="tabpanel">
          <MatchCities
            cities={cities}
            national={national}
            initialWeights={matchWeights}
            initialFilters={matchFilters}
            baselineSlug={baselineSlug}
          />
        </div>
      )}

      <p className="compare-mode-note">
        {mode === 'compare' ? (
          <>
            Want weighted recommendations instead?{' '}
            <Link href={matchPath()}>Switch to Find a match</Link>.
          </>
        ) : (
          <>
            Prefer a side-by-side table?{' '}
            <Link href={comparePath(initialSlugs)}>Switch to Compare cities</Link>.
          </>
        )}
      </p>
    </div>
  )
}
