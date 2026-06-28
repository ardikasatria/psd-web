/** Map tier gamifikasi PSD → tier notebook (pemula/menengah/lanjut). */
export function hubTierFromGamificationLevel(level: number): 'pemula' | 'menengah' | 'lanjut' {
  if (level <= 1) return 'pemula'
  if (level === 2) return 'menengah'
  return 'lanjut'
}
