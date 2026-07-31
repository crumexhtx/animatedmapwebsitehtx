import type { Metadata } from 'next'
import Link from 'next/link'
import { CompareCities } from '@/components/CompareCities'
import { allCities, cityPath, getCity, nationalBaselines } from '@/lib/catalog'
import { COMPARISON_PAIRS, comparisonPath } from '@/lib/comparison-pairs'
import { parseCompareSlugs } from '@/lib/compare'
import { formatCurrency } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Compare cities',
  description:
    'Compare MapsToIt city profiles side by side — curated high-intent pairs plus an interactive tool for income, housing, crime, climate, and commute versus U.S. baselines.',
  alternates: { canonical: '/compare' },
}

type Props = {
  searchParams: Promise<{ cities?: string | string[]; a?: string; b?: string; c?: string }>
}

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams
  const fromQuery =
    parseCompareSlugs(params.cities).length > 0
      ? parseCompareSlugs(params.cities)
      : parseCompareSlugs([params.a, params.b, params.c].filter(Boolean).join(','))

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
        <h1>Compare cities</h1>
        <p className="lead">
          Relocators rarely weigh one place in isolation. Start with a curated high-intent pair, or pick any two or
          three MapsToIt cities in the interactive tool below.
        </p>
      </div>

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

      <section className="answer-section">
        <h2>Build your own side-by-side comparison</h2>
        <p className="answer-lead">
          Use the interactive tool for any catalog cities — same metrics and U.S. baselines as the curated pages.
        </p>
        <CompareCities cities={allCities} national={nationalBaselines} initialSlugs={fromQuery} />
      </section>
    </article>
  )
}
