import Link from 'next/link'
import type { SnapshotMetric } from '@/lib/snapshot'
import { StaleInfoIcon } from '@/components/SourceFreshnessNote'

type Props = {
  title: string
  directAnswer: string
  /** When the catalog row was last rebuilt (not necessarily every source vintage). */
  catalogRefreshed: string
  methodologyHref?: string
  metrics: SnapshotMetric[]
  /** Optional callout when headline metrics rely on an older upstream vintage (e.g. FBI Table 8). */
  staleSourceHint?: string
}

/**
 * Dated proprietary snapshot — server-rendered for crawlable SEO HTML (no client JS).
 */
export function ContentSnapshot({
  title,
  directAnswer,
  catalogRefreshed,
  methodologyHref = '/methodology',
  metrics,
  staleSourceHint,
}: Props) {
  return (
    <section className="content-snapshot" aria-label={title}>
      <div className="content-snapshot-head">
        <p className="content-snapshot-kicker">MapsToIt planning snapshot</p>
        <h2 className="content-snapshot-title">{title}</h2>
        <p className="content-snapshot-answer">{directAnswer}</p>
        <p className="content-snapshot-meta">
          <time dateTime={catalogRefreshed}>Catalog refreshed {catalogRefreshed}</time>
          {' · '}
          Source vintages vary — see per-metric labels below
          {' · '}
          <Link href={methodologyHref}>Methodology &amp; sources</Link>
        </p>
        {staleSourceHint ? (
          <p className="content-snapshot-stale-hint">
            <StaleInfoIcon tip={staleSourceHint} />
            <span>Crime figures may use an older source vintage than housing and income on this page.</span>
          </p>
        ) : null}
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
