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
          <strong>FBI Crime Data Explorer / CIUS</strong> — agency violent and property offense rates
          (`scripts/enrich-crime.ts`). Prefer live CDE annualized monthly rates per 100k. When the CDE API gateway is
          unavailable, we fall back to FBI CIUS Table 8 city offense counts converted to rates per 100k (vintage noted
          in the source string). When an agency/city match is still missing, we publish{' '}
          <code>crimeIndex.source: &quot;data unavailable&quot;</code> instead of keeping a placeholder number.
        </li>
        <li>
          <strong>NOAA Climate Normals (1991–2020)</strong> — summer high, winter low, annual rainfall, and a sunny-day
          proxy from the nearest normals station (`scripts/enrich-climate.ts`).
        </li>
        <li>
          <strong>Census Bureau Population Estimates Program</strong> — annual population by year for the population
          trend chart on city pages (`scripts/enrich-population-history.ts`). Reuses the place already resolved by the
          Census enrichment step above. A city only gets a trend chart once at least two years of estimates resolve; a
          missing or partial history is omitted rather than interpolated or estimated.
        </li>
        <li>
          <strong>Unsplash</strong> — two photos per city (`scripts/enrich-photos.ts`), used under the Unsplash License
          and credited to the photographer on the page. A city with no usable search results simply shows no gallery.
        </li>
      </ul>

      <h2>What we still curate</h2>
      <p>
        Commute minutes, Walk Score (where shown), featured flags, neighborhood shortlists, and nearby-city links remain
        curated companion fields. They are not overwritten by the enrichment scripts.
      </p>
      <p>
        New cities launch with a curated-seed baseline — population, income, housing, climate, and crime figures that
        are reasonable estimates, not yet a live agency pull — until the enrichment scripts above are run for them.
        Pages built from curated-seed data say so explicitly wherever a real per-agency figure would otherwise be
        implied, most visibly on the safety metric, rather than presenting an estimate as sourced fact.
      </p>

      <h2>Publishing rules</h2>
      <p>
        Thin pages are out of scope. If a city cannot be fully populated, it is omitted until the next batch. See the{' '}
        <Link href="/cities">city index</Link> for what is live today. State overview pages average only mapped catalog
        cities — they are not full-state statistical universes.
      </p>

      <h2>City limits vs metro</h2>
      <p>
        Population, income, home value, rent, and crime figures on city pages describe the incorporated place (city
        limits / municipal agency), not the broader Metropolitan Statistical Area, unless a metric note says otherwise.
        Unemployment uses BLS LAUS county rates joined via lat/lon → county FIPS.
      </p>

      <h2>Crime is hyper-local</h2>
      <p>
        A single citywide violent or property rate can misrepresent neighborhoods within the same municipality. Treat
        FBI CDE / CIUS city aggregates as a starting point, then inspect local police reports and neighborhood-level
        tools before drawing relocation conclusions.
      </p>
    </article>
  )
}
