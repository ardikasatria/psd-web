/** Canonical public URL for SEO (sitemap, robots, metadataBase). */
const DEFAULT_SITE_URL = 'https://projeksainsdata.com'

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  return fromEnv || DEFAULT_SITE_URL
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl()
  if (!path || path === '/') return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/** Host publik untuk prefix URL organisasi, mis. projeksainsdata.com */
export function getPublicHostname(): string {
  try {
    return new URL(getSiteUrl()).hostname
  } catch {
    return 'projeksainsdata.com'
  }
}

export function orgPublicUrl(handle: string): string {
  return absoluteUrl(`/orgs/${handle}`)
}
