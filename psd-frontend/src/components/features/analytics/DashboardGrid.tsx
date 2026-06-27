'use client'

import { WidgetTile } from '@/components/features/analytics/WidgetTile'
import { darkPanelLgClass } from '@/components/common/featureGradients'
import { updateDashboard } from '@/lib/api/dashboards'
import type { DashboardWidget } from '@/types/api'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useCallback, useMemo, useRef } from 'react'
import type { Layout } from 'react-grid-layout'
import clsx from 'clsx'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import './dashboard-grid.css'

const ReactGridLayout = dynamic(
  () => import('react-grid-layout').then((m) => m.WidthProvider(m.default)),
  { ssr: false },
)

const ROW_HEIGHT = 52
const MARGIN: [number, number] = [16, 16]
const PADDING: [number, number] = [20, 20]
const MIN_CANVAS_ROWS = 8

type LayoutItem = { i: string; x: number; y: number; w: number; h: number }

type Props = {
  slug: string
  widgets: DashboardWidget[]
  layout: LayoutItem[]
  editable?: boolean
}

function defaultLayout(widgets: DashboardWidget[]): LayoutItem[] {
  return widgets.map((w, i) => ({
    i: w.id,
    x: (i % 2) * 6,
    y: Math.floor(i / 2) * 5,
    w: w.kind === 'kpi' ? 4 : 6,
    h: w.kind === 'kpi' ? 4 : w.kind === 'table' ? 6 : 5,
  }))
}

function mergeLayout(widgets: DashboardWidget[], saved: LayoutItem[]): LayoutItem[] {
  const base = defaultLayout(widgets)
  if (!saved.length) return base
  const byId = new Map(saved.map((l) => [l.i, l]))
  return widgets.map((w) => {
    const fallback = base.find((b) => b.i === w.id)
    return byId.get(w.id) ?? fallback ?? { i: w.id, x: 0, y: 0, w: 6, h: 5 }
  })
}

function canvasHeightPx(items: LayoutItem[]): number {
  const maxRow = items.length ? Math.max(...items.map((l) => l.y + l.h)) : 0
  const rows = Math.max(maxRow, MIN_CANVAS_ROWS)
  const rowSpan = rows * ROW_HEIGHT
  const marginSpan = Math.max(0, rows - 1) * MARGIN[1]
  const padSpan = PADDING[1] * 2
  return rowSpan + marginSpan + padSpan + 32
}

export function DashboardGrid({ slug, widgets, layout, editable }: Props) {
  const qc = useQueryClient()
  const items = useMemo(() => mergeLayout(widgets, layout), [widgets, layout])
  const canvasHeight = useMemo(() => canvasHeightPx(items), [items])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveLayout = useMutation({
    mutationFn: (next: LayoutItem[]) => updateDashboard(slug, { layout: next }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analytics-dashboard', slug] }),
  })

  const persistLayout = useCallback(
    (next: Layout[]) => {
      if (!editable) return
      const payload = next.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveLayout.mutate(payload), 400)
    },
    [editable, saveLayout],
  )

  return (
    <section className={clsx(darkPanelLgClass, 'overflow-hidden')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 px-5 py-4 dark:border-neutral-700">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Kanvas dashboard</h2>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {editable
              ? 'Geser ikon ⋮⋮ atau sudut widget untuk mengatur tata letak. Area di bawah selalu bisa dipakai.'
              : 'Tampilan widget dashboard.'}
          </p>
        </div>
        {editable && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            <Bars3Icon className="size-3.5" aria-hidden />
            Grid 12 kolom
          </span>
        )}
      </div>

      <div
        className="analytics-dashboard-canvas relative overflow-x-auto overflow-y-visible bg-[linear-gradient(to_right,rgb(115_115_115/0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgb(115_115_115/0.08)_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,rgb(163_163_163/0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgb(163_163_163/0.1)_1px,transparent_1px)] dark:bg-neutral-950/40"
        style={{ minHeight: canvasHeight }}
      >
        <ReactGridLayout
          className="layout !min-h-full"
          layout={items}
          cols={12}
          rowHeight={ROW_HEIGHT}
          margin={MARGIN}
          containerPadding={PADDING}
          isDraggable={Boolean(editable)}
          isResizable={Boolean(editable)}
          compactType="vertical"
          preventCollision={false}
          onDragStop={persistLayout}
          onResizeStop={persistLayout}
          draggableHandle=".widget-drag-handle"
        >
          {widgets.map((w) => (
            <div key={w.id} className="analytics-widget-shell">
              <WidgetTile slug={slug} widget={w} editable={editable} inGrid />
            </div>
          ))}
        </ReactGridLayout>
      </div>
    </section>
  )
}
