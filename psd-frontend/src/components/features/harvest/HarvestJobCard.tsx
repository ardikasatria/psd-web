'use client'

import { HarvestJob, cancelJob, retryJob } from '@/lib/api/harvest'
import {
  HarvestStatusBadge,
  isActiveHarvestStatus,
  timeAgoHarvest,
} from '@/components/features/harvest/harvest-utils'
import { darkPanelClass } from '@/components/common/featureGradients'
import { getApiErrorMessage } from '@/lib/api/errors'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CircleStackIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

const ACCENTS = [
  'from-emerald-400 to-teal-500',
  'from-teal-400 to-cyan-500',
  'from-cyan-400 to-sky-500',
  'from-green-400 to-emerald-500',
] as const

type Props = {
  job: HarvestJob
  index?: number
  onChanged: () => void
}

export function HarvestJobCard({ job, index = 0, onChanged }: Props) {
  const accent = ACCENTS[index % ACCENTS.length]
  const active = isActiveHarvestStatus(job.status)

  const cancelMut = useMutation({
    mutationFn: () => cancelJob(job.id),
    onSuccess: onChanged,
  })
  const retryMut = useMutation({
    mutationFn: () => retryJob(job.id),
    onSuccess: onChanged,
  })

  const actionError = cancelMut.error ?? retryMut.error

  const datasetHref = job.result_dataset
    ? (() => {
        const parts = job.result_dataset.split('/')
        if (parts.length >= 2) return `/datasets/${parts[0]}/${parts[1]}`
        return `/datasets/${job.result_dataset}`
      })()
    : null

  return (
    <article
      className={clsx(
        darkPanelClass,
        'overflow-hidden transition-shadow hover:shadow-md',
      )}
    >
      <div className={clsx('h-1 w-full bg-gradient-to-r', accent)} />
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={clsx(
                'flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                accent,
              )}
            >
              <CircleStackIcon className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{job.name}</h3>
              {job.source_url && (
                <p className="mt-0.5 truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  {job.source_url}
                </p>
              )}
              {job.created_at && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {timeAgoHarvest(job.created_at)}
                </p>
              )}
            </div>
          </div>
          <HarvestStatusBadge status={job.status} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">Record ditulis</span>
            <p className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {job.records_written.toLocaleString('id-ID')}
            </p>
          </div>
          {active && (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
              </span>
              <span className="text-xs font-medium">Memproses…</span>
            </div>
          )}
        </div>

        {job.error && (
          <p className="mt-3 rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {job.error}
          </p>
        )}

        {actionError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {getApiErrorMessage(actionError)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {datasetHref && job.status === 'completed' && (
            <ButtonPrimary href={datasetHref} outline className="!text-sm">
              <ArrowTopRightOnSquareIcon className="size-4" />
              Lihat dataset
            </ButtonPrimary>
          )}
          {active && (
            <Button
              type="button"
              outline
              disabled={cancelMut.isPending}
              onClick={() => cancelMut.mutate()}
              className="!text-sm"
            >
              <NoSymbolIcon className="size-4" />
              Batalkan
            </Button>
          )}
          {(job.status === 'failed' || job.status === 'canceled') && (
            <ButtonPrimary
              type="button"
              outline
              disabled={retryMut.isPending}
              onClick={() => retryMut.mutate()}
              className="!text-sm"
            >
              <ArrowPathIcon className="size-4" />
              Coba lagi
            </ButtonPrimary>
          )}
          {job.status === 'draft' && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Selesaikan wizard untuk menjalankan job ini.
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
