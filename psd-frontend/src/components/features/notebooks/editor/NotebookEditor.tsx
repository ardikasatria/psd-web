'use client'

import * as M from '@/lib/notebooks/editor/notebookModel'
import type { CellType } from '@/lib/notebooks/editor/notebookModel'
import type { IpyNb } from '@/lib/notebooks/ipynb'
import type { NotebookKernel } from '@/lib/notebooks/kernels/kernelInterface'
import { KernelStatus } from '@/lib/notebooks/kernels/kernelInterface'
import { createNotebookAutosave } from '@/lib/notebooks/persistence'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NotebookCell } from './NotebookCell'
import { NotebookToolbar } from './NotebookToolbar'
import './notebook-editor.css'

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

type Props = {
  title: string
  notebookId: string
  initialIpynb: IpyNb
  kernel: NotebookKernel | null
  runtime?: 'browser' | 'server'
}

export function NotebookEditor({
  title,
  notebookId,
  initialIpynb,
  kernel,
  runtime = 'browser',
}: Props) {
  const [nb, setNb] = useState(() => M.fromIpynb(initialIpynb))
  const [kernelStatus, setKernelStatus] = useState(kernel?.status ?? KernelStatus.STARTING)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')

  const autosave = useMemo(() => createNotebookAutosave(notebookId), [notebookId])
  const first = useRef(true)
  const nbRef = useRef(nb)
  nbRef.current = nb

  const persist = useCallback(() => {
    setSaveState('saving')
    return autosave
      .flush()
      .then(() => setSaveState('saved'))
      .catch(() => setSaveState('error'))
  }, [autosave])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setSaveState('dirty')
    autosave.schedule(M.toIpynb(nbRef.current) as IpyNb)
  }, [nb, autosave])

  useEffect(() => {
    if (!kernel?.onStatus) return
    return kernel.onStatus(setKernelStatus)
  }, [kernel])

  useEffect(() => {
    const onLeave = () => {
      if (saveState === 'dirty') void autosave.flush()
    }
    window.addEventListener('beforeunload', onLeave)
    return () => {
      window.removeEventListener('beforeunload', onLeave)
      onLeave()
    }
  }, [autosave, saveState])

  const runCell = async (id: string, advance = false) => {
    if (!kernel) return
    const cell = nbRef.current.cells.find((c) => c.id === id)
    if (!cell || cell.type !== 'code') return
    setRunningId(id)
    try {
      const { outputs, execution_count } = await kernel.execute(cell.source)
      setNb((cur) => M.setCellResult(cur, id, { outputs, execution_count }))
      if (advance) {
        const idx = nbRef.current.cells.findIndex((c) => c.id === id)
        const next = nbRef.current.cells[idx + 1]
        if (!next) {
          setNb((cur) => M.addCell(cur, { type: 'code', index: idx + 1 }))
        }
      }
    } finally {
      setRunningId(null)
    }
  }

  const runAll = async () => {
    for (const c of nbRef.current.cells) {
      if (c.type === 'code') await runCell(c.id)
    }
  }

  const addCellAt = (type: CellType, index: number) => {
    setNb((cur) => M.addCell(cur, { type, index }))
  }

  return (
    <div className="nb-editor">
      <div className="nb-editor__header">
        <p className="nb-editor__subtitle">Notebook PSD · Editor sel</p>
        <h1 className="nb-editor__title">{title}</h1>
      </div>

      <NotebookToolbar
        runtime={runtime}
        kernelStatus={kernelStatus}
        saveState={saveState}
        onRunAll={() => void runAll()}
        onAddCell={(type) => setNb((cur) => M.addCell(cur, { type }))}
        onRestart={async () => {
          await kernel?.restart?.()
          setNb((cur) => ({
            ...cur,
            cells: cur.cells.map((c) => ({ ...c, outputs: [], execution_count: null })),
          }))
        }}
        onInterrupt={() => void kernel?.interrupt?.()}
      />

      <div className="nb-cells">
        {nb.cells.map((cell, idx) => (
          <div key={cell.id}>
            {idx === 0 && (
              <div className="nb-cell-insert">
                <button type="button" onClick={() => addCellAt('code', 0)}>
                  + sel di atas
                </button>
              </div>
            )}
            <NotebookCell
              cell={cell}
              isRunning={runningId === cell.id}
              onChangeSource={(s) => setNb((cur) => M.setCellSource(cur, cell.id, s))}
              onRun={() => void runCell(cell.id)}
              onRunAndAdvance={() => void runCell(cell.id, true)}
              onDelete={() => setNb((cur) => M.deleteCell(cur, cell.id))}
              onMove={(dir) => setNb((cur) => M.moveCell(cur, cell.id, dir))}
              onToggleType={() =>
                setNb((cur) => M.changeCellType(cur, cell.id, cell.type === 'code' ? 'markdown' : 'code'))
              }
              onAddBelow={(type) => addCellAt(type, idx + 1)}
            />
            <div className="nb-cell-insert">
              <button type="button" onClick={() => addCellAt('code', idx + 1)}>
                + sel kode
              </button>
              <button type="button" onClick={() => addCellAt('markdown', idx + 1)}>
                + sel teks
              </button>
            </div>
          </div>
        ))}
      </div>

      {saveState === 'error' && (
        <div className="px-4 pb-6 text-center">
          <button type="button" className="nb-primary rounded-lg px-4 py-2 text-sm" onClick={() => void persist()}>
            Coba simpan lagi
          </button>
        </div>
      )}
    </div>
  )
}
