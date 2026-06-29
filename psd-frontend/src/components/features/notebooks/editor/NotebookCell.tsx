'use client'

import { useState } from 'react'
import type { CellType, NbCell } from '@/lib/notebooks/editor/notebookModel'
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { NotebookOutputs } from './NotebookOutputs'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowPathIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/20/solid'
import clsx from 'clsx'

type Props = {
  cell: NbCell
  isRunning: boolean
  onChangeSource: (s: string) => void
  onRun: () => void
  onDelete: () => void
  onMove: (dir: 'up' | 'down') => void
  onToggleType: () => void
  onRunAndAdvance?: () => void
  onAddBelow?: (type: CellType) => void
}

export function NotebookCell({
  cell,
  isRunning,
  onChangeSource,
  onRun,
  onDelete,
  onMove,
  onToggleType,
  onRunAndAdvance,
  onAddBelow,
}: Props) {
  const [previewMd, setPreviewMd] = useState(cell.type === 'markdown')
  const isMd = cell.type === 'markdown'
  const lines = Math.max(2, cell.source.split('\n').length)
  const execLabel = cell.execution_count != null ? `[${cell.execution_count}]` : '[ ]'

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (cell.type !== 'code') return
    const mod = e.metaKey || e.ctrlKey
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      onRunAndAdvance?.()
    } else if (e.key === 'Enter' && mod) {
      e.preventDefault()
      onRun()
    }
  }

  if (isMd) {
    return (
      <div className="nb-cell nb-cell--markdown">
        <div className="nb-cell__toolbar" role="toolbar" aria-label="Aksi sel">
          <button type="button" onClick={() => onMove('up')} title="Naikkan" aria-label="Naikkan sel">
            <ArrowUpIcon className="size-4" />
          </button>
          <button type="button" onClick={() => onMove('down')} title="Turunkan" aria-label="Turunkan sel">
            <ArrowDownIcon className="size-4" />
          </button>
          <button type="button" onClick={onToggleType} title="Ubah ke sel kode">
            {'</>'}
          </button>
          {previewMd ? (
            <button type="button" onClick={() => setPreviewMd(false)} title="Sunting">
              ✎
            </button>
          ) : (
            <button type="button" onClick={() => setPreviewMd(true)} title="Pratinjau">
              👁
            </button>
          )}
          {onAddBelow && (
            <button type="button" onClick={() => onAddBelow('markdown')} title="Tambah sel di bawah">
              <PlusIcon className="size-4" />
            </button>
          )}
          <button type="button" onClick={onDelete} title="Hapus sel" className="nb-danger" aria-label="Hapus sel">
            <TrashIcon className="size-4" />
          </button>
        </div>

        {previewMd ? (
          <div
            className="nb-md"
            onDoubleClick={() => setPreviewMd(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setPreviewMd(false)}
          >
            {cell.source ? (
              <SimpleMarkdown content={cell.source} className="prose prose-sm max-w-none dark:prose-invert" />
            ) : (
              <p className="nb-md-hint">Klik dua kali untuk menulis teks…</p>
            )}
          </div>
        ) : (
          <textarea
            className="nb-src"
            value={cell.source}
            spellCheck={false}
            rows={lines}
            autoFocus
            onChange={(e) => onChangeSource(e.target.value)}
            onBlur={() => setPreviewMd(true)}
            placeholder="Tulis markdown…"
            aria-label="Sumber markdown"
          />
        )}
      </div>
    )
  }

  return (
    <div className={clsx('nb-cell nb-cell--code', isRunning && 'nb-cell--running')}>
      <div className="nb-cell__gutter">
        <button
          type="button"
          className={clsx('nb-run', isRunning && 'nb-run--spin')}
          title="Jalankan sel (Ctrl+Enter)"
          onClick={onRun}
          disabled={isRunning}
          aria-label="Jalankan sel"
        >
          {isRunning ? (
            <ArrowPathIcon className="size-5" aria-hidden />
          ) : (
            <PlayIcon className="size-5" aria-hidden />
          )}
        </button>
        <span className="nb-count" aria-hidden>
          {execLabel}
        </span>
      </div>

      <div className="nb-cell__body">
        <div className="nb-cell__toolbar" role="toolbar" aria-label="Aksi sel">
          <button type="button" onClick={() => onMove('up')} title="Naikkan" aria-label="Naikkan sel">
            <ArrowUpIcon className="size-4" />
          </button>
          <button type="button" onClick={() => onMove('down')} title="Turunkan" aria-label="Turunkan sel">
            <ArrowDownIcon className="size-4" />
          </button>
          <button type="button" onClick={onToggleType} title="Ubah ke sel teks">
            Md
          </button>
          {onAddBelow && (
            <button type="button" onClick={() => onAddBelow('code')} title="Tambah sel di bawah">
              <PlusIcon className="size-4" />
            </button>
          )}
          <button type="button" onClick={onDelete} title="Hapus sel" className="nb-danger" aria-label="Hapus sel">
            <TrashIcon className="size-4" />
          </button>
        </div>

        <textarea
          className="nb-src"
          value={cell.source}
          spellCheck={false}
          rows={lines}
          onChange={(e) => onChangeSource(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="# Tulis kode Python…  (Shift+Enter jalankan & lanjut)"
          aria-label="Sumber kode Python"
        />
        <NotebookOutputs outputs={cell.outputs} />
      </div>
    </div>
  )
}
