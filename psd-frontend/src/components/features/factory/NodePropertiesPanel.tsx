'use client'

import { NodeHelpPanel } from '@/components/features/factory/NodeHelpPanel'
import { upstreamColumnOptions, validateDeriveExpr } from '@/lib/factory/columnInference'
import type { PsdNodeData } from '@/lib/factory/specFlow'
import type { DataSource, PipelineNode, PipelineSpec } from '@/types/api'
import { Button } from '@/shared/Button'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { TrashIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

const selectClass =
  'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100'

const FILTER_OPS = ['=', '!=', '>', '<', '>=', '<=', 'in', 'contains'] as const

type Props = {
  nodeId: string | null
  spec: PipelineSpec
  columnsByNode: Record<string, string[]>
  sources: DataSource[]
  onUpdate: (nodeId: string, patch: Partial<PsdNodeData>) => void
  onDelete?: (nodeId: string) => void
  className?: string
}

function ColumnMultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <Field>
      <Label>{label}</Label>
      <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-neutral-200 p-2 dark:border-neutral-600">
        {options.length === 0 && <p className="text-xs text-neutral-500">Pilih sumber / sambung node hulu.</p>}
        {options.map((col) => (
          <label key={col} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={value.includes(col)}
              onChange={(e) => {
                onChange(e.target.checked ? [...value, col] : value.filter((c) => c !== col))
              }}
              className="rounded border-neutral-300 dark:border-neutral-600"
            />
            {col}
          </label>
        ))}
      </div>
    </Field>
  )
}

