'use client'

import type { WidgetData, WidgetKind } from '@/types/api'
import ReactECharts from 'echarts-for-react'
import { useEffect, useMemo, useState } from 'react'

function EmptyState({ reason }: { reason?: string }) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 px-4 py-6 text-center dark:border-neutral-600 dark:bg-neutral-900/30">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Belum ada data</p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        {reason ?? 'Jalankan pipeline dulu untuk mengisi data.'}
      </p>
    </div>
  )
}

function useIsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setDark(root.classList.contains('dark'))
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

function chartTextColor(dark: boolean) {
  return dark ? '#a3a3a3' : '#737373'
}

function buildOptions(
  kind: WidgetKind,
  data: WidgetData,
  dark: boolean,
  options?: Record<string, unknown>,
): Record<string, unknown> | null {
  const text = chartTextColor(dark)
  const grid = { left: 48, right: 16, top: 24, bottom: 40, containLabel: true }

  if (kind === 'kpi') {
    return null
  }

  if (kind === 'table') {
    return null
  }

  if (kind === 'bar' || kind === 'line') {
    const points = (data.points as { x: unknown; y: unknown }[]) ?? []
    const categories = points.map((p) => String(p.x))
    const values = points.map((p) => Number(p.y) || 0)
    const base = {
      textStyle: { color: text },
      tooltip: { trigger: 'axis' },
      grid,
      xAxis: { type: 'category', data: categories, axisLabel: { color: text, rotate: categories.length > 6 ? 30 : 0 } },
      yAxis: { type: 'value', axisLabel: { color: text }, splitLine: { lineStyle: { color: dark ? '#404040' : '#e5e5e5' } } },
      ...(options ?? {}),
    }
    if (kind === 'line') {
      return {
        ...base,
        series: [{ type: 'line', data: values, smooth: true, areaStyle: { opacity: 0.12 } }],
      }
    }
    return {
      ...base,
      series: [{ type: 'bar', data: values, itemStyle: { borderRadius: [4, 4, 0, 0] } }],
    }
  }

  if (kind === 'pie') {
    const slices = (data.slices as { label: unknown; value: unknown }[]) ?? []
    return {
      textStyle: { color: text },
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: text } },
      series: [
        {
          type: 'pie',
          radius: ['40%', '68%'],
          data: slices.map((s) => ({ name: String(s.label), value: Number(s.value) || 0 })),
          label: { color: text },
        },
      ],
      ...(options ?? {}),
    }
  }

  if (kind === 'scatter') {
    const points = (data.points as { x: unknown; y: unknown }[]) ?? []
    return {
      textStyle: { color: text },
      tooltip: { trigger: 'item' },
      grid,
      xAxis: { type: 'value', axisLabel: { color: text }, splitLine: { lineStyle: { color: dark ? '#404040' : '#e5e5e5' } } },
      yAxis: { type: 'value', axisLabel: { color: text }, splitLine: { lineStyle: { color: dark ? '#404040' : '#e5e5e5' } } },
      series: [
        {
          type: 'scatter',
          data: points.map((p) => [Number(p.x) || 0, Number(p.y) || 0]),
          symbolSize: 10,
        },
      ],
      ...(options ?? {}),
    }
  }

  return null
}

function KpiView({ value, title }: { value: unknown; title?: string }) {
  const formatted =
    typeof value === 'number'
      ? value.toLocaleString('id-ID', { maximumFractionDigits: 2 })
      : String(value ?? '—')
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 py-4">
      <p className="text-4xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-50">{formatted}</p>
      {title && <p className="text-sm text-neutral-500 dark:text-neutral-400">{title}</p>}
    </div>
  )
}

function TableView({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return <EmptyState reason="Tabel kosong" />
  const cols = Object.keys(rows[0])
  return (
    <div className="max-h-64 overflow-auto">
      <table className="w-full min-w-[240px] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            {cols.map((c) => (
              <th key={c} className="px-2 py-1.5 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
              {cols.map((c) => (
                <td key={c} className="px-2 py-1.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                  {String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type Props = {
  kind: WidgetKind
  data: WidgetData | undefined
  options?: Record<string, unknown>
  title?: string
}

export function Chart({ kind, data, options, title }: Props) {
  const dark = useIsDark()

  const echartOptions = useMemo(() => {
    if (!data || data.empty) return null
    return buildOptions(kind, data, dark, options)
  }, [kind, data, dark, options])

  if (!data) {
    return (
      <div className="flex min-h-[140px] items-center justify-center">
        <div className="size-6 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
      </div>
    )
  }

  if (data.empty) {
    return <EmptyState reason={String(data.reason ?? '')} />
  }

  if (kind === 'kpi') {
    return <KpiView value={data.value} title={title} />
  }

  if (kind === 'table') {
    return <TableView rows={(data.rows as Record<string, unknown>[]) ?? []} />
  }

  if (!echartOptions) {
    return <EmptyState reason="Jenis widget tidak dikenal" />
  }

  return (
    <ReactECharts
      option={echartOptions}
      style={{ height: 220, width: '100%' }}
      notMerge
      opts={{ renderer: 'svg' }}
    />
  )
}
