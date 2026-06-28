/** URL Jupyter Notebook PSD (Langkah 52). Kosong = fitur nonaktif (build-time fallback). */
export function hubEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_HUB_URL?.trim())
}

export function hubUrl(path = '/'): string {
  const base = process.env.NEXT_PUBLIC_HUB_URL?.trim().replace(/\/$/, '')
  if (!base) return ''
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

/** @deprecated Prefer useHub().launchUrl — verifikasi sesi PSD dulu */
export function hubNotebookUrl(): string {
  return hubUrl('/hub/spawn') || hubUrl('/')
}

export { useHub } from '@/lib/hub/useHub'
export { getHubConfig, hubLaunchUrl } from '@/lib/api/hub'
