/**
 * Sumber kebenaran tunggal gamifikasi PSD (frontend).
 * Manifest kanonik: psd-gamification/psd_gamification/gamification.json
 */
import manifest from '../../../../psd-gamification/psd_gamification/gamification.json'

export type TierSlug = 'pemula' | 'kontributor' | 'ahli' | 'master' | 'grandmaster'
export type AchievementBadgeTier = 'bronze' | 'silver' | 'gold'
export type NotebookRuntimeMode = 'browser' | 'server' | 'both'

export type TierDef = {
  slug: TierSlug
  label: string
  level: number
  min_reputation: number
  badge_file: string
}

export type AchievementBadgeDef = {
  name: string
  tier: AchievementBadgeTier
  description: string
}

export const PSD_TIERS = manifest.tiers as TierDef[]
export const TIER_SLUGS = PSD_TIERS.map((t) => t.slug)
export const TIER_LABELS = PSD_TIERS.map((t) => t.label)
export const TIER_BADGE_FILES = PSD_TIERS.map((t) => t.badge_file)

export const TIER_LEVEL_BY_LABEL: Record<string, number> = Object.fromEntries(
  PSD_TIERS.map((t) => [t.label, t.level]),
)

export const ACHIEVEMENT_BADGES = manifest.achievement_badges as Record<string, AchievementBadgeDef>

export function tierLabel(level: number): string {
  const idx = Math.min(Math.max(level, 0), PSD_TIERS.length - 1)
  return PSD_TIERS[idx].label
}

export function tierSlugFromLevel(level: number): TierSlug {
  const idx = Math.min(Math.max(level, 0), PSD_TIERS.length - 1)
  return PSD_TIERS[idx].slug
}

export function tierLevelFromLabel(label: string | undefined): number {
  if (!label) return 0
  return TIER_LEVEL_BY_LABEL[label] ?? 0
}

export function quotaValue<T = number | string>(featureKey: string, tierSlug: TierSlug | string): T {
  const row = manifest.quota[featureKey as keyof typeof manifest.quota] as Record<string, T>
  const key = (tierSlug || 'pemula').toLowerCase()
  return (row[key] ?? row.pemula) as T
}

export type NotebookTierLimits = {
  maxNotebooks: number
  maxConcurrentKernels: number
  runtime: NotebookRuntimeMode
  cpu: number
  memGb: number
}

export function notebookLimitsFor(tierSlug: TierSlug | string | null | undefined): NotebookTierLimits {
  const slug = (tierSlug ?? 'pemula').toLowerCase() as TierSlug
  const runtime = quotaValue<string>('notebook.runtime', slug)
  return {
    maxNotebooks: quotaValue<number>('notebook.max_notebooks', slug),
    maxConcurrentKernels: quotaValue<number>('notebook.max_concurrent_kernels', slug),
    runtime: runtime === 'browser' ? 'browser' : runtime === 'server' ? 'server' : 'both',
    cpu: quotaValue<number>('jupyter.cpu', slug),
    memGb: quotaValue<number>('jupyter.mem_gb', slug),
  }
}

export const NOTEBOOK_TIER_LABEL: Record<string, string> = Object.fromEntries(
  PSD_TIERS.map((t) => [t.slug, t.label]),
)

export const KERNEL_SERVER_MIN_LEVEL =
  PSD_TIERS.find((t) => quotaValue<string>('notebook.runtime', t.slug) !== 'browser')?.level ?? 2

export function kernelServerAvailable(slug: TierSlug | string): boolean {
  const runtime = quotaValue<string>('notebook.runtime', slug)
  return runtime === 'both' || runtime === 'server'
}

export function runtimeLabel(mode: NotebookRuntimeMode): string {
  if (mode === 'browser') return 'Browser (JupyterLite)'
  if (mode === 'server') return 'Kernel server'
  return 'Browser + kernel server'
}

export function perksFromTierSlug(slug: TierSlug | string) {
  const level = PSD_TIERS.find((t) => t.slug === slug)?.level ?? 0
  return {
    upload_max_mb: quotaValue<number>('platform.upload_max_mb', slug),
    daily_submission_bonus: quotaValue<number>('platform.daily_submission_bonus', slug),
    notebook_quota: quotaValue<number>('platform.notebook_quota', slug),
    event_priority: level >= 2,
    can_create_event: level >= 3,
    daily_post_limit: quotaValue<number>('platform.daily_post_limit', slug),
    post_image_max: quotaValue<number>('platform.post_image_max', slug),
  }
}
