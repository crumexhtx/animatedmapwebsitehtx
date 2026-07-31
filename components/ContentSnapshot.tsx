import Link from 'next/link'
import type { SnapshotMetric } from '@/lib/snapshot'

type Props = {
  title: string
  directAnswer: string
  asOf: string
  methodologyHref?: string
  metrics: SnapshotMetric[]
}

/**
 * Dated proprietary snapshot — server-rendered for crawlable SEO HTML (no client JS).
 */
export function ContentSnapshot({
  title,
  directAnswer,
  asOf,
  methodologyHref = '/methodology',
  metrics,
}: Props) {
  return (
    <section className="content-snapshot" aria-label={title}>
      <div className="content-snapshot-head">
        <p className="content-snapshot-kicker">MapsToIt planning snapshot</p>
        <h2 className="content-snapshot-title">{title}</h2>
        <p className="content-snapshot-answer">{directAnswer}</p>
        <p className="content-snapshot-meta">
          <time dateTime={asOf}>As of {asOf}</time>
          {' · '}
          <Link href={methodologyHref}>Methodology &amp; sources</Link>
          {' · '}
          Proprietary ACS/BLS/FBI/NOAA-derived figures compiled by MapsToIt
        </p>
      </div>
      <dl className="stat-grid content-snapshot-grid">
        {metrics.map((metric) => (
          <div key={metric.label} className="stat-cell">
            <dt>{metric.label}</dt>
            <dd>
              {metric.value}
              {metric.note ? <small>{metric.note}</small> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
