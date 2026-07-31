import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  COMPARISON_PAIRS,
  buildComparisonCopy,
  comparisonPath,
  getComparisonPair,
} from '@/lib/comparison-pairs'
import { buildCompareRows } from '@/lib/compare'
import { cityPath, getCity, nationalBaselines, siteUrl } from '@/lib/catalog'
import { absoluteUrl, safeJsonLd } from '@/lib/seo'

type Props = {
  params: Promise<{ pair: string }>
}

export function generateStaticParams() {
  return COMPARISON_PAIRS.map((pair) => ({ pair: pair.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair: pairSlug } = await params
  const pair = getComparisonPair(pairSlug)
  if (!pair) return {}
  const a = getCity(pair.a)
  const b = getCity(pair.b)
  if (!a || !b) return {}

  const title = `${a.name} vs ${b.name}: Cost of Living, Housing & Commute | MapsToIt`
  const description =
    `Side-by-side MapsToIt comparison of ${a.name}, ${a.stateCode} and ${b.name}, ${b.stateCode} — ` +
    `housing index, rent, income, unemployment, crime, and climate versus U.S. baselines.`
  const url = absoluteUrl(comparisonPath(pair.slug))

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'MapsToIt', type: 'website' },
  }
}

export default async function ComparisonPairPage({ params }: Props) {
  const { pair: pairSlug } = await params
  const pair = getComparisonPair(pairSlug)
  if (!pair) notFound()

  const a = getCity(pair.a)
  const b = getCity(pair.b)
  if (!a || !b) notFound()

  const copy = buildComparisonCopy(a, b, pair.intent)
  const rows = buildCompareRows([a, b], nationalBaselines)
  const asOf = a.lastUpdated > b.lastUpdated ? a.lastUpdated : b.lastUpdated
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${a.name} vs ${b.name}`,
    description: copy.summary.slice(0, 300),
    dateModified: asOf,
    url: absoluteUrl(comparisonPath(pair.slug)),
    isPartOf: { '@type': 'WebSite', name: 'MapsToIt', url: siteUrl() },
  }

  return (
    <article className="section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/cities">Cities</Link>
          <span>/</span>
          <Link href="/compare">Compare</Link>
          <span>/</span>
          <span>
            {a.name} vs {b.name}
          </span>
        </nav>
        <h1>
          {a.name} vs {b.name}
        </h1>
        <p className="lead">{pair.intent}</p>
      </div>

      <section className="content-snapshot" aria-label="Comparison snapshot">
        <div className="content-snapshot-head">
          <p className="content-snapshot-kicker">MapsToIt comparison snapshot</p>
          <h2 className="content-snapshot-title">
            {a.name} or {b.name} — which fits a move?
          </h2>
          <p className="content-snapshot-answer">{copy.summary}</p>
          <p className="content-snapshot-meta">
            <time dateTime={asOf}>As of {asOf}</time>
            {' · '}
            <Link href="/methodology">Methodology &amp; sources</Link>
            {' · '}
            Same formulas as the interactive compare tool
          </p>
        </div>
      </section>

      <section className="answer-section">
        <h2>Side-by-side metrics</h2>
        <p className="answer-lead">
          Figures use the same ACS housing index, BLS unemployment, FBI rates, and NOAA normals as each city
          profile — shown against U.S. / catalog baselines.
        </p>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">
                  <Link href={cityPath(a)}>
                    {a.name}, {a.stateCode}
                  </Link>
                </th>
                <th scope="col">
                  <Link href={cityPath(b)}>
                    {b.name}, {b.stateCode}
                  </Link>
                </th>
                <th scope="col">U.S. / catalog</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.values[0]}</td>
                  <td>{row.values[1]}</td>
                  <td>
                    {row.national}
                    <div className="compare-context">{row.context}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="answer-section">
        <h2>When should you pick {a.name}?</h2>
        <p className="answer-lead">{copy.pickA}</p>
        <p>
          <Link className="button" href={cityPath(a)}>
            Open {a.name} profile
          </Link>
        </p>
      </section>

      <section className="answer-section">
        <h2>When should you pick {b.name}?</h2>
        <p className="answer-lead">{copy.pickB}</p>
        <p>
          <Link className="button" href={cityPath(b)}>
            Open {b.name} profile
          </Link>
        </p>
      </section>

      <section className="answer-section">
        <h2>Short verdict</h2>
        <p className="answer-lead">{copy.verdict}</p>
        <div className="cta-row">
          <Link className="button" href={`/compare?cities=${a.slug},${b.slug}`}>
            Open interactive compare tool
          </Link>
          <Link className="button button-secondary" href="/compare">
            All curated comparisons
          </Link>
        </div>
      </section>
    </article>
  )
}
