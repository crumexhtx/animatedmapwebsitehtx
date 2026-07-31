import type { Metadata } from 'next'
import Link from 'next/link'
import { StateColChoropleth } from '@/components/StateColChoropleth'
import { allCities, statePath } from '@/lib/catalog'
import { stateColAverages } from '@/lib/charts'

export const metadata: Metadata = {
  title: '🗺️ Explore State Housing Costs — U.S. Cost of Living Choropleth',
  description:
    'Color-coded U.S. map of MapsToIt catalog-average housing cost index by state. Click a mapped state to open its city list.',
  alternates: { canonical: '/cities/state-costs' },
}

export default function StateCostsPage() {
  const averages = stateColAverages(allCities)
  const ranked = [...averages].sort((a, b) => a.avgCostOfLivingIndex - b.avgCostOfLivingIndex)

  return (
    <article className="section">
      <div className="page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/cities">Cities</Link>
          <span>/</span>
          <span>State costs</span>
        </nav>
        <h1>State housing cost averages</h1>
        <p className="lead">
          Each state is shaded by the unweighted average MapsToIt housing cost index across catalog
          cities in that state (100 ≈ U.S. average). States without published city profiles stay
          unshaded. These are catalog coverage averages — not full-state statistical universes.
        </p>
      </div>

      <StateColChoropleth states={averages} />

      <section className="chart-section" aria-labelledby="state-rank-heading">
        <h2 id="state-rank-heading">Catalog states by average housing index</h2>
        <p>
          Server-rendered ranking of the same values shown on the map — useful for crawlers and for
          scanning without interacting with the map.
        </p>
        <ol className="ranking-list">
          {ranked.map((state, index) => (
            <li key={state.slug}>
              <Link href={statePath(state.slug)}>
                <strong>
                  {index + 1}. {state.name}
                </strong>
                <span>
                  Avg housing index {state.avgCostOfLivingIndex} · {state.cityCount}{' '}
                  {state.cityCount === 1 ? 'city' : 'cities'} in catalog
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <p className="chart-source">
        <strong>Source:</strong> Unweighted mean of MapsToIt city housing cost indices (ACS 5-year home
        value + rent versus national medians). See <Link href="/methodology">methodology</Link>. Related:{' '}
        <Link href="/cities/rankings">city cost rankings</Link> ·{' '}
        <Link href="/cities/cost-vs-safety">cost vs safety</Link>.
      </p>
    </article>
  )
}
