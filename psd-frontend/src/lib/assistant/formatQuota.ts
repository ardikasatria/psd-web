/** Format sisa waktu hingga reset kuota jendela jam. */
export function formatResetCountdown(resetAt: string | null, now = Date.now()): string | null {
  if (!resetAt) return null
  const secs = Math.max(0, Math.floor((new Date(resetAt).getTime() - now) / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h} jam ${m} menit`
  if (m > 0) return `${m} menit`
  return 'sebentar lagi'
}

export function quotaStatusLine(
  remaining: number,
  limit: number,
  resetAt: string | null,
  now = Date.now(),
): string {
  const reset = formatResetCountdown(resetAt, now)
  const base = `${remaining}/${limit} pesan`
  return reset ? `${base} · reset dalam ${reset}` : base
}
