import type { CityRecord, StateRecord } from '@/lib/types'

export function cityPath(city: Pick<CityRecord, 'stateSlug' | 'slug'>) {
  return `/cities/${city.stateSlug}/${city.slug}`
}

export function statePath(state: StateRecord | string) {
  const slug = typeof state === 'string' ? state : state.slug
  return `/states/${slug}`
}

export function comparePath(slugs: string[]) {
  const cities = slugs.filter(Boolean).slice(0, 3)
  if (!cities.length) return '/compare'
  return `/compare?cities=${cities.join(',')}`
}

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mapstoit.com'
}
