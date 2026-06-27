import { absoluteUrl, getSiteUrl } from '@/lib/site'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard/',
          '/settings/',
          '/me/',
          '/studio/',
          '/notifications/',
          '/m/',
          '/factory/',
          '/analytics/',
          '/idea-rooms/',
          '/synthesis/',
          '/api/',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl,
  }
}
