/** Kuota notebook per tier — mirrors Instructions/jupyter-notebook-psd/policy.py */
export type NotebookRuntimeMode = 'browser' | 'server' | 'both'

export type NotebookTierLimits = {
  maxNotebooks: number
  maxConcurrentKernels: number
  runtime: NotebookRuntimeMode
  cpu: number
  memGb: number
}

export const NOTEBOOK_TIER_LIMITS: Record<string, NotebookTierLimits> = {
  pemula: {
    maxNotebooks: 3,
    maxConcurrentKernels: 1,
    runtime: 'browser',
    cpu: 1,
    memGb: 2,
  },
  menengah: {
    maxNotebooks: 10,
    maxConcurrentKernels: 2,
    runtime: 'both',
    cpu: 2,
    memGb: 4,
  },
  lanjut: {
    maxNotebooks: 50,
    maxConcurrentKernels: 4,
    runtime: 'both',
    cpu: 4,
    memGb: 8,
  },
}

export const NOTEBOOK_TIER_LABEL: Record<string, string> = {
  pemula: 'Pemula',
  menengah: 'Menengah',
  lanjut: 'Lanjut',
}

export function notebookLimitsFor(tier: string | null | undefined): NotebookTierLimits {
  const key = (tier ?? 'pemula').toLowerCase()
  return NOTEBOOK_TIER_LIMITS[key] ?? NOTEBOOK_TIER_LIMITS.pemula
}

export function runtimeLabel(mode: NotebookRuntimeMode): string {
  if (mode === 'browser') return 'Browser (JupyterLite)'
  if (mode === 'server') return 'Kernel server'
  return 'Browser + kernel server'
}
