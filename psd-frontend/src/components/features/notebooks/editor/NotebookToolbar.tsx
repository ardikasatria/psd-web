'use client'

import type { CellType } from '@/lib/notebooks/editor/notebookModel'
import type { KernelStatusValue } from '@/lib/notebooks/kernels/kernelInterface'
import clsx from 'clsx'

const STATUS_LABEL: Record<KernelStatusValue, string> = {
  starting: 'Menyalakan…',
  idle: 'Terhubung',
  busy: 'Menjalankan…',
  dead: 'Terputus',
}

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

const SAVE_LABEL: Record<SaveState, string> = {
  saved: 'Tersimpan',
  dirty: 'Belum disimpan',
  saving: 'Menyimpan…',
  error: 'Gagal menyimpan',
}

type Props = {
  runtime: 'browser' | 'server'
  kernelStatus: KernelStatusValue
  saveState: SaveState
  onSave: () => void
  onRunAll: () => void
  onAddCell: (type: CellType) => void
  onRestart: () => void
  onInterrupt: () => void
}

export function NotebookToolbar({
  runtime,
  kernelStatus,
  saveState,
  onSave,
  onRunAll,
  onAddCell,
  onRestart,
  onInterrupt,
}: Props) {
  const saveClass =
    saveState === 'error' ? 'nb-save--err' : saveState === 'dirty' || saveState === 'saving' ? 'nb-save--warn' : 'nb-save--ok'

  const isDirty = saveState === 'dirty' || saveState === 'error'

  return (
    <div className="nb-toolbar">
      <div className="nb-toolbar__left">
        <button
          type="button"
          className={clsx('nb-save-btn', isDirty && 'nb-save-btn--dirty')}
          onClick={onSave}
          disabled={saveState === 'saving'}
          title="Simpan notebook (Ctrl+S)"
        >
          {saveState === 'saving' ? 'Menyimpan…' : 'Simpan'}
        </button>

        <span className="nb-toolbar__sep" aria-hidden />

        <button type="button" className="nb-primary" onClick={onRunAll} disabled={kernelStatus === 'busy'}>
          ▶ Jalankan semua
        </button>
        <button type="button" onClick={onInterrupt} disabled={kernelStatus !== 'busy'}>
          ■ Hentikan
        </button>
        <button type="button" onClick={onRestart}>
          Mulai ulang
        </button>

        <span className="nb-toolbar__sep" aria-hidden />

        <button type="button" onClick={() => onAddCell('code')}>
          + Kode
        </button>
        <button type="button" onClick={() => onAddCell('markdown')}>
          + Teks
        </button>
      </div>

      <div className="nb-toolbar__right">
        <span className={`nb-runtime nb-runtime--${runtime}`}>
          {runtime === 'browser' ? 'Pyodide' : 'Server'}
        </span>
        <span className={`nb-status nb-status--${kernelStatus}`}>
          <i className="nb-dot" aria-hidden />
          {STATUS_LABEL[kernelStatus] || kernelStatus}
        </span>
        <span className={saveClass}>{SAVE_LABEL[saveState]}</span>
      </div>
    </div>
  )
}
