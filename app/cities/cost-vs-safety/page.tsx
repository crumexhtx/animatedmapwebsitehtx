import type { Metadata } from 'next'
import Link from 'next/link'
import { CostSafetyScatter } from '@/components/CostSafetyScatter'
import { allCities, cityPath } from '@/lib/catalog'
import { costVsSafetyPoints } from '@/lib/charts'
import { formatNumber } from '@/lib/format'

export const metadata: Metadata = {
  title: '📈 Explore Cost of Living vs Safety — U.S. City Scatter Plot',
  description:
    'Plot MapsToIt cities by housing cost index versus violent crime rate. Hover or click any point to open that city profile.',
  alternates: { canonical: '/cities/cost-vs-safety' },
}

export default function CostVsSafetyPage() {
  const points = costVsSafetyPoints(allCities)
  const sample = [...points]
    .sort((a, b) => a.costOfLivingIndex - b.costOfLivingIndex)
    .slice(0, 8)

  return (
    <article className="section">
      <div className="page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/cities">Cities</Link>
          <span>/</span>
          <span>Cost vs safety</span>
        </nav>
        <h1>Cost of living vs. violent crime</h1>
        <p className="lead">
          Each point is a MapsToIt city with an available FBI violent crime rate. The horizontal axis is
          the ACS-derived housing cost index (100 = U.S. average). The vertical axis is violent offenses
          per 100,000 residents. Dot size scales with population.
        </p>
      </div>

      <CostSafetyScatter points={points} />

      <section className="chart-section" aria-labelledby="sample-heading">
        <h2 id="sample-heading">Sample cities on this chart</h2>
        <p>
          {points.length} cities plot below after excluding FBI data gaps and curated launch estimates.
          A short sample of lower-housing-cost cities:
        </p>
        <ul className="ranking-list">
          {sample.map((city) => (
            <li key={city.slug}>
              <Link href={cityPath(city)}>
                <strong>
                  {city.name}, {city.stateCode}
                </strong>
                <span>
                  Housing index {city.costOfLivingIndex} · violent crime {city.violentCrime} / 100k ·{' '}
                  {formatNumber(city.population)} people
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="chart-source">
        <strong>Sources:</strong> U.S. Census Bureau ACS 5-year (housing cost index inputs); FBI Crime
        Data Explorer / CIUS agency rates per 100k. Citywide crime can misrepresent neighborhoods — see{' '}
        <Link href="/methodology">methodology</Link>. Related:{' '}
        <Link href="/cities/rankings">cost rankings</Link> · <Link href="/compare">compare cities</Link>.
      </p>
    </article>
  )
}
