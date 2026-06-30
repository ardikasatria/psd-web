'use client'

import clsx from 'clsx'

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="text-primary-600 hover:underline dark:text-primary-400">$1</a>',
    )
}

/** Render markdown ringkas — mempertahankan baris baru tunggal seperti di file asli. */
export function SimpleMarkdown({ content, className }: { content: string; className?: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const elements: React.ReactNode[] = []
  let paragraphLines: string[] = []
  let listItems: string[] = []
  let key = 0

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    elements.push(
      <div
        key={key++}
        className="break-words text-neutral-600 [overflow-wrap:anywhere] dark:text-neutral-400"
        dangerouslySetInnerHTML={{
          __html: paragraphLines.map((line) => formatInline(line)).join('<br />'),
        }}
      />,
    )
    paragraphLines = []
  }

  const flushList = () => {
    if (listItems.length === 0) return
    elements.push(
      <ul key={key++} className="list-disc space-y-1 ps-5 text-neutral-600 dark:text-neutral-400">
        {listItems.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
        ))}
      </ul>,
    )
    listItems = []
  }

  const flush = () => {
    flushList()
    flushParagraph()
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flush()
      continue
    }
    if (trimmed.startsWith('### ')) {
      flush()
      elements.push(
        <h4 key={key++} className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {trimmed.slice(4)}
        </h4>,
      )
      continue
    }
    if (trimmed.startsWith('## ')) {
      flush()
      elements.push(
        <h3 key={key++} className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {trimmed.slice(3)}
        </h3>,
      )
      continue
    }
    if (trimmed.startsWith('# ')) {
      flush()
      elements.push(
        <h2 key={key++} className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {trimmed.slice(2)}
        </h2>,
      )
      continue
    }
    const listMatch = trimmed.match(/^[-*]\s+(.+)/)
    if (listMatch) {
      flushParagraph()
      listItems.push(listMatch[1])
      continue
    }
    flushList()
    paragraphLines.push(trimmed)
  }

  flush()

  return (
    <div className={clsx('space-y-3 text-sm leading-relaxed', className)}>
      {elements}
    </div>
  )
}
