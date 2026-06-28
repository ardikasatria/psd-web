'use client'

import { OpenHubButton } from '@/components/features/notebooks/OpenHubButton'
import { useHub } from '@/lib/hub/useHub'
import { Button } from '@/shared/Button'
import { CodeBracketSquareIcon, CpuChipIcon } from '@heroicons/react/24/outline'

export function NotebookHubCallout({ compact }: { compact?: boolean }) {
  const { enabled, isLoading } = useHub()

  if (isLoading || !enabled) return null

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
          <CpuChipIcon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Kernel server (tier Ahli+)</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Untuk compute berat — kernel terisolasi di belakang layar via OAuth PSD. UI JupyterHub tidak perlu dibuka
            manual setelah login.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <OpenHubButton compact />
            <Button href="/notebooks/workspace" outline>
              <CodeBracketSquareIcon className="size-4" aria-hidden />
              Workspace
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
