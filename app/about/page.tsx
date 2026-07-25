import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: 'MapsToIt is a U.S. city data explorer for people researching where to live before they move.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <article className="content-page">
      <h1>About MapsToIt</h1>
      <p className="lead">
        MapsToIt helps people research a U.S. city before moving, relocating for a job, or comparing places to live.
      </p>
      <p>
        The interactive map is the browsing layer. Each city page is a full, indexable profile — cost of living,
        income, housing costs, commute, climate, and safety context — with sources cited on every page.
      </p>
      <p>
        We launch with a curated set of major cities and expand the catalog in batches. Live API enrichment from Census,
        BLS, FBI, and NOAA is planned next; today&apos;s figures are curated public-source estimates documented on the
        methodology page.
      </p>
    </article>
  )
}
