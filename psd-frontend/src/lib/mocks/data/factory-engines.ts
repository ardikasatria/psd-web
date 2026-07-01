import type { FactoryEngineLimits } from '@/types/api'
import { tierSlugFromLevel } from '@/lib/gamification/config'

const MB = 1024 * 1024
const GB = 1024 * MB

export function engineLimitsForTierLevel(level: number): FactoryEngineLimits {
  const slug = tierSlugFromLevel(level)
  const tierLabel =
    slug === 'pemula'
      ? 'Pemula'
      : slug === 'kontributor'
        ? 'Menengah'
        : slug === 'ahli'
          ? 'Menengah'
          : 'Lanjut'

  if (slug === 'pemula') {
    return {
      tier: slug,
      tier_label: tierLabel,
      estimated_bytes: 120 * MB,
      suggested_engine: 'duckdb',
      engines: {
        duckdb: { allowed: true, max_runs_per_day: 5, max_bytes: 200 * MB, raw_sql: false },
        spark: { allowed: false, max_runs_per_day: 0, max_bytes: 0, raw_sql: false, raw_code: false },
      },
    }
  }

  if (slug === 'kontributor' || slug === 'ahli') {
    return {
      tier: slug,
      tier_label: tierLabel,
      estimated_bytes: 800 * MB,
      suggested_engine: 'duckdb',
      engines: {
        duckdb: { allowed: true, max_runs_per_day: 30, max_bytes: 1 * GB, raw_sql: true },
        spark: {
          allowed: true,
          max_runs_per_day: 10,
          max_bytes: 20 * GB,
          raw_sql: true,
          raw_code: false,
        },
      },
    }
  }

  return {
    tier: slug,
    tier_label: 'Lanjut',
    estimated_bytes: 3 * GB,
    suggested_engine: 'spark',
    engines: {
      duckdb: { allowed: true, max_runs_per_day: 100, max_bytes: 5 * GB, raw_sql: true },
      spark: {
        allowed: true,
        max_runs_per_day: 50,
        max_bytes: 200 * GB,
        raw_sql: true,
        raw_code: true,
        kernel_required: true,
      },
    },
  }
}
