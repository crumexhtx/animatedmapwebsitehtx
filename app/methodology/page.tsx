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

      <h2>Live enrichment sources</h2>
      <p>
        City figures are merged from public agency feeds into checked-in enrichment JSON, then built into the published
        catalog (`npm run build-catalog`). Each city page lists source labels and a last-updated date.
      </p>
      <ul>
        <li>
          <strong>U.S. Census Bureau ACS 5-year</strong> — population, median household income, median home value, and
          median gross rent from Census summary files (`scripts/enrich-census.ts`). The on-page housing cost index is
          derived from home value and rent versus national ACS medians (100 ≈ U.S. average) — not a BLS consumer price
          index.
        </li>
        <li>
          <strong>BLS LAUS</strong> — county unemployment rates via Local Area Unemployment Statistics series
          (`scripts/enrich-bls.ts`), joined to each city through FCC lat/lon → county FIPS.
        </li>
        <li>
          <strong>FBI Crime Data Explorer</strong> — agency violent and property offense rates, annualized from monthly
          per-100k series (`scripts/enrich-crime.ts`). When an agency match or usable rate is missing, we publish{' '}
          <code>crimeIndex.source: &quot;data unavailable&quot;</code> instead of keeping a placeholder number.
        </li>
        <li>
          <strong>NOAA Climate Normals (1991–2020)</strong> — summer high, winter low, annual rainfall, and a sunny-day
          proxy from the nearest normals station (`scripts/enrich-climate.ts`).
        </li>
      </ul>

      <h2>What we still curate</h2>
      <p>
        Commute minutes, Walk Score (where shown), featured flags, neighborhood shortlists, and nearby-city links remain
        curated companion fields. They are not overwritten by the enrichment scripts.
      </p>

      <h2>Publishing rules</h2>
      <p>
        Thin pages are out of scope. If a city cannot be fully populated, it is omitted until the next batch. See the{' '}
        <Link href="/cities">city index</Link> for what is live today.
      </p>
    </article>
  )
}
