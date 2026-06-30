'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export function OwnerLeaveDialog({
  open,
  teamName,
  memberCount,
  onConfirm,
  onCancel,
  pending,
}: {
  open: boolean
  teamName: string
  memberCount: number
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
}) {
  if (!open) return null

  const solo = memberCount <= 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal
        aria-labelledby="leave-title"
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div className="flex gap-3">
          <ExclamationTriangleIcon className="size-6 shrink-0 text-amber-500" aria-hidden />
          <div>
            <h2 id="leave-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Keluar dari {teamName}?
            </h2>
            {solo ? (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Anda satu-satunya anggota. Tim akan dihapus setelah Anda keluar.
              </p>
            ) : (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Sebagai owner, kepemilikan akan dialihkan otomatis ke anggota paling aktif setelah Anda keluar.
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <ButtonPrimary type="button" outline onClick={onCancel} disabled={pending}>
            Batal
          </ButtonPrimary>
          <ButtonPrimary type="button" onClick={onConfirm} disabled={pending}>
            {pending ? 'Memproses…' : solo ? 'Hapus tim & keluar' : 'Keluar & transfer'}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  )
}
