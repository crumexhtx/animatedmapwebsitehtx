import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CatalogCoverageNote } from '@/components/CatalogCoverageNote'
import {
  allStates,
  cityPath,
  comparePath,
  getCitiesByState,
  getNotableUnmapped,
  getState,
} from '@/lib/catalog'
import { formatCurrency, formatNumber } from '@/lib/format'
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

      <CatalogCoverageNote stateName={state.name} cities={cities} unmapped={unmapped} />

      <dl className="stat-grid">
        <div className="stat-cell">
          <dt>Cities in catalog</dt>
          <dd>{state.cityCount}</dd>
        </div>
        <div className="stat-cell">
          <dt>Catalog combined pop.</dt>
          <dd>{formatNumber(state.population)}</dd>
        </div>
        <div className="stat-cell">
          <dt>Catalog avg income</dt>
          <dd>{formatCurrency(state.medianHouseholdIncome)}</dd>
        </div>
        <div className="stat-cell">
          <dt>Catalog avg housing index</dt>
          <dd>{state.costOfLivingIndex}</dd>
        </div>
      </dl>

      <h2>Mapped cities in {state.name}</h2>
      <p className="section-note">
        Full profiles only — compare any two with the{' '}
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
    </article>
  )
}
