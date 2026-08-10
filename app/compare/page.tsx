import type { Metadata } from 'next'
import Link from 'next/link'
import { CompareWorkspace } from '@/components/CompareWorkspace'
import { allCities, cityPath, getCity, nationalBaselines } from '@/lib/catalog'
import { COMPARISON_PAIRS, comparisonPath } from '@/lib/comparison-pairs'
import { parseCompareSlugs } from '@/lib/compare'
import { formatCurrency } from '@/lib/format'
import {
  parseMatchFilters,
  parseMatchWeights,
} from '@/lib/match'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function hasQueryParams(params: Record<string, string | string[] | undefined>) {
  return Object.values(params).some((value) => {
    if (value == null) return false
    if (Array.isArray(value)) return value.some(Boolean)
    return value.length > 0
  })
}

/** Always canonicalize to clean /compare. Query variants (cities=, mode=, like=)
 * are tools for users/sharing — do not ask Google to index each combination. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const queried = hasQueryParams(params)
  return {
    title: '⚖️ Compare & Match U.S. Cities — Income, Housing & Safety',
    description:
      'Compare U.S. cities side by side or find best-fit matches with weighted priorities for cost, safety, income, and climate — plus curated high-intent pair pages.',
    alternates: { canonical: '/compare' },
    ...(queried ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams
  const modeRaw = Array.isArray(params.mode) ? params.mode[0] : params.mode
  const likeRaw = Array.isArray(params.like) ? params.like[0] : params.like
  const baseline = likeRaw ? getCity(likeRaw) : null
  const mode = modeRaw === 'match' || baseline ? 'match' : 'compare'

  const fromQuery =
    parseCompareSlugs(params.cities).length > 0
      ? parseCompareSlugs(params.cities)
      : parseCompareSlugs([params.a, params.b, params.c].filter(Boolean).join(','))

  const matchWeights = parseMatchWeights(params)
  const matchFilters = parseMatchFilters(params, baseline)

  const curated = COMPARISON_PAIRS.map((pair) => {
    const a = getCity(pair.a)
    const b = getCity(pair.b)
    if (!a || !b) return null
    return { pair, a, b }
  }).filter(Boolean) as Array<{
    pair: (typeof COMPARISON_PAIRS)[number]
    a: NonNullable<ReturnType<typeof getCity>>
    b: NonNullable<ReturnType<typeof getCity>>
  }>

  return (
    <article className="section">
      <div className="page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/cities">Cities</Link>
          <span>/</span>
          <span>Compare</span>
        </nav>
        <h1>Compare &amp; match cities</h1>
        <p className="lead">
          Side-by-side comparisons for any catalog cities, or weighted matching when you know your budget, climate, and
          priorities — plus curated high-intent pair pages for common relocator searches.
        </p>
      </div>

      <section className="answer-section">
        <h2 id="tool">Interactive tool</h2>
        <p className="answer-lead">
          {mode === 'match'
            ? 'Adjust cost range, climate preference, and priority weights — rankings update instantly in the browser.'
            : 'Pick two or three cities for a metrics table and radar profile. Switch to Find a match for weighted recommendations.'}
        </p>
        <CompareWorkspace
          cities={allCities}
          national={nationalBaselines}
          mode={mode}
          initialSlugs={fromQuery}
          matchWeights={matchWeights}
          matchFilters={matchFilters}
          baselineSlug={baseline?.slug}
        />
      </section>

      {mode === 'compare' ? (
        <section className="answer-section">
          <h2>Which city comparisons do movers search most?</h2>
          <p className="answer-lead">
            These {curated.length} static comparison pages lead with a direct answer, a side-by-side metrics table using
            the same formulas as the tool, and clear “when to pick A vs B” guidance — built for citation and for clicks
            into full city profiles.
          </p>
          <ul className="city-list comparison-pair-list">
            {curated.map(({ pair, a, b }) => (
              <li key={pair.slug}>
                <Link href={comparisonPath(pair.slug)}>
                  <strong>
                    {a.name}, {a.stateCode} vs {b.name}, {b.stateCode}
                  </strong>
                  <span>
                    {pair.intent} · housing index {a.costOfLivingIndex} vs {b.costOfLivingIndex} · homes ~
                    {formatCurrency(a.medianHomePrice)} vs ~{formatCurrency(b.medianHomePrice)}
                  </span>
                </Link>
                <div className="nearby-actions">
                  <Link className="nearby-state" href={cityPath(a)}>
                    {a.name} profile
                  </Link>
                  <Link className="nearby-compare" href={cityPath(b)}>
                    {b.name} profile
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  )
}
