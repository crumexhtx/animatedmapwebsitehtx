import type { Metadata } from 'next'
import Link from 'next/link'
import { CitiesBrowser } from '@/components/CitiesBrowser'
import { allCities, allStates, statePath } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'All U.S. Cities',
  description: 'Browse MapsToIt city profiles by state — cost of living, housing, climate, commute, and safety.',
  alternates: { canonical: '/cities' },
}

export default function CitiesIndexPage() {
  return (
    <div className="section">
      <div className="page-hero">
        <h1>U.S. cities</h1>
        <p className="lead">
          {allCities.length} complete city profiles. Filter by state or open any page for the full dataset.
        </p>
      </div>

      <CitiesBrowser cities={allCities} states={allStates} />

      <p className="lead" style={{ marginTop: '2rem' }}>
        Prefer state overviews?{' '}
        {allStates.slice(0, 8).map((state, index) => (
          <span key={state.slug}>
            {index > 0 ? ' · ' : ''}
            <Link href={statePath(state)}>{state.name}</Link>
          </span>
        ))}
      </p>
    </div>
  )
}
