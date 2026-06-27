'use client'

import { addWidget } from '@/lib/api/dashboards'
import { GOLD_COLUMN_HINTS, fetchGoldNodes, type GoldNode } from '@/lib/analytics/pipelineGold'
import type { WidgetKind } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const selectClass =
  'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100'

const KINDS: { value: WidgetKind; label: string }[] = [
  { value: 'kpi', label: 'KPI (angka tunggal)' },
  { value: 'table', label: 'Tabel' },
  { value: 'bar', label: 'Bar chart' },
  { value: 'line', label: 'Line chart' },
  { value: 'pie', label: 'Pie chart' },
  { value: 'scatter', label: 'Scatter plot' },
]

const AGGS = ['sum', 'avg', 'count', 'min', 'max'] as const

type Props = {
  open: boolean
  onClose: () => void
  dashboardSlug: string
  pipelineId?: string | null
}

export function AddWidgetDialog({ open, onClose, dashboardSlug, pipelineId }: Props) {
  const qc = useQueryClient()
  const [kind, setKind] = useState<WidgetKind>('kpi')
  const [title, setTitle] = useState('')
  const [node, setNode] = useState('')
  const [xCol, setXCol] = useState('kategori')
  const [yCol, setYCol] = useState('rating')
  const [labelCol, setLabelCol] = useState('kategori')
  const [valueCol, setValueCol] = useState('rating')
  const [columns, setColumns] = useState('rating,text,kategori')
  const [agg, setAgg] = useState<(typeof AGGS)[number]>('sum')
  const [limit, setLimit] = useState('100')
  const [error, setError] = useState<string | null>(null)

  const goldNodes = useQuery({
    queryKey: ['pipeline-gold-nodes', pipelineId],
    queryFn: () => fetchGoldNodes(pipelineId),
    enabled: open && Boolean(pipelineId),
  })

  const nodes = goldNodes.data ?? []

  useEffect(() => {
    if (nodes.length && !node) setNode(nodes[0].node)
  }, [nodes, node])

  const mutation = useMutation({
    mutationFn: () => {
      const query: Record<string, unknown> = { node: node.trim(), limit: Number(limit) || 100 }
      if (kind === 'kpi') {
        query.y = yCol.trim()
        query.agg = agg
      } else if (kind === 'table') {
        query.columns = columns.split(',').map((c) => c.trim()).filter(Boolean)
      } else if (kind === 'pie') {
        query.label = labelCol.trim()
        query.value = valueCol.trim()
        query.agg = agg
      } else if (kind === 'scatter') {
        query.x = xCol.trim()
        query.y = yCol.trim()
      } else {
        query.x = xCol.trim()
        query.y = yCol.trim()
        query.agg = agg
      }
      return addWidget(dashboardSlug, { kind, title: title.trim(), query })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics-dashboard', dashboardSlug] })
      handleClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleClose() {
    setTitle('')
    setError(null)
    onClose()
  }

  const needsXY = kind === 'line' || kind === 'bar' || kind === 'scatter'
  const needsAgg = kind === 'kpi' || kind === 'line' || kind === 'bar' || kind === 'pie'

  return (
    <Dialog open={open} onClose={handleClose} size="md">
      <DialogTitle>Tambah widget</DialogTitle>
      <DialogBody className="space-y-4">
        <Field>
          <Label>Jenis widget</Label>
          <select value={kind} onChange={(e) => setKind(e.target.value as WidgetKind)} className={selectClass}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <Label>Judul widget</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Total rating" />
        </Field>
        <Field>
          <Label>Node gold (run terbaru)</Label>
          {goldNodes.isLoading ? (
            <p className="text-sm text-neutral-500">Memuat node gold…</p>
          ) : nodes.length ? (
            <select value={node} onChange={(e) => setNode(e.target.value)} className={selectClass}>
              {nodes.map((n: GoldNode) => (
                <option key={n.node} value={n.node}>
                  {n.node} ({n.rows.toLocaleString('id-ID')} baris)
                </option>
              ))}
            </select>
          ) : (
            <>
              <Input value={node} onChange={(e) => setNode(e.target.value)} placeholder="sink1" />
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Belum ada run gold — jalankan pipeline dulu, atau ketik id node sink manual.
              </p>
            </>
          )}
        </Field>
        {kind === 'table' && (
          <Field>
            <Label>Kolom (pisahkan koma)</Label>
            <Input value={columns} onChange={(e) => setColumns(e.target.value)} placeholder="rating,text,kategori" />
          </Field>
        )}
        {kind === 'pie' && (
          <>
            <Field>
              <Label>Kolom label</Label>
              <Input list="gold-columns" value={labelCol} onChange={(e) => setLabelCol(e.target.value)} />
            </Field>
            <Field>
              <Label>Kolom nilai</Label>
              <Input list="gold-columns" value={valueCol} onChange={(e) => setValueCol(e.target.value)} />
            </Field>
          </>
        )}
        {needsXY && (
          <Field>
            <Label>Kolom X</Label>
            <Input list="gold-columns" value={xCol} onChange={(e) => setXCol(e.target.value)} placeholder="kategori" />
          </Field>
        )}
        {(kind === 'kpi' || needsXY) && (
          <Field>
            <Label>Kolom Y</Label>
            <Input list="gold-columns" value={yCol} onChange={(e) => setYCol(e.target.value)} placeholder="rating" />
          </Field>
        )}
        <datalist id="gold-columns">
          {GOLD_COLUMN_HINTS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {needsAgg && (
          <Field>
            <Label>Agregasi</Label>
            <select value={agg} onChange={(e) => setAgg(e.target.value as (typeof AGGS)[number])} className={selectClass}>
              {AGGS.map((a) => (
                <option key={a} value={a}>
                  {a.toUpperCase()}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field>
          <Label>Limit baris</Label>
          <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} min={1} max={5000} />
        </Field>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </DialogBody>
      <DialogActions>
        <Button type="button" plain onClick={handleClose}>
          Batal
        </Button>
        <ButtonPrimary type="button" disabled={mutation.isPending || !node.trim()} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Menambah…' : 'Tambah widget'}
        </ButtonPrimary>
      </DialogActions>
    </Dialog>
  )
}
