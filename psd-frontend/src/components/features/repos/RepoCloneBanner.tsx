'use client'

import { Button } from '@/shared/Button'
import { ClipboardDocumentIcon, CommandLineIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

type Props = {
  cloneUrl: string
}

export function RepoCloneBanner({ cloneUrl }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cloneUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/40">
      <div className="flex flex-wrap items-center gap-3">
        <CommandLineIcon className="size-5 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Clone Git
          </p>
          <code className="mt-0.5 block truncate font-mono text-sm text-neutral-800 dark:text-neutral-200">
            {cloneUrl}
          </code>
        </div>
        <Button type="button" outline onClick={handleCopy}>
          <ClipboardDocumentIcon className="size-4" aria-hidden />
          {copied ? 'Tersalin' : 'Salin'}
        </Button>
      </div>
    </div>
  )

}
