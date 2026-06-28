export type DriftStatus = 'stable' | 'moderate' | 'significant' | 'ok' | 'unknown'

export type FeatureDrift = {
  feature: string
  psi: number
  status: DriftStatus
}

export const DRIFT_STATUS_LABEL: Record<DriftStatus, string> = {
  stable: 'Stabil',
  moderate: 'Sedang',
  significant: 'Signifikan',
  ok: 'OK',
  unknown: '—',
}

export const DRIFT_STATUS_CLASS: Record<DriftStatus, string> = {
  stable:
    'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50',
  moderate:
    'bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50',
  significant:
    'bg-red-100 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50',
  ok: 'bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
  unknown: 'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400',
}

export function normalizeDriftStatus(raw: string | null | undefined): DriftStatus {
  if (raw === 'stable' || raw === 'moderate' || raw === 'significant' || raw === 'ok') return raw
  return 'unknown'
}
