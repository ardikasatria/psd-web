'use client'

import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import type { NbCell } from '@/lib/notebooks/editor/notebookModel'
import { NotebookOutputs } from './NotebookOutputs'

export function NotebookViewCell({ cell }: { cell: NbCell }) {
  if (cell.type === 'markdown') {
    if (!cell.source.trim()) return null
    return (
      <div className="nb-cell nb-cell--markdown nb-cell--readonly">
        <div className="nb-md">
          <SimpleMarkdown content={cell.source} className="prose prose-sm max-w-none dark:prose-invert" />
        </div>
      </div>
    )
  }

  const execLabel = cell.execution_count != null ? `[${cell.execution_count}]` : '[ ]'

  return (
    <div className="nb-cell nb-cell--code nb-cell--readonly">
      <div className="nb-cell__gutter">
        <span className="nb-count" aria-hidden>
          {execLabel}
        </span>
      </div>
      <div className="nb-cell__body">
        <pre className="nb-src nb-src--readonly">{cell.source}</pre>
        <NotebookOutputs outputs={cell.outputs} />
      </div>
    </div>
  )
}
