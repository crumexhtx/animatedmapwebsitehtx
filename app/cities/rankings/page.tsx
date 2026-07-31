import type { Metadata } from 'next'
import Link from 'next/link'
import { RankingBarChart } from '@/components/RankingBarChart'
import { allCities, cityPath } from '@/lib/catalog'
import { cheapestCities, mostExpensiveCities } from '@/lib/charts'
import { formatCurrency, formatNumber } from '@/lib/format'

export const metadata: Metadata = {
  title: '📊 Rank Cheapest & Most Expensive U.S. Cities — Housing Cost Index',
  description:
    'Compare the 10 cheapest and 10 most expensive U.S. cities by MapsToIt housing cost index — ACS-derived home value and rent versus the national average.',
  alternates: { canonical: '/cities/rankings' },
}

export default function CityRankingsPage() {
  const cheapest = cheapestCities(allCities, 10)
  const expensive = mostExpensiveCities(allCities, 10)

  return (
    <article className="section">
      <div className="page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/cities">Cities</Link>
          <span>/</span>
          <span>Rankings</span>
        </nav>
        <h1>Cheapest and most expensive U.S. cities</h1>
        <p className="lead">
          Ranked by MapsToIt housing cost index (100 ≈ U.S. average), derived from Census ACS median home
          value and median gross rent. Lower scores mean more affordable housing relative to the national
          baseline — not a full BLS consumer price basket.
        </p>
      </div>

      <section className="chart-section" aria-labelledby="cheapest-heading">
        <h2 id="cheapest-heading">10 cheapest cities by housing cost index</h2>
        <p>
          These catalog cities post the lowest blended ACS home + rent indices in the current MapsToIt
          release. Use the list below if you are scanning for affordable entry points; open any profile
          for income, commute, climate, and safety context.
        </p>
        <RankingBarChart cities={cheapest} mode="cheapest" />
        <ol className="ranking-list">
          {cheapest.map((city, index) => (
            <li key={city.slug}>
              <Link href={cityPath(city)}>
                <strong>
                  {index + 1}. {city.name}, {city.stateCode}
                </strong>
                <span>
                  Housing index {city.costOfLivingIndex} · homes ~{formatCurrency(city.medianHomePrice)} ·{' '}
                  {formatNumber(city.population)} people
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="chart-section" aria-labelledby="expensive-heading">
        <h2 id="expensive-heading">10 most expensive cities by housing cost index</h2>
        <p>
          At the other end of the catalog, these places carry the highest ACS-derived housing cost
          indices. High scores usually reflect elevated home values and rents versus national medians —
          dig into each profile before assuming “expensive” equals poor relocator fit.
        </p>
        <RankingBarChart cities={expensive} mode="expensive" />
        <ol className="ranking-list">
          {expensive.map((city, index) => (
            <li key={city.slug}>
              <Link href={cityPath(city)}>
                <strong>
                  {index + 1}. {city.name}, {city.stateCode}
                </strong>
                <span>
                  Housing index {city.costOfLivingIndex} · homes ~{formatCurrency(city.medianHomePrice)} ·{' '}
                  {formatNumber(city.population)} people
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <p className="chart-source">
        <strong>Source:</strong> U.S. Census Bureau ACS 5-year median home value and median gross rent;
        MapsToIt housing cost index (100 = U.S. average). See{' '}
        <Link href="/methodology">methodology</Link>. Also browse the{' '}
        <Link href="/cities">full city index</Link>,{' '}
        <Link href="/cities/cost-vs-safety">cost vs safety scatter</Link>, or{' '}
        <Link href="/compare">compare cities</Link>.
      </p>
    </article>
  )
}
