import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdSlot } from '@/components/AdSlot'
import { AffiliateZone } from '@/components/AffiliateZone'
import { CityMapLazy } from '@/components/CityMapLazy'
import { CityStats } from '@/components/CityStats'
import { CityGallery } from '@/components/CityGallery'
import { CityUrlButton } from '@/components/CityUrlButton'
import { NearbyCities } from '@/components/NearbyCities'
import { PopulationTrend } from '@/components/PopulationTrend'
import { SourceList } from '@/components/SourceList'
import {
  allCities,
  cityPath,
  getCity,
  getNearbyCities,
  nationalBaselines,
  siteUrl,
  statePath,
} from '@/lib/catalog'
import { cityJsonLd, cityMetadata, safeJsonLd } from '@/lib/seo'

type Props = {
  params: Promise<{ state: string; city: string }>
}

export function generateStaticParams() {
  return allCities.map((city) => ({
    state: city.stateSlug,
    city: city.slug,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug } = await params
  const city = getCity(citySlug)
  if (!city) return {}
  return cityMetadata(city)
}

export default async function CityPage({ params }: Props) {
  const { state, city: citySlug } = await params
  const city = getCity(citySlug)
  if (!city || city.stateSlug !== state) notFound()

  const nearby = getNearbyCities(city)
  const jsonLd = cityJsonLd(city)

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <div className="page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/cities">Cities</Link>
          <span>/</span>
          <Link href={statePath(city.stateSlug)}>{city.state}</Link>
          <span>/</span>
          <span>{city.name}</span>
        </nav>
        <div className="city-title-row">
          <h1>
            {city.name}, {city.state}
          </h1>
          <CityUrlButton
            url={`${siteUrl()}${cityPath(city)}`}
            label={`${city.name}, ${city.state}`}
          />
        </div>
        <p className="lead">
          Cost of living, housing, income, commute, climate, and safety — compiled for relocators researching {city.name}.
        </p>
      </div>

      <div className="city-layout">
        <div>
          <CityGallery images={city.images} cityName={city.name} />

          <div className="city-map-panel">
            <CityMapLazy cities={allCities} focus={city} />
          </div>

          <CityStats city={city} national={nationalBaselines} />

          <PopulationTrend history={city.populationHistory} cityName={city.name} />

          <div className="prose">
            {city.description.split('\n\n').map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>

          {city.neighborhoods?.length ? (
            <>
              <h2>Neighborhoods often researched</h2>
              <ul className="neighborhoods">
                {city.neighborhoods.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </>
          ) : null}

          <AdSlot slotId="city-in-content" size="in-content" />

          <NearbyCities cities={nearby} />
          <SourceList city={city} />

          <AffiliateZone category="moving" cityName={city.name} />
          <AffiliateZone category="renters-insurance" cityName={city.name} />
          <AffiliateZone category="real-estate" cityName={city.name} />

          <p className="lead">
            <Link href={cityPath(city)}>Canonical profile</Link>
            {' · '}
            <Link href={statePath(city.stateSlug)}>All {city.state} cities</Link>
            {' · '}
            <Link href="/cities">Full city index</Link>
          </p>
        </div>

        <aside className="sidebar">
          <AdSlot slotId="city-sidebar" />
          <p className="lead">
            State overview:{' '}
            <Link href={statePath(city.stateSlug)}>{city.state}</Link>
          </p>
        </aside>
      </div>
    </article>
  )
}
