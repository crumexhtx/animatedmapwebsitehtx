import type { Metadata } from 'next'
import Link from 'next/link'
import { catalogIndex } from '@/lib/catalog-index'
import { githubProfileUrl, githubRepoUrl } from '@/lib/paths'

export const metadata: Metadata = {
  title: 'About',
  description:
    'MapsToIt is a U.S. city data explorer built by João Bermudez — cost of living, housing, safety, climate, and commute profiles for people researching where to live.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <article className="content-page">
      <h1>About MapsToIt</h1>
      <p className="lead">
        MapsToIt is a solo project by{' '}
        <a href={githubProfileUrl} rel="noopener noreferrer">
          João Bermudez
        </a>
        . It helps people research a U.S. city before moving, taking a remote job, or comparing places to live.
      </p>

      <div className="cta-row">
        <a className="button" href={githubRepoUrl} rel="noopener noreferrer">
          View source on GitHub
        </a>
        <Link className="button button-secondary" href="/methodology">
          Data sources
        </Link>
      </div>

      <h2>What it is</h2>
      <p>
        The interactive map is the browsing layer. Each city page is a full, indexable profile — housing costs, income,
        commute, climate, and safety context — with sources cited on every page. The live catalog currently covers{' '}
        {catalogIndex.cityCount} cities across {catalogIndex.stateCount} states.
      </p>

      <h2>How the data is built</h2>
      <p>
        Figures are compiled from Census ACS, BLS LAUS, FBI Crime Data Explorer, and NOAA Climate Normals, then
        refreshed in batches. Coverage gaps (especially FBI agency rates for smaller cities) are labeled explicitly
        rather than filled with placeholders. Incomplete cities are blocked from shipping by a catalog validation step
        at build time. Details live on the{' '}
        <Link href="/methodology">methodology</Link> page.
      </p>

      <h2>How the site is built</h2>
      <p>
        MapsToIt is a Next.js App Router app. City and state pages are statically generated from a versioned JSON
        catalog, so every profile is crawlable without a runtime database. Matching and affordability ranking are pure
        functions with shareable URLs. The map uses MapLibre GL circle layers, loaded only when the map is on screen.
      </p>
      <p>
        Source, tests, and the catalog pipeline are public:{' '}
        <a href={githubRepoUrl} rel="noopener noreferrer">
          github.com/crumexhtx/animatedmapwebsitehtx
        </a>
        .
      </p>
    </article>
  )
}