export function NodePropertiesPanel({ nodeId, spec, columnsByNode, sources, onUpdate, onDelete, className }: Props) {
  if (!nodeId) {
    return (
      <aside
        className={clsx(
          'w-full shrink-0 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-4 dark:border-neutral-600 dark:bg-neutral-900/30 xl:w-72',
          className,
        )}
      >
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Pilih node di kanvas untuk mengedit properti.</p>
      </aside>
    )
  }

  const node = spec.nodes.find((n) => n.id === nodeId)
  if (!node) return null

  const data: PsdNodeData = {
    kind: node.type,
    op: node.op,
    layer: node.layer,
    params: (node.params ?? {}) as Record<string, unknown>,
  }

  const patchParams = (params: Record<string, unknown>) => {
    onUpdate(nodeId, { params: { ...data.params, ...params } })
  }

  const patch = (partial: Partial<PsdNodeData>) => onUpdate(nodeId, partial)

  const upstream = upstreamColumnOptions(nodeId, spec, columnsByNode)
  const singleCols = upstream.single
  const joinLeft = upstream.left
  const joinRight = upstream.right

  return (
    <aside
      className={clsx(
        'w-full shrink-0 space-y-4 overflow-y-auto rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800 xl:w-72',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-neutral-500">{nodeId}</p>
          <h3 className="text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-100">
            {node.type}{node.op ? ` · ${node.op}` : ''}
          </h3>
        </div>
        {onDelete && (
          <Button
            type="button"
            outline
            className="!px-2 !py-1.5 text-red-600 hover:border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:border-red-900 dark:hover:bg-red-950/30"
            onClick={() => onDelete(nodeId)}
            title="Hapus node (Del / Backspace)"
          >
            <TrashIcon className="size-4" aria-hidden />
            <span className="sr-only">Hapus node</span>
          </Button>
        )}
      </div>

      <NodeHelpPanel kind={node.type} op={node.op} />

      {upstream.single.length > 0 && node.type !== 'source' && (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          Kolom hulu: {upstream.single.slice(0, 8).join(', ')}
          {upstream.single.length > 8 ? ` +${upstream.single.length - 8}` : ''}
        </p>
      )}

      <Field>
        <Label>Lapisan</Label>
        <select
          value={data.layer ?? ''}
          onChange={(e) => patch({ layer: (e.target.value || null) as PipelineNode['layer'] })}
          className={selectClass}
        >
          <option value="">— none —</option>
          <option value="bronze">bronze</option>
          <option value="silver">silver</option>
          <option value="gold">gold</option>
        </select>
      </Field>

      {data.kind === 'source' && (
        <Field>
          <Label>Sumber data</Label>
          <select
            value={String(data.params.source_id ?? '')}
            onChange={(e) => patchParams({ source_id: e.target.value })}
            className={selectClass}
          >
            <option value="">— pilih sumber —</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {data.kind === 'transform' && data.op === 'select' && (
        <ColumnMultiSelect
          label="Kolom"
          options={singleCols}
          value={(data.params.columns as string[] | undefined) ?? []}
          onChange={(columns) => patchParams({ columns })}
        />
      )}

      {data.kind === 'transform' && data.op === 'filter' && (
        <>
          <Field>
            <Label>Kolom</Label>
            <select
              value={String(data.params.column ?? data.params.col ?? '')}
              onChange={(e) => patchParams({ column: e.target.value, col: e.target.value })}
              className={selectClass}
            >
              <option value="">—</option>
              {singleCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label>Operator</Label>
            <select
              value={String(data.params.op ?? '=')}
              onChange={(e) => patchParams({ op: e.target.value })}
              className={selectClass}
            >
              {FILTER_OPS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label>Nilai</Label>
            <Input value={String(data.params.value ?? '')} onChange={(e) => patchParams({ value: e.target.value })} />
          </Field>
        </>
      )}

      {data.kind === 'transform' && data.op === 'join' && (
        <>
          <Field>
            <Label>How</Label>
            <select
              value={String(data.params.how ?? 'inner')}
              onChange={(e) => patchParams({ how: e.target.value })}
              className={selectClass}
            >
              <option value="inner">inner</option>
              <option value="left">left</option>
            </select>
          </Field>
          <Field>
            <Label>left_on</Label>
            <select
              value={String(data.params.left_on ?? '')}
              onChange={(e) => patchParams({ left_on: e.target.value })}
              className={selectClass}
            >
              <option value="">—</option>
              {joinLeft.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label>right_on</Label>
            <select
              value={String(data.params.right_on ?? '')}
              onChange={(e) => patchParams({ right_on: e.target.value })}
              className={selectClass}
            >
              <option value="">—</option>
              {joinRight.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      {data.kind === 'transform' && data.op === 'derive' && (
        <>
          <Field>
            <Label>Nama kolom baru</Label>
            <Input value={String(data.params.name ?? '')} onChange={(e) => patchParams({ name: e.target.value })} />
          </Field>
          <Field>
            <Label>Ekspresi</Label>
            <Input value={String(data.params.expr ?? '')} onChange={(e) => patchParams({ expr: e.target.value })} />
            {validateDeriveExpr(String(data.params.expr ?? ''), singleCols) && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                {validateDeriveExpr(String(data.params.expr ?? ''), singleCols)}
              </p>
            )}
          </Field>
        </>
      )}

      {data.kind === 'transform' && data.op === 'dedupe' && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Dedupe tidak membutuhkan parameter tambahan.</p>
      )}

      {data.kind === 'transform' && data.op === 'aggregate' && (
        <>
          <ColumnMultiSelect
            label="Group by"
            options={singleCols}
            value={(data.params.group_by as string[] | undefined) ?? []}
            onChange={(group_by) => patchParams({ group_by })}
          />
          <Field>
            <Label>Agregasi (kolom)</Label>
            <select
              value={String((data.params.aggs as { col?: string }[])?.[0]?.col ?? '')}
              onChange={(e) =>
                patchParams({
                  aggs: [{ col: e.target.value, fn: 'sum', as: `sum_${e.target.value}` }],
                })
              }
              className={selectClass}
            >
              <option value="">—</option>
              {singleCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      {data.kind === 'transform' && data.op === 'cast' && (
        <Field>
          <Label>Cast kolom → tipe</Label>
          <select
            value={String((data.params.casts as { col?: string }[])?.[0]?.col ?? '')}
            onChange={(e) =>
              patchParams({
                casts: [{ col: e.target.value, to: 'double' }],
              })
            }
            className={selectClass}
          >
            <option value="">—</option>
            {singleCols.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      )}

      {data.kind === 'transform' && data.op === 'sql' && (
        <Field>
          <Label>SQL (SELECT-only)</Label>
          <textarea
            value={String(data.params.query ?? '')}
            onChange={(e) => patchParams({ query: e.target.value })}
            rows={8}
            className={`${selectClass} font-mono text-xs`}
            placeholder="SELECT kolom FROM upstream_node_id"
          />
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Hanya SELECT. Nama tabel = id node upstream. Tier menengah+ diperlukan.
          </p>
        </Field>
      )}

      {data.kind === 'transform' && data.op === 'pyspark' && (
        <Field>
          <Label>Kode PySpark</Label>
          <textarea
            value={String(data.params.code ?? '')}
            onChange={(e) => patchParams({ code: e.target.value })}
            rows={10}
            className={`${selectClass} font-mono text-xs`}
          />
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Berjalan di lingkungan terisolasi. Butuh tier Lanjut & akses kernel.
          </p>
        </Field>
      )}

      {data.kind === 'sink' && (
        <Field>
          <Label>Format</Label>
          <select
            value={String(data.params.format ?? 'parquet')}
            onChange={(e) => patchParams({ format: e.target.value })}
            className={selectClass}
          >
            <option value="parquet">parquet</option>
          </select>
        </Field>
      )}

      {onDelete && (
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
          Tip: pilih node di kanvas lalu tekan Del atau Backspace untuk menghapus.
        </p>
      )}
    </aside>
  )
}
