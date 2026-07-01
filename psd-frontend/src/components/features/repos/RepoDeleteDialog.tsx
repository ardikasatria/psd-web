'use client'

import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  slug: string
  confirmName: string
  kindLabel: string
  onCancel: () => void
  onConfirm: () => void
  pending?: boolean
}

/**
 * Dialog konfirmasi hapus aset — ketik nama aset untuk konfirmasi (gaya GitHub/Hugging Face).
 */
export function RepoDeleteDialog({
  open,
  slug,
  confirmName,
  kindLabel,
  onCancel,
  onConfirm,
  pending = false,
}: Props) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (!open) setTyped('')
  }, [open])

  if (!open) return null

  const confirmed = typed.trim() === confirmName

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="repo-delete-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="mt-0.5 size-6 shrink-0 text-red-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 id="repo-delete-title" className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Hapus {kindLabel}?
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">{slug}</span>{' '}
              akan dipindahkan ke <strong>Sampah</strong> selama 30 hari. Anda masih bisa memulihkannya dari dasbor
              Sampah. Setelah 30 hari, penghapusan permanen otomatis.
            </p>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              Ketik <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">{confirmName}</span>{' '}
              untuk mengonfirmasi:
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-2 !rounded-xl font-mono"
              placeholder={confirmName}
              autoComplete="off"
              disabled={pending}
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" outline onClick={onCancel} disabled={pending}>
            Batal
          </Button>
          <ButtonPrimary
            type="button"
            className="!bg-red-600 hover:!bg-red-700"
            disabled={!confirmed || pending}
            onClick={onConfirm}
          >
            {pending ? 'Memindahkan…' : 'Hapus ke Sampah'}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  )
}
