import type { Metadata } from 'next'
import type { CityRecord, StateRecord } from '@/lib/types'
import { cityPath, siteUrl, statePath } from '@/lib/catalog'

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl()).toString()
}

export function cityMetadata(city: CityRecord): Metadata {
  const title = `📍 Compare ${city.name}, ${city.stateCode} Cost of Living, Housing & Safety`
  const description =
    `Discover ${city.name}, ${city.state} cost of living (index ${city.costOfLivingIndex}), ` +
    `median home value, rent, income, commute, climate, and crime context — built for relocators comparing cities.`
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
  const title = `🗺️ Explore ${state.name} Cities — Housing Costs & Relocation Data`
  const description =
    `Browse ${state.cityCount} mapped ${state.name} cities — compare cost of living, income, housing prices, commute, climate, and safety before you move.`
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

/** Serializes structured data for a <script type="application/ld+json"> tag, escaping `<`
 * so a value containing "</script>" can't break out of the tag. */
export function safeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
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
