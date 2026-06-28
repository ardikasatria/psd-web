/** URL Jupyter Notebook PSD (Langkah 52). Kosong = fitur nonaktif. */
export function hubEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_HUB_URL?.trim())
}

export function hubUrl(path = '/'): string {
  const base = process.env.NEXT_PUBLIC_HUB_URL?.trim().replace(/\/$/, '')
  if (!base) return ''
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

/** Spawn server pengguna — OAuth PSD otomatis via Jupyter Notebook. */
export function hubNotebookUrl(): string {
  return hubUrl('/hub/spawn') || hubUrl('/')
}
