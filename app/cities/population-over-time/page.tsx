import type { Metadata } from 'next'
import Link from 'next/link'
import { PopulationRaceChart } from '@/components/PopulationRaceChart'
import { allCities } from '@/lib/catalog'
import { populationRaceCities, populationRaceYears } from '@/lib/charts'

export const metadata: Metadata = {
  title: '📈 Watch U.S. City Population Change Over Time',
  description:
    'Play Census population estimates year by year — follow the largest MapsToIt cities as ranks and sizes shift from 2010 through the latest PEP release.',
  alternates: { canonical: '/cities/population-over-time' },
}

export default function PopulationOverTimePage() {
  const cities = populationRaceCities(allCities)
  const years = populationRaceYears(cities)
  const first = years[0]
  const last = years[years.length - 1]

  return (
    <article className="section">
      <div className="page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/cities">Cities</Link>
          <span>/</span>
          <span>Population over time</span>
        </nav>
        <h1>Population over time</h1>
        <p className="lead">
          Animated ranking of the largest cities in this catalog by Census Bureau Population Estimates Program (PEP)
          city/town totals
          {first && last ? ` from ${first} to ${last}` : ''}. Press play to watch bars reorder as populations grow or
          shrink — then click any row to open that city’s profile.
        </p>
      </div>

      <PopulationRaceChart cities={cities} years={years} />

      <p className="lead" style={{ marginTop: '1.5rem' }}>
        Series uses official PEP July 1 estimates (not interpolated). See{' '}
        <Link href="/methodology">methodology</Link> for sources, or open a city page for its own scrubbable trend
        chart.
      </p>
    </article>
  )
}
