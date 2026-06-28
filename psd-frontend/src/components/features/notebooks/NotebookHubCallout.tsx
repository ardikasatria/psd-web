'use client'

import { OpenHubButton } from '@/components/features/notebooks/OpenHubButton'
import { useHub } from '@/lib/hub/useHub'
import { Button } from '@/shared/Button'
import { CodeBracketSquareIcon } from '@heroicons/react/24/outline'

export function NotebookHubCallout({ compact }: { compact?: boolean }) {
  const { enabled, isLoading } = useHub()

  return (
    <div
      className={
        compact
          ? 'rounded-xl border border-violet-200/80 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/30'
          : 'rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 to-indigo-50 p-5 dark:border-violet-900/50 dark:from-violet-950/40 dark:to-indigo-950/30'
      }
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
          <CodeBracketSquareIcon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">JupyterHub PSD</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Notebook dijalankan di JupyterHub (<strong>hub.projeksainsdata.com</strong>) dengan login OAuth PSD —
            bukan Colab. Folder kerja persisten di{' '}
            <code className="rounded bg-white/80 px-1 dark:bg-neutral-900/80">~/work</code>, dataset via{' '}
            <code className="rounded bg-white/80 px-1 dark:bg-neutral-900/80">psd://</code>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <OpenHubButton />
            <Button href="/help/notebook-membuka" outline>
              Panduan
            </Button>
            <Button href="/help/notebook-simpan-push" plain>
              Simpan & push Git
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
