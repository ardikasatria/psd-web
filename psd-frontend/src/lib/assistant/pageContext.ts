/** Konteks halaman untuk asisten (Langkah 57). */
export function buildAssistantContext(pathname: string): Record<string, string> {
  const ctx: Record<string, string> = { halaman: pathname }

  if (pathname.startsWith('/datasets')) {
    ctx.fitur = 'dataset'
    ctx.topik = 'unggah, versi, dan publikasi dataset'
  } else if (pathname.startsWith('/models') || pathname.startsWith('/ml')) {
    ctx.fitur = 'model ML / registry / serving'
    ctx.topik = 'registry MLflow, drift, inferensi terkelola'
  } else if (pathname.startsWith('/competitions')) {
    ctx.fitur = 'kompetisi'
  } else if (pathname.startsWith('/learn') || pathname.startsWith('/paths')) {
    ctx.fitur = 'course & pembelajaran'
  } else if (pathname.startsWith('/notebooks')) {
    ctx.fitur = 'notebook Jupyter'
  } else if (pathname.startsWith('/idea-rooms')) {
    ctx.fitur = 'ruang ide'
  } else if (pathname.startsWith('/analytics') || pathname.startsWith('/factory/dashboards')) {
    ctx.fitur = 'ruang analitik / dashboard BI'
  } else if (pathname.startsWith('/factory')) {
    ctx.fitur = 'pabrik data'
  } else if (pathname.startsWith('/projects')) {
    ctx.fitur = 'proyek solusi'
  } else if (pathname.startsWith('/forum') || pathname.startsWith('/community')) {
    ctx.fitur = 'forum & komunitas'
  } else if (pathname.startsWith('/events')) {
    ctx.fitur = 'event'
  } else if (pathname.startsWith('/dashboard')) {
    ctx.fitur = 'dasbor pengguna'
  } else if (pathname.startsWith('/settings')) {
    ctx.fitur = 'pengaturan akun'
  } else if (pathname.startsWith('/explore')) {
    ctx.fitur = 'explore aset'
  } else if (pathname === '/' || pathname.startsWith('/home')) {
    ctx.fitur = 'beranda platform'
  }

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length >= 2) {
    ctx.detail = segments.slice(0, 3).join('/')
  }

  return ctx
}

const HIDDEN_PREFIXES = [
  '/assistant',
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/check-email',
  '/admin',
  '/email',
]

export function shouldHideAssistant(pathname: string): boolean {
  return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
