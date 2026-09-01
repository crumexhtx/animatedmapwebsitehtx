import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CatalogCoverageNote } from '@/components/CatalogCoverageNote'
import { ContentSnapshot } from '@/components/ContentSnapshot'
import {
  allStates,
  cityPath,
  comparePath,
  getCitiesByState,
  getNotableUnmapped,
  getState,
} from '@/lib/catalog'
import { formatCurrency, formatNumber } from '@/lib/format'
import { buildStateDirectAnswer, buildStateSnapshotMetrics } from '@/lib/snapshot'
import { stateMetadata } from '@/lib/seo'

type Props = {
  params: Promise<{ state: string }>
}

export function generateStaticParams() {
  return allStates.map((state) => ({ state: state.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: slug } = await params
  const state = getState(slug)
  if (!state) return {}
  return stateMetadata(state)
}

export default async function StatePage({ params }: Props) {
  const { state: slug } = await params
  const state = getState(slug)
  if (!state) notFound()

  const cities = getCitiesByState(state.slug)
  const unmapped = getNotableUnmapped(state.slug)
  const asOf = cities.reduce((latest, city) => (city.lastUpdated > latest ? city.lastUpdated : latest), '1970-01-01')

  return (
    <article className="section">
      <div className="page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/cities">Cities</Link>
          <span>/</span>
          <span>{state.name}</span>
        </nav>
        <h1>{state.name} city data</h1>
        <p className="lead">{state.description}</p>
      </div>

      <ContentSnapshot
        title={`What does MapsToIt cover in ${state.name}?`}
        directAnswer={buildStateDirectAnswer(state)}
        catalogRefreshed={asOf}
        metrics={buildStateSnapshotMetrics(state)}
      />

      <CatalogCoverageNote stateName={state.name} cities={cities} unmapped={unmapped} />

      <section className="answer-section">
        <h2>Which {state.name} cities have full MapsToIt profiles?</h2>
        <p className="answer-lead">
          {state.cityCount} cities are fully mapped below — each page includes proprietary housing, income, commute,
          climate, and safety figures versus U.S. baselines. Compare any two with the{' '}
          <Link href={comparePath(cities.slice(0, 2).map((city) => city.slug))}>compare tool</Link>.
        </p>
        <ul className="city-list">
          {cities.map((city) => (
            <li key={city.slug}>
              <Link href={cityPath(city)}>
                <strong>{city.name}</strong>
                <span>
                  {formatNumber(city.population)} people · homes ~{formatCurrency(city.medianHomePrice)} · Housing index{' '}
                  {city.costOfLivingIndex}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
