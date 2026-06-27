import { ApiError } from '@/lib/api/client'

export function getApiErrorMessage(error: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'rate_limited'
}

export const RATE_LIMIT_MESSAGE = 'Terlalu banyak permintaan, coba lagi sebentar lagi.'
