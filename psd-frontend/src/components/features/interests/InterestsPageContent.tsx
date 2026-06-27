'use client'

import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { SettingsShell } from '@/components/features/settings/SettingsShell'
import { getActivitySummary } from '@/lib/api/activity'
import type { ActivityCategoryAffinity, ActivityTagAffinity } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import clsx from 'clsx'
import {
  ChartBarIcon,
  SparklesIcon,
  TagIcon,
} from '@heroicons/react/24/outline'

const actionLabels: Record<string, string> = {
  view: 'Tampilan',
  search: 'Pencarian',
  click: 'Klik',
  enroll: 'Enrol',
  like: 'Suka',
  follow: 'Ikuti',
  submit: 'Submission',
  publish: 'Terbit',
  complete: 'Selesai',
}

export function InterestsPageContent() {
  const summary = useQuery({
    queryKey: ['me', 'activity-summary'],
    queryFn: getActivitySummary,
    retry: false,
  })

  const maxCat = Math.max(...(summary.data?.top_categories.map((c: ActivityCategoryAffinity) => c.count) ?? [1]), 1)
  const maxTag = Math.max(...(summary.data?.top_tags.map((t: ActivityTagAffinity) => t.count) ?? [1]), 1)

  return (
    <DetailPageShell>
      <DetailPageHeader
        title="Minat saya"
        subtitle="Ringkasan aktivitas Anda di PSD — dasar rekomendasi yang transparan dan dapat dikendalikan."
      />

      <div className="mb-6 rounded-2xl border border-primary-200/70 bg-gradient-to-r from-primary-50 to-white p-4 text-sm text-primary-900 dark:border-primary-800/50 dark:from-primary-950/30 dark:to-neutral-900 dark:text-primary-100">
        <p className="flex items-center gap-2 font-medium">
          <SparklesIcon className="size-4 shrink-0" />
          Berdasarkan aktivitasmu ({summary.data?.window_days ?? 30} hari terakhir)
        </p>
        <p className="mt-1 text-primary-800/80 dark:text-primary-200/80">
          Data ini membantu PSD memahami minat Anda. Anda bisa mematikan pelacakan kapan saja di{' '}
          <Link href="/settings/privacy" className="font-semibold underline underline-offset-2">
            pengaturan privasi
          </Link>
          .
        </p>
      </div>

      <QueryState isLoading={summary.isLoading} isError={summary.isError} error={summary.error}>
        {summary.data && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                <ChartBarIcon className="size-5 text-primary-600" />
                Kategori favorit
              </h2>
              {summary.data.top_categories.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-500">Belum cukup aktivitas untuk menampilkan kategori.</p>
              ) : (
                <ul className="mt-5 space-y-4">
                  {summary.data.top_categories.map((c: ActivityCategoryAffinity) => (
                    <li key={c.slug}>
                      <div className="mb-1 flex justify-between text-sm">
                        <Link href={`/categories/${c.slug}`} className="font-medium text-neutral-800 hover:text-primary-600 dark:text-neutral-200">
                          {c.name}
                        </Link>
                        <span className="text-neutral-500">{c.count}×</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                          style={{ width: `${Math.round((c.count / maxCat) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                <TagIcon className="size-5 text-primary-600" />
                Tag yang sering dilihat
              </h2>
              {summary.data.top_tags.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-500">Belum ada tag yang terdeteksi dari aktivitas.</p>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  {summary.data.top_tags.map((t: ActivityTagAffinity) => (
                    <Link
                      key={t.tag}
                      href={`/tags/${encodeURIComponent(t.tag)}`}
                      className={clsx(
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                        'border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100',
                        'dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200',
                      )}
                      style={{ opacity: 0.55 + (t.count / maxTag) * 0.45 }}
                    >
                      {t.tag}
                      <span className="ms-1.5 text-xs text-primary-600 dark:text-primary-400">{t.count}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-neutral-200/80 bg-white p-6 lg:col-span-2 dark:border-neutral-700 dark:bg-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Jenis aktivitas</h2>
              {Object.keys(summary.data.actions).length === 0 ? (
                <p className="mt-4 text-sm text-neutral-500">Belum ada aktivitas tercatat.</p>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {Object.entries(summary.data.actions).map(([action, count]) => (
                    <div
                      key={action}
                      className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/50"
                    >
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {actionLabels[action] ?? action}
                      </span>
                      <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">{Number(count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </QueryState>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonPrimary href="/settings/privacy" outline>
          Kelola privasi pelacakan
        </ButtonPrimary>
        <ButtonPrimary href="/explore">Jelajahi konten</ButtonPrimary>
      </div>
    </DetailPageShell>
  )
}
