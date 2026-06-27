function storageHost(): string | null {
  if (process.env.NEXT_PUBLIC_STORAGE_HOST) {
    return process.env.NEXT_PUBLIC_STORAGE_HOST
  }
  const api = process.env.NEXT_PUBLIC_API_BASE_URL
  if (api?.includes('://api.')) {
    return api.replace('://api.', '://storage.').split('/')[2] ?? null
  }
  return null
}

/** User uploads and local previews cannot use the Next.js image optimizer. */
export function shouldUnoptimizeImage(src: string): boolean {
  if (src.startsWith('blob:') || src.startsWith('data:')) return true
  const host = storageHost()
  if (host) {
    try {
      if (new URL(src).hostname === host) return true
    } catch {
      return true
    }
  }
  return src.includes('/psd-media/') || src.includes('/psd-assets/')
}

export function getStorageHostname(): string | null {
  return storageHost()
}
