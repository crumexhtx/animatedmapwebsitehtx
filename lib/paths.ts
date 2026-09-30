import type { CityRecord, StateRecord } from '@/lib/types'
import { comparisonPath, findComparisonPair } from '@/lib/comparison-pairs'

export const githubProfileUrl = 'https://github.com/crumexhtx'
export const githubRepoUrl = 'https://github.com/crumexhtx/animatedmapwebsitehtx'

export function cityPath(city: Pick<CityRecord, 'stateSlug' | 'slug'>) {
  return `/cities/${city.stateSlug}/${city.slug}`
}

export function statePath(state: StateRecord | string) {
  const slug = typeof state === 'string' ? state : state.slug
  return `/states/${slug}`
}

/** Interactive compare tool (query string). Use for shareable tool state, not crawlable nav. */
export function compareToolPath(slugs: string[]) {
  const cities = slugs.filter(Boolean).slice(0, 3)
  if (!cities.length) return '/compare'
  return `/compare?cities=${cities.join(',')}`
}

/** Best public URL for a comparison: curated pair page when we have one, otherwise the tool. */
export function comparePath(slugs: string[]) {
  const cities = slugs.filter(Boolean).slice(0, 3)
  if (!cities.length) return '/compare'
  if (cities.length === 2) {
    const pair = findComparisonPair(cities[0], cities[1])
    if (pair) return comparisonPath(pair.slug)
  }
  return compareToolPath(cities)
}

/** Matcher mode on /compare — optional baseline city for “find cities like this”. */
export function matchPath(opts?: {
  like?: string
  colMin?: number
  colMax?: number
  climate?: string
  weights?: { cost?: number; safety?: number; income?: number; climate?: number }
}) {
  const params = new URLSearchParams()
  params.set('mode', 'match')
  if (opts?.like) params.set('like', opts.like)
  if (opts?.colMin != null) params.set('colMin', String(opts.colMin))
  if (opts?.colMax != null) params.set('colMax', String(opts.colMax))
  if (opts?.climate) params.set('climate', opts.climate)
  if (opts?.weights?.cost != null) params.set('wCost', String(opts.weights.cost))
  if (opts?.weights?.safety != null) params.set('wSafety', String(opts.weights.safety))
  if (opts?.weights?.income != null) params.set('wIncome', String(opts.weights.income))
  if (opts?.weights?.climate != null) params.set('wClimate', String(opts.weights.climate))
  return `/compare?${params.toString()}`
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
