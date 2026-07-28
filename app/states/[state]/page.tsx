import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { allStates, cityPath, getCitiesByState, getState } from '@/lib/catalog'
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

      <dl className="stat-grid">
        <div className="stat-cell">
          <dt>Cities in catalog</dt>
          <dd>{state.cityCount}</dd>
        </div>
        <div className="stat-cell">
          <dt>Combined population</dt>
          <dd>{formatNumber(state.population)}</dd>
        </div>
        <div className="stat-cell">
          <dt>Avg median income</dt>
          <dd>{formatCurrency(state.medianHouseholdIncome)}</dd>
        </div>
        <div className="stat-cell">
          <dt>Avg housing index</dt>
          <dd>{state.costOfLivingIndex}</dd>
        </div>
      </dl>

      <h2>Cities in {state.name}</h2>
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
