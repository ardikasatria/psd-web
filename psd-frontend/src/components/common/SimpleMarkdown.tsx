'use client'

import clsx from 'clsx'

/** Render markdown ringkas (paragraf & heading sederhana) untuk Fase 0. */
export function SimpleMarkdown({ content, className }: { content: string; className?: string }) {
  const blocks = content.split(/\n\n+/).filter(Boolean)

  return (
    <div className={clsx('space-y-3 text-sm leading-relaxed', className)}>
      {blocks.map((block, i) => {
        const trimmed = block.trim()
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={i} className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {trimmed.slice(3)}
            </h3>
          )
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={i} className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {trimmed.slice(2)}
            </h2>
          )
        }
        const html = trimmed
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary-600 hover:underline dark:text-primary-400">$1</a>')
        return (
          <div
            key={i}
            className="break-words text-neutral-600 [overflow-wrap:anywhere] dark:text-neutral-400"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      })}
    </div>
  )
}
