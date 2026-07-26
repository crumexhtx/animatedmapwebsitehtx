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
        The interactive map is the browsing layer. Each city page is a full, indexable profile — housing costs, income,
        commute, climate, and safety context — with sources cited on every page.
      </p>
      <p>
        We compile figures from Census ACS, BLS LAUS, FBI Crime Data Explorer, and NOAA Climate Normals, then refresh
        the catalog in batches. Coverage gaps (especially FBI agency rates for smaller cities) are labeled explicitly
        rather than filled with placeholders. Details live on the methodology page.
      </p>
    </article>
  )
}
