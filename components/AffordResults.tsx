'use client'

import Link from 'next/link'
import type { AffordFilters, AffordMatch } from '@/lib/afford'
import { formatCurrency } from '@/lib/format'
import { cityPath } from '@/lib/paths'

function crimeLabel(match: AffordMatch) {
  const source = match.city.crimeIndex.source
  if (source === 'data unavailable') return 'Unavailable'
  if (source.includes('curated')) return 'Estimate'
  return String(match.city.crimeIndex.violent)
}

function headroomLabel(match: AffordMatch, filters: AffordFilters) {
  if (filters.budget == null) return null
  const unit = filters.mode === 'rent' ? '/mo' : ''
  if (match.budgetGap <= 0) return 'At budget ceiling'
  return `${formatCurrency(Math.round(match.budgetGap))}${unit} under budget`
}

export function AffordResults({
  matches,
  filters,
  limit,
  onShowMore,
}: {
  matches: AffordMatch[]
  filters: AffordFilters
  limit: number
  onShowMore?: () => void
}) {
  const visible = matches.slice(0, limit)

  if (!visible.length) return null

  return (
    <>
      <ol className="match-results afford-results">
        {visible.map((match, index) => (
          <li key={match.city.slug} className="match-result afford-result">
            <div className="match-result-main">
              <span className="match-rank">{index + 1}</span>
              <div>
                <Link href={cityPath(match.city)}>
                  <strong>
                    {match.city.name}, {match.city.stateCode}
                  </strong>
                </Link>
                <p className="afford-result-stats">
                  {filters.mode === 'rent' ? (
                    <>
                      Rent {formatCurrency(match.city.medianRent)}
                      {' · '}
                      Homes ~{formatCurrency(match.city.medianHomePrice)}
                    </>
                  ) : (
                    <>
                      Home {formatCurrency(match.city.medianHomePrice)}
                      {' · '}
                      Rent ~{formatCurrency(match.city.medianRent)}
                    </>
                  )}
                  {' · '}
                  Violent {crimeLabel(match)}/100k
                  {match.city.commute.walkScore != null ? ` · Walk ${match.city.commute.walkScore}` : ''}
                  {' · '}
                  Commute {match.city.commute.avgMinutes} min
                </p>
                {headroomLabel(match, filters) ? (
                  <p className="afford-headroom">{headroomLabel(match, filters)}</p>
                ) : null}
              </div>
            </div>
            <div className="match-result-actions">
              <Link className="button button-secondary" href={cityPath(match.city)}>
                Full profile
              </Link>
            </div>
          </li>
        ))}
      </ol>
      {matches.length > limit && onShowMore ? (
        <button type="button" className="button button-secondary" onClick={onShowMore}>
          Show more ({matches.length - limit} remaining)
        </button>
      ) : null}
    </>
  )
}
