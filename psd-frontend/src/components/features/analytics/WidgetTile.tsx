'use client'

import { Chart } from '@/components/features/analytics/Chart'
import { darkPanelClass } from '@/components/common/featureGradients'
import { deleteWidget, getWidgetData } from '@/lib/api/dashboards'
import type { DashboardWidget, WidgetData } from '@/types/api'
import { Button } from '@/shared/Button'
import { Bars3Icon, TrashIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'

type Props = {
  slug: string
  widget: DashboardWidget
  editable?: boolean
  inGrid?: boolean
  className?: string
}

export function WidgetTile({ slug, widget, editable, inGrid, className }: Props) {
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery<WidgetData>({
    queryKey: ['analytics-widget-data', slug, widget.id],
    queryFn: () => getWidgetData(slug, widget.id),
    staleTime: 30_000,
  })

  const perfMeta = (data as WidgetData & { _perf?: { from_cache?: boolean } })?._perf
  const chartData = data
    ? Object.fromEntries(Object.entries(data).filter(([k]) => k !== '_perf'))
    : data

  const remove = useMutation({
    mutationFn: () => deleteWidget(slug, widget.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics-dashboard', slug] })
      qc.invalidateQueries({ queryKey: ['analytics-dashboards'] })
    },
  })

  return (
    <article
      className={clsx(
        darkPanelClass,
        'flex h-full min-h-0 flex-col shadow-sm ring-1 ring-neutral-200/60 dark:ring-neutral-600/80',
        inGrid ? 'rounded-2xl p-0' : 'overflow-hidden p-4 sm:p-5',
        className,
      )}
    >
      <div
        className={clsx(
          'flex shrink-0 items-start justify-between gap-2 border-b border-neutral-200/80 dark:border-neutral-700',
          inGrid ? 'px-4 py-3' : 'mb-3 pb-0 border-b-0',
        )}
      >
        <div className="flex min-w-0 items-start gap-2">
          {editable && inGrid && (
            <button
              type="button"
              className="widget-drag-handle mt-0.5 flex size-7 shrink-0 cursor-grab items-center justify-center rounded-lg border border-neutral-200/80 bg-neutral-50 text-neutral-400 transition hover:border-primary-300 hover:text-primary-600 active:cursor-grabbing dark:border-neutral-600 dark:bg-neutral-900 dark:hover:border-primary-700 dark:hover:text-primary-400"
              aria-label="Geser widget"
            >
              <Bars3Icon className="size-4" aria-hidden />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{widget.kind}</p>
            <h3 className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
              {widget.title || 'Widget tanpa judul'}
            </h3>
            {perfMeta?.from_cache && (
              <span className="mt-1 inline-flex rounded-full bg-sky-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                Cache
              </span>
            )}
          </div>
        </div>
        {editable && (
          <Button
            type="button"
            outline
            disabled={remove.isPending}
            onClick={() => {
              if (confirm('Hapus widget ini?')) remove.mutate()
            }}
            aria-label="Hapus widget"
            className="shrink-0"
          >
            <TrashIcon className="size-4" aria-hidden />
          </Button>
        )}
      </div>
      <div className={clsx('min-h-0 flex-1 overflow-auto', inGrid ? 'px-4 pb-4 pt-3' : 'min-h-[140px]')}>
        {isError ? (
          <p className="text-sm text-red-600 dark:text-red-400">Gagal memuat data widget.</p>
        ) : (
          <Chart kind={widget.kind} data={isLoading ? undefined : chartData} options={widget.options} title={widget.title} />
        )}
      </div>
    </article>
  )
}
