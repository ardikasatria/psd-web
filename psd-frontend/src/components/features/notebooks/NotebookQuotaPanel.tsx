'use client'

import {
  NOTEBOOK_TIER_LABEL,
  notebookLimitsFor,
  runtimeLabel,
  type NotebookTierLimits,
} from '@/lib/notebooks/policy'
import { hubTierFromGamificationLevel } from '@/lib/notebooks/tier'
import { useNotebookKernelAccess } from '@/lib/notebooks/useNotebookKernelAccess'
import { kernelServerAvailable } from '@/lib/gamification/config'
import Link from 'next/link'
import { CpuChipIcon, DocumentDuplicateIcon, ServerStackIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import type { ReactNode } from 'react'

type Props = {
  className?: string
  compact?: boolean
}

function QuotaStat({
  icon,
  label,
  value,
  compact,
}: {
  icon: ReactNode
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-violet-200/70 bg-white/80 dark:border-violet-900/40 dark:bg-neutral-900/50',
        compact ? 'px-3 py-2.5' : 'px-4 py-3',
      )}
    >
      <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={clsx('mt-1 font-semibold text-neutral-900 dark:text-neutral-100', compact ? 'text-sm' : 'text-base')}>
        {value}
      </p>
    </div>
  )
}

export function NotebookQuotaPanel({ className, compact }: Props) {
  const gamification = useQuery({
    queryKey: ['me', 'gamification'],
    queryFn: getMyGamification,
    retry: false,
  })

  const tierKey = hubTierFromGamificationLevel(gamification.data?.tier.level ?? 0)
  const limits: NotebookTierLimits = notebookLimitsFor(tierKey)
  const tierName = NOTEBOOK_TIER_LABEL[tierKey] ?? tierKey
  const { canServer: grantServer, pendingGrant } = useNotebookKernelAccess()
  const showKernelCta = !kernelServerAvailable(tierKey) && !grantServer

  return (
    <section
      className={clsx(
        'rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/60 p-5 dark:border-violet-900/50 dark:from-violet-950/30 dark:via-neutral-900 dark:to-indigo-950/20',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            Kuota notebook
          </p>
          <h3 className="mt-1 text-lg font-bold text-neutral-900 dark:text-neutral-50">
            Tier {tierName}
            {gamification.data && (
              <span className="ms-2 text-sm font-normal text-neutral-500">
                · {gamification.data.tier.reputation.toLocaleString('id-ID')} rep
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Runtime: <strong>{runtimeLabel(limits.runtime)}</strong> · CPU-only
          </p>
        </div>
      </div>

      <div className={clsx('mt-4 grid gap-3', compact ? 'grid-cols-2 sm:grid-cols-3' : 'sm:grid-cols-3')}>
        <QuotaStat
          compact={compact}
          icon={<DocumentDuplicateIcon className="size-4" aria-hidden />}
          label="Notebook"
          value={`maks. ${limits.maxNotebooks}`}
        />
        <QuotaStat
          compact={compact}
          icon={<ServerStackIcon className="size-4" aria-hidden />}
          label="Kernel aktif"
          value={`maks. ${limits.maxConcurrentKernels}`}
        />
        <QuotaStat
          compact={compact}
          icon={<CpuChipIcon className="size-4" aria-hidden />}
          label="Kernel server"
          value={`${limits.cpu} CPU · ${limits.memGb} GB`}
        />
      </div>

      {showKernelCta && (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          {pendingGrant ? (
            <>
              Pengajuan kernel sedang ditinjau.{' '}
              <Link href="/notebooks/kernel-request" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                Lihat status
              </Link>
            </>
          ) : (
            <>
              Butuh kernel server?{' '}
              <Link href="/notebooks/kernel-request" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                Ajukan akses (mahasiswa / umum)
              </Link>
            </>
          )}
        </p>
      )}
    </section>
  )
}
