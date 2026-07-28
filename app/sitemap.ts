import type { MetadataRoute } from 'next'
import { allCities, allStates, cityPath, siteUrl, statePath } from '@/lib/catalog'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const staticRoutes = ['', '/cities', '/compare', '/about', '/contact', '/methodology'].map((path) => ({
    url: `${base}${path || '/'}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.7,
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

  return [...staticRoutes, ...stateRoutes, ...cityRoutes]
}
