'use client'

import '@/styles/code-viewer.css'
import { detectLanguageFromName } from '@/lib/asset/detectLanguage'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { Button } from '@/shared/Button'

let highlighterPromise: ReturnType<typeof import('shiki').createHighlighter> | null = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        themes: ['github-light', 'github-dark'],
        langs: [
          'python',
          'javascript',
          'typescript',
          'tsx',
          'json',
          'yaml',
          'bash',
          'sql',
          'markdown',
          'r',
          'go',
          'rust',
          'dockerfile',
          'text',
        ],
      }),
    )
  }
  return highlighterPromise
}

type Props = {
  code: string
  filename?: string
  language?: string
  downloadUrl?: string | null
}

export function CodeBlock({ code, filename = '', language, downloadUrl }: Props) {
  const lang = language || detectLanguageFromName(filename)
  const [html, setHtml] = useState('')

  useEffect(() => {
    if (lang === 'binary') return
    let alive = true
    void getHighlighter().then((hl) => {
      if (!alive) return
      const loaded = hl.getLoadedLanguages()
      const useLang = loaded.includes(lang as (typeof loaded)[number]) ? lang : 'text'
      const out = hl.codeToHtml(code, {
        lang: useLang,
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      })
      setHtml(out)
    })
    return () => {
      alive = false
    }
  }, [code, lang])

  if (lang === 'binary') {
    return (
      <div className="code-binary flex flex-wrap items-center justify-between gap-3">
        <span>Berkas biner — tidak dapat ditampilkan.</span>
        {downloadUrl && (
          <Button href={downloadUrl} target="_blank" rel="noopener noreferrer" outline className="!text-xs">
            <ArrowDownTrayIcon className="size-4" data-slot="icon" aria-hidden />
            Unduh
          </Button>
        )}
      </div>
    )
  }

  if (!html) {
    return (
      <pre className="overflow-x-auto rounded-xl border border-neutral-200/80 bg-neutral-50 p-4 text-xs dark:border-neutral-700 dark:bg-neutral-900/60">
        {code}
      </pre>
    )
  }

  return <div className="code-viewer" dangerouslySetInnerHTML={{ __html: html }} />
}
