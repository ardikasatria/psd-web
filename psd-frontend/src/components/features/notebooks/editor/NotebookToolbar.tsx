'use client'

import type { CellType } from '@/lib/notebooks/editor/notebookModel'
import type { KernelStatusValue } from '@/lib/notebooks/kernels/kernelInterface'

const STATUS_LABEL: Record<KernelStatusValue, string> = {
  starting: 'Menyalakan kernel…',
  idle: 'Siap',
  busy: 'Menjalankan…',
  dead: 'Kernel mati',
}

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

const SAVE_LABEL: Record<SaveState, string> = {
  saved: 'Tersimpan',
  dirty: 'Belum tersimpan',
  saving: 'Menyimpan…',
  error: 'Gagal menyimpan — coba lagi',
}

type Props = {
  runtime: 'browser' | 'server'
  kernelStatus: KernelStatusValue
  saveState: SaveState
  onRunAll: () => void
  onAddCell: (type: CellType) => void
  onRestart: () => void
  onInterrupt: () => void
}

export function NotebookToolbar({
  runtime,
  kernelStatus,
  saveState,
  onRunAll,
  onAddCell,
  onRestart,
  onInterrupt,
}: Props) {
  const saveClass =
    saveState === 'error' ? 'nb-save--err' : saveState === 'dirty' || saveState === 'saving' ? 'nb-save--warn' : 'nb-save--ok'

  return (
    <div className="nb-toolbar">
      <div className="nb-toolbar__left">
        <button type="button" className="nb-primary" onClick={onRunAll} disabled={kernelStatus === 'busy'}>
          Jalankan semua
        </button>
        <button type="button" onClick={() => onAddCell('code')}>
          + Kode
        </button>
        <button type="button" onClick={() => onAddCell('markdown')}>
          + Teks
        </button>
        <button type="button" onClick={onInterrupt} disabled={kernelStatus !== 'busy'}>
          Hentikan
        </button>
        <button type="button" onClick={onRestart}>
          Mulai ulang kernel
        </button>
      </div>

      <div className="nb-toolbar__right">
        <span className={`nb-runtime nb-runtime--${runtime}`}>
          {runtime === 'browser' ? 'Browser (Pyodide)' : 'Kernel server'}
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
