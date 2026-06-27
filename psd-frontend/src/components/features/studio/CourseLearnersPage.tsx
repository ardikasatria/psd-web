'use client'

import { QueryState } from '@/components/features/QueryState'
import { getCourse, getLearners } from '@/lib/api/learn'
import { formatAccessExpiry } from '@/components/features/learn/learnUtils'
import Avatar from '@/shared/Avatar'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { ArrowDownTrayIcon, ArrowLeftIcon, UsersIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useMemo } from 'react'
import type { CourseLearner } from '@/types/api'

function exportCsv(items: CourseLearner[], courseTitle: string) {
  const header = 'username,nama,selesai,total,persen,enrol,berlaku_sampai\n'
  const rows = items
    .map(
      (r) =>
        `${r.user.username},"${r.user.name}",${r.completed},${r.total},${r.percent},${r.enrolled_at},${r.expires_at ?? ''}`,
    )
    .join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pembelajar-${courseTitle.replace(/\s+/g, '-').toLowerCase()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function CourseLearnersPage({ slug }: { slug: string }) {
  const course = useQuery({ queryKey: ['course', slug], queryFn: () => getCourse(slug) })
  const learners = useQuery({
    queryKey: ['course-learners', slug],
    queryFn: () => getLearners(slug),
    enabled: !!course.data,
  })

  const avgProgress = useMemo(() => {
    const items: CourseLearner[] = learners.data?.items ?? []
    if (!items.length) return 0
    return Math.round(items.reduce((s: number, i: CourseLearner) => s + i.percent, 0) / items.length)
  }, [learners.data?.items])

  return (
    <div className="container py-8 lg:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/studio/${slug}/edit`}
            className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            <ArrowLeftIcon className="size-4" />
            Kembali ke builder
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Pembelajar</h1>
          <p className="mt-1 text-sm text-neutral-500">{course.data?.title ?? slug}</p>
        </div>
        {(learners.data?.items.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => exportCsv(learners.data!.items, course.data?.title ?? slug)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <ArrowDownTrayIcon className="size-4" />
            Ekspor CSV
          </button>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <UsersIcon className="size-8 text-primary-600 dark:text-primary-400" />
            <div>
              <p className="text-2xl font-bold tabular-nums">{learners.data?.total ?? 0}</p>
              <p className="text-sm text-neutral-500">Total pembelajar</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-800/40">
          <p className="text-2xl font-bold tabular-nums">{avgProgress}%</p>
          <p className="text-sm text-neutral-500">Rata-rata progres</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>
      </div>

      <QueryState isLoading={learners.isLoading} isError={learners.isError} error={learners.error}>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
          <div className="hidden border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/50 md:grid md:grid-cols-[1fr_140px_120px_120px] md:gap-4">
            <span>Pembelajar</span>
            <span>Progres</span>
            <span>Enrol</span>
            <span>Berlaku</span>
          </div>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {(learners.data?.items ?? []).map((row: CourseLearner) => (
              <li
                key={row.user.username}
                className="grid gap-3 p-4 md:grid-cols-[1fr_140px_120px_120px] md:items-center md:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    src={row.user.avatar_url ?? undefined}
                    alt={row.user.username}
                    className="size-10 shrink-0"
                    width={40}
                    height={40}
                    sizes="40px"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.user.name}</p>
                    <p className="truncate text-sm text-neutral-500">@{row.user.username}</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-500 md:justify-start md:gap-2">
                    <span className="md:hidden">Progres</span>
                    <span className="font-medium tabular-nums text-neutral-700 dark:text-neutral-300">
                      {row.completed}/{row.total} · {row.percent}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="md:hidden text-xs text-neutral-500">Enrol · </span>
                  {new Date(row.enrolled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div>
                  {row.expires_at ? (
                    <Badge color="yellow" className="text-[11px]">
                      {formatAccessExpiry(row.expires_at)}
                    </Badge>
                  ) : (
                    <Badge color="green" className="text-[11px]">Selamanya</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {!learners.data?.items.length && (
            <div className="px-4 py-12 text-center text-neutral-500">Belum ada pembelajar.</div>
          )}
        </div>
      </QueryState>

      {learners.isError && (
        <div className="mt-6 text-center">
          <ButtonPrimary href="/studio">Kembali ke Studio</ButtonPrimary>
        </div>
      )}
    </div>
  )
}
