'use client'

import clsx from 'clsx'
import { useCallback, useState } from 'react'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      type="button"
      onClick={copy}
      className="absolute top-2 right-2 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 shadow-sm hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
    >
      {copied ? 'Tersalin' : 'Salin'}
    </button>
  )
}

function inlineHtml(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-neutral-100 px-1 py-0.5 text-xs dark:bg-neutral-800">$1</code>')
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="font-medium text-primary-600 hover:underline dark:text-primary-400">$1</a>'
    )
}

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'callout'; variant: 'info' | 'tip' | 'warning'; text: string }

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const parseRow = (row: string) =>
        row
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim())
      const headers = parseRow(trimmed)
      const sep = lines[i + 1]?.trim() ?? ''
      if (/^\|[-:|\s]+\|$/.test(sep)) {
        i += 2
        const rows: string[][] = []
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          rows.push(parseRow(lines[i].trim()))
          i++
        }
        blocks.push({ type: 'table', headers, rows })
        continue
      }
    }

    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') })
      i++
      continue
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4) })
      i++
      continue
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3) })
      i++
      continue
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2) })
      i++
      continue
    }

    if (trimmed.startsWith('> ')) {
      let calloutText = trimmed.slice(2)
      let variant: 'info' | 'tip' | 'warning' = 'info'
      if (/^(\*\*)?(Tip|Tips)/i.test(calloutText)) variant = 'tip'
      if (/^(\*\*)?(Peringatan|Waspada)/i.test(calloutText)) variant = 'warning'
      i++
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        calloutText += ' ' + lines[i].trim().slice(2)
        i++
      }
      blocks.push({ type: 'callout', variant, text: calloutText.replace(/^\*\*(Tip|Tips|Peringatan|Catatan|Info)\*\*:?\s*/i, '') })
      continue
    }

    if (/^[-*]\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    const paraLines = [trimmed]
    i++
    while (i < lines.length) {
      const next = lines[i].trim()
      if (!next || next.startsWith('#') || next.startsWith('```') || next.startsWith('> ') || /^[-*]\s/.test(next) || /^\d+\.\s/.test(next)) {
        break
      }
      paraLines.push(next)
      i++
    }
    blocks.push({ type: 'p', text: paraLines.join(' ') })
  }

  return blocks
}

const calloutStyles = {
  info: 'border-primary-200 bg-primary-50 text-primary-950 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-100',
  tip: 'border-green-200 bg-green-50 text-green-950 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100',
}

export function HelpMarkdown({ content, className }: { content: string; className?: string }) {
  const blocks = parseBlocks(content)

  return (
    <div className={clsx('space-y-4 text-sm leading-relaxed', className)}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h1':
            return (
              <h2 key={i} className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {block.text}
              </h2>
            )
          case 'h2':
            return (
              <h3 key={i} className="mt-6 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {block.text}
              </h3>
            )
          case 'h3':
            return (
              <h4 key={i} className="mt-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {block.text}
              </h4>
            )
          case 'p':
            return (
              <p
                key={i}
                className="text-neutral-600 dark:text-neutral-400"
                dangerouslySetInnerHTML={{ __html: inlineHtml(block.text) }}
              />
            )
          case 'ul':
            return (
              <ul key={i} className="list-disc space-y-2 ps-5 text-neutral-600 dark:text-neutral-400">
                {block.items.map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: inlineHtml(item) }} />
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="list-decimal space-y-2 ps-5 text-neutral-600 dark:text-neutral-400">
                {block.items.map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: inlineHtml(item) }} />
                ))}
              </ol>
            )
          case 'code':
            return (
              <div key={i} className="relative">
                <pre className="overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-800 dark:border-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-100">
                  <code>{block.code}</code>
                </pre>
                <CopyButton text={block.code} />
              </div>
            )
          case 'table':
            return (
              <div key={i} className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/80">
                    <tr>
                      {block.headers.map((h, j) => (
                        <th key={j} className="px-3 py-2 font-semibold text-neutral-900 dark:text-neutral-100">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {block.rows.map((row, j) => (
                      <tr key={j} className="bg-white dark:bg-neutral-900/40">
                        {row.map((cell, k) => (
                          <td key={k} className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'callout':
            return (
              <div
                key={i}
                className={clsx('rounded-xl border px-4 py-3 text-sm', calloutStyles[block.variant])}
                dangerouslySetInnerHTML={{ __html: inlineHtml(block.text) }}
              />
            )
          default:
            return null
        }
      })}
    </div>
  )
}
