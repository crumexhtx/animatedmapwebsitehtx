import type { Metadata } from 'next'
import type { CityRecord, StateRecord } from '@/lib/types'
import { cityPath, siteUrl, statePath } from '@/lib/catalog'

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl()).toString()
}

export function cityMetadata(city: CityRecord): Metadata {
  const title = `${city.name}, ${city.stateCode} Cost of Living, Safety & Climate | MapsToIt`
  const description =
    `Research ${city.name}, ${city.state}: cost of living index ${city.costOfLivingIndex}, ` +
    `median home price ${city.medianHomePrice.toLocaleString('en-US')}, commute, climate, and crime context.`
  const url = absoluteUrl(cityPath(city))

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'MapsToIt',
      type: 'website',
    },
  }
}

export function stateMetadata(state: StateRecord): Metadata {
  const title = `${state.name} Cities — Cost of Living & Relocation Data | MapsToIt`
  const description =
    `Explore ${state.cityCount} ${state.name} cities on MapsToIt — income, housing costs, commute, climate, and safety.`
  const url = absoluteUrl(statePath(state))

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'MapsToIt',
      type: 'website',
    },
  }
}

export function cityJsonLd(city: CityRecord) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${city.name}, ${city.state}`,
    description: city.description.slice(0, 300),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: city.coordinates[1],
      longitude: city.coordinates[0],
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: city.name,
      addressRegion: city.stateCode,
      addressCountry: 'US',
    },
    url: absoluteUrl(cityPath(city)),
  }
}
