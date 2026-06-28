'use client'

import { AdminContentCard, AdminPageHeader } from '@/components/admin/AdminShared'
import { QueryState } from '@/components/features/QueryState'
import { getPerfStats, type MetricStats } from '@/lib/api/perf'
import { Badge } from '@/shared/Badge'
import { useQuery } from '@tanstack/react-query'

export function AdminPerfPageContent() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-perf-stats'],
    queryFn: getPerfStats,
    refetchInterval: 30_000,
  })

  const metrics = Object.entries(data?.metrics ?? {})

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Performa & cache"
        description="Instrumentasi reaktif Langkah 58 — ukur dulu, cache hanya bila terbukti lambat."
      />

      <QueryState isLoading={isLoading} isError={isError} error={error} skeletonColumns={1}>
        {data && (
          <>
            <div className="flex flex-wrap gap-3">
              <Badge color={data.enabled ? 'green' : 'zinc'}>Instrumentasi {data.enabled ? 'aktif' : 'off'}</Badge>
              <Badge color={data.cache_enabled ? 'sky' : 'zinc'}>
                Cache {data.cache_enabled ? 'aktif' : 'off'}
              </Badge>
              {data.cache_auto && <Badge color="amber">Auto-gate should_cache</Badge>}
            </div>

            {!data.enabled ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Set `PSD_PERF_ENABLED=true` di backend untuk mulai mengumpulkan sampel latensi.
              </p>
            ) : metrics.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Belum ada sampel — buka dashboard analitik atau introspeksi skema untuk mengisi registri.
              </p>
            ) : (
              <AdminContentCard>
                <div className="overflow-x-auto p-4 sm:p-6">
                  <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700">
                      <th className="px-4 py-3 font-semibold">Metrik</th>
                      <th className="px-4 py-3 font-semibold">n</th>
                      <th className="px-4 py-3 font-semibold">p50</th>
                      <th className="px-4 py-3 font-semibold">p95</th>
                      <th className="px-4 py-3 font-semibold">max</th>
                      <th className="px-4 py-3 font-semibold">Cache?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map(([name, stats]: [string, MetricStats]) => (
                      <tr key={name} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="px-4 py-3 font-mono text-xs">{name}</td>
                        <td className="px-4 py-3">{stats.count}</td>
                        <td className="px-4 py-3">{stats.p50.toFixed(1)} ms</td>
                        <td className="px-4 py-3">{stats.p95.toFixed(1)} ms</td>
                        <td className="px-4 py-3">{stats.max.toFixed(1)} ms</td>
                        <td className="px-4 py-3">
                          {data.should_cache?.[name] ? (
                            <Badge color="green">Disarankan</Badge>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </AdminContentCard>
            )}

            {data.enabled && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Ambang cache: p95 ≥ {data.threshold_ms ?? 200} ms setelah {data.min_samples ?? 30} sampel. Aktifkan
                `PSD_PERF_CACHE_ENABLED=true` setelah metrik memenuhi syarat.
              </p>
            )}
          </>
        )}
      </QueryState>
    </div>
  )
}
