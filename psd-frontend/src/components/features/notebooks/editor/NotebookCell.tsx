'use client'

import { useState } from 'react'
import type { CellType, NbCell } from '@/lib/notebooks/editor/notebookModel'
import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { NotebookOutputs } from './NotebookOutputs'

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

  return (
    <div className={`nb-cell nb-cell--${cell.type}${isRunning ? ' nb-cell--running' : ''}`}>
      <div className="nb-cell__gutter">
        <button
          type="button"
          className="nb-run"
          title="Jalankan sel (Ctrl+Enter)"
          onClick={onRun}
          disabled={isRunning || isMd}
          aria-label="Jalankan sel"
        >
          {isRunning ? '…' : '▶'}
        </button>
        <span className="nb-count">{cell.type === 'code' ? `[${cell.execution_count ?? ' '}]` : ''}</span>
      </div>

      <div className="nb-cell__body">
        {isMd && previewMd ? (
          <div
            className="nb-md"
            onDoubleClick={() => setPreviewMd(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setPreviewMd(false)}
          >
            {cell.source ? (
              <SimpleMarkdown content={cell.source} className="prose-sm max-w-none dark:prose-invert" />
            ) : (
              <p className="nb-md-hint">Sel markdown kosong — klik dua kali untuk menyunting.</p>
            )}
          </div>
        ) : (
          <textarea
            className="nb-src"
            value={cell.source}
            spellCheck={false}
            rows={lines}
            onChange={(e) => onChangeSource(e.target.value)}
            onBlur={() => isMd && setPreviewMd(true)}
            onKeyDown={handleKeyDown}
            placeholder={isMd ? 'Tulis markdown…' : 'Tulis kode Python… (Shift+Enter jalankan & lanjut)'}
            aria-label={isMd ? 'Sumber markdown' : 'Sumber kode Python'}
          />
        )}
        {cell.type === 'code' && <NotebookOutputs outputs={cell.outputs} />}
      </div>

      <div className="nb-cell__actions">
        <button type="button" onClick={() => onMove('up')} title="Naikkan" aria-label="Naikkan sel">
          ↑
        </button>
        <button type="button" onClick={() => onMove('down')} title="Turunkan" aria-label="Turunkan sel">
          ↓
        </button>
        <button type="button" onClick={onToggleType} title="Ganti tipe">
          {isMd ? 'Kode' : 'Teks'}
        </button>
        {isMd && (
          <button type="button" onClick={() => setPreviewMd((p) => !p)} title="Pratinjau / sunting">
            {previewMd ? 'Edit' : '👁'}
          </button>
        )}
        {onAddBelow && (
          <button type="button" onClick={() => onAddBelow('code')} title="Tambah sel di bawah">
            +
          </button>
        )}
        <button type="button" onClick={onDelete} title="Hapus sel" className="nb-danger" aria-label="Hapus sel">
          ✕
        </button>
      </div>
    </div>
  )
}
