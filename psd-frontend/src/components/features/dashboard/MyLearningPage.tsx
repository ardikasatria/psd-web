'use client'

import { EmptyCTA } from '@/components/dashboard/EmptyCTA'
import { LearningProgressRow } from '@/components/dashboard/rows/LearningProgressRow'
import { QueryState } from '@/components/features/QueryState'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { getAuthoredCourses, getMyLearning } from '@/lib/api/learn'
import { useMe } from '@/lib/api/dashboard'
import { CourseSummary, LearningProgress, MyLearning } from '@/types/api'
import { Badge } from '@/shared/Badge'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

export function MyLearningPage() {
  useAuthGuard('/dashboard/learning')
  const me = useMe()

  const learning = useQuery<MyLearning>({
    queryKey: ['my-learning'],
    queryFn: getMyLearning,
  })

  const authored = useQuery<CourseSummary[]>({
    enabled: !!me.data?.user?.is_instructor,
    queryKey: ['authored-courses'],
    queryFn: getAuthoredCourses,
  })

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Belajar saya</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Progres kursus yang Anda ikuti dan kursus yang Anda ajarkan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonPrimary href="/learn">Jelajahi kursus</ButtonPrimary>
          {me.data?.user?.is_instructor && (
            <ButtonPrimary href="/studio" outline>
              Studio instruktur
            </ButtonPrimary>
          )}
        </div>
      </div>

      <section>
        <h3 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">Progres belajar</h3>
        <QueryState
          isLoading={learning.isLoading}
          isError={learning.isError}
          error={learning.error}
          isEmpty={!learning.data?.items.length}
          emptyTitle="Belum enrol kursus"
          emptyDescription="Mulai perjalanan belajar Anda."
        >
          <div className="space-y-3">
            {(learning.data?.items ?? []).map((item: LearningProgress) => (
              <LearningProgressRow key={item.course.slug} item={item} />
            ))}
          </div>
          {!learning.data?.items.length && !learning.isLoading && (
            <EmptyCTA text="Belum enrol kursus." href="/learn" cta="Mulai belajar" />
          )}
        </QueryState>
      </section>

      {me.data?.user?.is_instructor && (
        <section>
          <h3 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">Kursus saya ajar</h3>
          <QueryState isLoading={authored.isLoading} isError={authored.isError} error={authored.error}>
            {authored.data?.length ? (
              <div className="space-y-3">
                {authored.data.map((c: CourseSummary) => (
                  <Link
                    key={c.slug}
                    href={`/learn/${c.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/50"
                  >
                    <div className="min-w-0">
                      <h4 className="truncate font-medium text-neutral-900 dark:text-neutral-100">{c.title}</h4>
                      <p className="mt-1 text-xs text-neutral-500">{c.lessons_count} pelajaran · {c.level}</p>
                    </div>
                    <Badge color={c.status === 'published' ? 'green' : 'yellow'}>
                      {c.status === 'published' ? 'Terbit' : 'Draf'}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              !authored.isLoading && (
                <EmptyCTA text="Belum ada kursus yang Anda buat." href="/studio" cta="Buka studio" />
              )
            )}
          </QueryState>
        </section>
      )}
    </div>
  )
}
