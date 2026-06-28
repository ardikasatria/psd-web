/** Map level gamifikasi PSD (0–4) → slug tier kanonik. */
import { tierSlugFromLevel, type TierSlug } from '@/lib/gamification/config'

export function hubTierFromGamificationLevel(level: number): TierSlug {
  return tierSlugFromLevel(level)
}
