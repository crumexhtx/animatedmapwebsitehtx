import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/catalog'

export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    host: new URL(origin).host,
    sitemap: `${origin}/sitemap.xml`,
  }
}
