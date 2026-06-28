'use client'

import { hubEnabled, hubNotebookUrl } from '@/lib/hub'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { ArrowTopRightOnSquareIcon, CodeBracketSquareIcon } from '@heroicons/react/24/outline'

export function NotebookHubCallout({ compact }: { compact?: boolean }) {
  const hubActive = hubEnabled()

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
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Jupyter Notebook PSD</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Notebook di PSD dijalankan di Jupyter Notebook terintegrasi login OAuth — bukan Colab atau hosting file
            seperti Kaggle. Buat dan edit di{' '}
            <code className="rounded bg-white/80 px-1 dark:bg-neutral-900/80">~/work</code>, akses dataset via{' '}
            <code className="rounded bg-white/80 px-1 dark:bg-neutral-900/80">psd://</code>, lalu push ke Git.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {hubActive ? (
              <ButtonPrimary
                href={hubNotebookUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ArrowTopRightOnSquareIcon className="size-4" data-slot="icon" />
                Buka Jupyter Notebook
              </ButtonPrimary>
            ) : (
              <ButtonPrimary disabled>Buka Jupyter Notebook</ButtonPrimary>
            )}
            <Button href="/help/notebook-membuka" outline>
              Panduan
            </Button>
            <Button href="/help/notebook-simpan-push" plain>
              Simpan & push Git
            </Button>
          </div>
          {!hubActive && (
            <p className="mt-2 text-xs text-neutral-500">
              Jupyter Notebook belum aktif di lingkungan ini — hubungi admin atau set{' '}
              <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">COMPOSE_PROFILES=hub</code>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
