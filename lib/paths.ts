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

/** Canonical apex host (no www). Prefer NEXT_PUBLIC_SITE_URL when set, but
 * always strip a leading `www.` so metadata/canonicals stay consistent. */
export function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mapstoit.com'
  try {
    const url = new URL(raw)
    url.hostname = url.hostname.replace(/^www\./i, '')
    url.pathname = '/'
    url.search = ''
    url.hash = ''
    return url.origin
  } catch {
    return 'https://mapstoit.com'
  }
}
