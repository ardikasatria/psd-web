import { buildSitemapEntries } from '@/lib/seo/sitemap-data'
import { getSiteUrl } from '@/lib/site'
import type { MetadataRoute } from 'next'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  return buildSitemapEntries(siteUrl)
}
