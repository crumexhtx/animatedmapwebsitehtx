import type { MetadataRoute } from 'next'
import { allCities, allStates, cityPath, siteUrl, statePath } from '@/lib/catalog'
import { COMPARISON_PAIRS, comparisonPath } from '@/lib/comparison-pairs'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const staticRoutes = [
    '',
    '/cities',
    '/cities/rankings',
    '/afford',
    '/cities/cost-vs-safety',
    '/cities/state-costs',
    '/cities/population-over-time',
    '/compare',
    '/about',
    '/contact',
    '/methodology',
  ].map((path) => ({
    url: `${base}${path || '/'}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : path.startsWith('/cities/') ? 0.85 : 0.7,
  }))

  const comparisonRoutes = COMPARISON_PAIRS.map((pair) => ({
    url: `${base}${comparisonPath(pair.slug)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }))

  const cityRoutes = allCities.map((city) => ({
    url: `${base}${cityPath(city)}`,
    lastModified: new Date(city.lastUpdated),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }))

  const stateRoutes = allStates.map((state) => ({
    url: `${base}${statePath(state)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...comparisonRoutes, ...stateRoutes, ...cityRoutes]
}
