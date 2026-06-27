/** Slug yang bentrok dengan rute statis aplikasi — tidak boleh dipakai sebagai profil publik. */
const RESERVED_PROFILE_SLUGS = new Set([
  '403',
  'about',
  'admin',
  'api',
  'author',
  'category',
  'community',
  'competitions',
  'contact',
  'dashboard',
  'datasets',
  'events',
  'explore',
  'forgot-password',
  'forum',
  'home-2',
  'home-3',
  'home-4',
  'home-5',
  'home-6',
  'leaderboard',
  'learn',
  'login',
  'm',
  'models',
  'notebooks',
  'notifications',
  'paths',
  'post',
  'projects',
  'register',
  'reset-password',
  'search',
  'search-2',
  'settings',
  'signup',
  'submission',
  'subscription',
  'tag',
  'tags',
  'u',
  'verify-email',
])

export function isReservedProfileSlug(slug: string): boolean {
  return RESERVED_PROFILE_SLUGS.has(slug.toLowerCase())
}

export function profilePath(username: string): string {
  return `/${encodeURIComponent(username)}`
}
