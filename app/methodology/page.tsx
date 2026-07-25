import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Methodology & data sources',
  description:
    'How MapsToIt compiles U.S. city cost of living, income, housing, crime, climate, and commute figures — and how we cite sources.',
  alternates: { canonical: '/methodology' },
}

export default function MethodologyPage() {
  return (
    <article className="content-page">
      <h1>Methodology</h1>
      <p className="lead">
        Every published city page must include the full metric set. Incomplete records are blocked from shipping by
        a catalog validation step at build time.
      </p>

      <h2>Launch data (v1)</h2>
      <p>
        The initial catalog is curated JSON checked into the repository — approximate figures aligned to publicly
        reported Census ACS, BLS, FBI UCR / Crime Data Explorer, and NOAA Climate Normals patterns. Each city page
        lists its source labels and a last-updated date.
      </p>

      <h2>Upcoming live enrichment</h2>
      <ul>
        <li>
          <strong>U.S. Census / ACS</strong> — population, income, housing costs (`scripts/enrich-census.ts`)
        </li>
        <li>
          <strong>BLS</strong> — unemployment and labor context (`scripts/enrich-bls.ts`)
        </li>
        <li>
          <strong>FBI Crime Data Explorer</strong> — violent and property crime indexes (`scripts/enrich-crime.ts`)
        </li>
        <li>
          <strong>NOAA Climate Normals</strong> — temperature, rainfall, sunshine proxies (`scripts/enrich-climate.ts`)
        </li>
      </ul>

      <h2>Publishing rules</h2>
      <p>
        Thin pages are out of scope. If a city cannot be fully populated, it is omitted until the next batch. See the{' '}
        <Link href="/cities">city index</Link> for what is live today.
      </p>
    </article>
  )
}
