'use client'

import * as M from '@/lib/notebooks/editor/notebookModel'
import type { IpyNb } from '@/lib/notebooks/ipynb'
import { useMemo } from 'react'
import { NotebookViewCell } from './NotebookViewCell'
import './notebook-editor.css'

type Props = {
  title: string
  initialIpynb: IpyNb
}

export function NotebookViewer({ title, initialIpynb }: Props) {
  const nb = useMemo(() => M.fromIpynb(initialIpynb), [initialIpynb])

  return (
    <div className="nb-editor nb-viewer">
      <div className="nb-editor__sticky">
        <header className="nb-editor__header">
          <h1 className="nb-editor__title">{title}</h1>
        </header>
      </div>

      <div className="nb-cells">
        {nb.cells.length === 0 ? (
          <p className="nb-empty">Notebook ini belum memiliki sel.</p>
        ) : (
          nb.cells.map((cell) => <NotebookViewCell key={cell.id} cell={cell} />)
        )}
      </div>
    </div>
  )
}
