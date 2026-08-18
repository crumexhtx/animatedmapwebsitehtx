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
        </p>
        <div className="cta-row" style={{ marginBottom: '1.5rem' }}>
          <Link className="button" href="/cities/rankings">
            Rankings
          </Link>
          <Link className="button button-secondary" href="/cities/cost-vs-safety">
            Cost vs safety
          </Link>
          <Link className="button button-secondary" href="/cities/state-costs">
            State costs
          </Link>
          <Link className="button button-secondary" href="/cities/population-over-time">
            Population over time
          </Link>
        </div>
      </div>

      <CitiesBrowser
        cities={allCities.map((city) => ({
          slug: city.slug,
          name: city.name,
          state: city.state,
          stateSlug: city.stateSlug,
          stateCode: city.stateCode,
          population: city.population,
          medianHouseholdIncome: city.medianHouseholdIncome,
          costOfLivingIndex: city.costOfLivingIndex,
        }))}
        states={allStates.map((state) => ({
          slug: state.slug,
          name: state.name,
          code: state.code,
        }))}
      />

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
