import type { Metadata } from 'next'
import Link from 'next/link'

const title = 'Methodology & data sources'
const description =
  'How MapsToIt compiles U.S. city housing cost, income, housing, crime, climate, and commute figures — and how we cite sources.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/methodology' },
  openGraph: {
    title,
    description,
    url: '/methodology',
    siteName: 'MapsToIt',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
}

export default function MethodologyPage() {
  return (
    <article className="content-page">
      <h1>Methodology</h1>
      <p className="lead">
        Every published city page must include the full metric set. Incomplete records are blocked from shipping by a
        catalog validation step at build time. A city may still launch on complete curated-seed estimates until a live
        agency pull replaces them — those estimates are labeled as such, especially on safety.
      </p>

      <h2>Live enrichment sources</h2>
      <p>
        City figures are merged from public agency feeds into checked-in enrichment JSON, then built into the published
        catalog. Each city page lists source labels and a last-updated date.
      </p>
      <ul>
        <li>
          <strong>U.S. Census Bureau ACS 5-year</strong> — population, median household income, median home value, and
          median gross rent from Census summary files. The on-page housing cost index is derived from home value and
          rent versus national ACS medians (100 ≈ U.S. average) — not a BLS consumer price index.
        </li>
        <li>
          <strong>BLS LAUS</strong> — county unemployment rates via Local Area Unemployment Statistics series, joined to
          each city through FCC lat/lon → county FIPS.
        </li>
        <li>
          <strong>FBI Crime Data Explorer / CIUS</strong> — agency violent and property offense rates. Prefer live CDE
          annualized monthly rates per 100k. When the CDE API gateway is unavailable, we fall back to FBI CIUS Table 8
          city offense counts converted to rates per 100k (vintage noted in the source string). When an agency or city
          match is still missing, we publish the rate as data unavailable instead of keeping a placeholder number.
        </li>
        <li>
          <strong>NOAA Climate Normals (1991–2020)</strong> — summer high, winter low, annual rainfall, and a sunny-day
          proxy from the nearest normals station.
        </li>
        <li>
          <strong>Census Bureau Population Estimates Program (PEP)</strong> — annual population by year for city trend
          charts and the national population-over-time race, loaded from the Bureau’s public city/town PEP CSV releases
          (2010–2019 and 2020–2024 vintages). A city only gets a trend once at least two years resolve; missing history
          is omitted rather than interpolated. The Population figure in a city’s Key Figures uses this same latest PEP
          estimate (not the ACS 5-year figure) so it always matches the trend chart on the same page — PEP is the
          Bureau’s own preferred product for a current point-in-time population, while the 5-year ACS remains the source
          for income, home value, and rent, which PEP doesn’t cover.
        </li>
        <li>
          <strong>Unsplash</strong> — two photos per city, used under the Unsplash License and credited to the
          photographer on the page. A city with no usable search results simply shows no gallery.
        </li>
      </ul>

      <h2>What we still curate</h2>
      <p>
        Commute minutes, Walk Score (where shown), featured flags, and neighborhood shortlists remain curated companion
        fields. They are not overwritten by live agency feeds. Nearby-city links default to the six closest catalog
        cities by great-circle distance; a city may optionally keep a curated override in the seed.
      </p>
      <p>
        New cities can ship with a complete curated-seed baseline — population, income, housing, climate, and crime
        figures that are reasonable estimates, not yet a live agency pull — as long as every required field is present.
        Thin or partial records never publish. Pages built from curated-seed data say so explicitly wherever a real
        per-agency figure would otherwise be implied, most visibly on the safety metric.
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
