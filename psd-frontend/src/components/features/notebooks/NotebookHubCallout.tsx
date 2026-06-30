'use client'

import { useNotebookKernelAccess } from '@/lib/notebooks/useNotebookKernelAccess'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { CodeBracketSquareIcon, CpuChipIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export function NotebookHubCallout({ compact }: { compact?: boolean }) {
  const { canServer, pendingGrant, isLoading: accessLoading } = useNotebookKernelAccess()

  if (accessLoading) return null

  if (!canServer && !pendingGrant) {
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
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Butuh kernel server?</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Ajukan akses kernel — pilih mahasiswa (NIM + KTM) atau umum. Tim PSD akan meninjau pengajuan Anda.
            </p>
            <ButtonPrimary href="/notebooks/kernel-request" className="mt-3">
              Ajukan kernel
            </ButtonPrimary>
          </div>
        </div>
      </div>
    )
  }

  if (pendingGrant) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          Pengajuan kernel sedang ditinjau.{' '}
          <Link href="/notebooks/kernel-request" className="font-medium underline">
            Lihat status
          </Link>
        </p>
      </div>
    )
  }

  if (!canServer) return null

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
            Compute berat di server terisolasi — aktifkan dari tab <strong>Server</strong> di editor notebook.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonPrimary href="/notebooks/workspace">
              <CodeBracketSquareIcon className="size-4" aria-hidden />
              Buka workspace
            </ButtonPrimary>
          </div>
        </div>
      </div>
    </div>
  )
}
