'use client'

import type { DashboardSummary } from '@/types/api'
import { ChartBarSquareIcon, GlobeAltIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

const ACCENTS = [
  'from-rose-400 to-orange-500',
  'from-orange-400 to-amber-500',
  'from-amber-400 to-primary-500',
  'from-primary-400 to-indigo-500',
] as const

export function DashboardCard({ dashboard, index = 0 }: { dashboard: DashboardSummary; index?: number }) {
  const accent = ACCENTS[index % ACCENTS.length]
  const isPublic = dashboard.visibility === 'public'

  return (
    <Link
      href={`/analytics/${dashboard.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800"
    >
      <div className={clsx('h-1 w-full bg-gradient-to-r', accent)} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={clsx('flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', accent)}>
            <ChartBarSquareIcon className="size-5" aria-hidden />
          </div>
          <span
            className={clsx(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              isPublic
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
            )}
          >
            {isPublic ? (
              <>
                <GlobeAltIcon className="size-3.5" aria-hidden />
                Publik
              </>
            ) : (
              <>
                <LockClosedIcon className="size-3.5" aria-hidden />
                Privat
              </>
            )}
          </span>
        </div>
        <h3 className="mt-4 line-clamp-2 font-semibold text-neutral-900 transition-colors group-hover:text-primary-600 dark:text-neutral-100">
          {dashboard.title}
        </h3>
        <p className="mt-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">{dashboard.slug}</p>
      </div>
    </Link>
  )
}
