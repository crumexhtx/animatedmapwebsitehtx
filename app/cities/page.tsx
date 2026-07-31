import type { Metadata } from 'next'
import Link from 'next/link'
import { CitiesBrowser } from '@/components/CitiesBrowser'
import { allCities, allStates, statePath } from '@/lib/catalog'

export const metadata: Metadata = {
  title: '🗺️ Browse U.S. Cities — Cost of Living, Housing & Climate',
  description:
    'Browse MapsToIt city profiles by state — compare cost of living, housing prices, income, climate, commute, and safety before you relocate.',
  alternates: { canonical: '/cities' },
}

export default function CitiesIndexPage() {
  return (
    <div className="section">
      <div className="page-hero">
        <h1>U.S. cities</h1>
        <p className="lead">
          {allCities.length} complete city profiles. Filter by state or open any page for the full dataset.
          Or explore visualizations:{' '}
          <Link href="/cities/rankings">cheapest / most expensive</Link>
          {' · '}
          <Link href="/cities/cost-vs-safety">cost vs safety</Link>
          {' · '}
          <Link href="/cities/state-costs">state cost map</Link>.
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
