'use client'

import { reportContent, REASON_LABELS } from '@/lib/api/reports'
import { REPORT_REASONS, type ReportableKind } from '@/types/api'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Textarea from '@/shared/Textarea'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

type ReportContentModalProps = {
  open: boolean
  onClose: () => void
  kind: ReportableKind
  targetId: string
  label?: string
}

export function ReportContentModal({
  open,
  onClose,
  kind,
  targetId,
  label = 'Laporkan konten',
}: ReportContentModalProps) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0])
  const [detail, setDetail] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const submit = useMutation({
    mutationFn: () => reportContent({ kind, target_id: targetId, reason, detail: detail.trim() || undefined }),
    onSuccess: (res) => {
      setMessage(
        res.already_reported
          ? 'Anda sudah melaporkan konten ini. Terima kasih.'
          : 'Laporan terkirim. Terima kasih telah membantu menjaga komunitas.',
      )
      setDetail('')
    },
  })

  function handleClose() {
    setMessage(null)
    setReason(REPORT_REASONS[0])
    setDetail('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} size="md">
      <DialogTitle>{label}</DialogTitle>
      <DialogBody className="space-y-4">
        {message ? (
          <p className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-950/40 dark:text-primary-200">
            {message}
          </p>
        ) : (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Pilih alasan laporan. Identitas Anda tidak dibagikan ke pemilik konten.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    reason === r
                      ? 'border-primary-500 bg-primary-50 dark:border-primary-600 dark:bg-primary-950/30'
                      : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="text-primary-600"
                  />
                  {REASON_LABELS[r] ?? r}
                </label>
              ))}
            </div>
            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Detail tambahan (opsional)"
              rows={3}
              className="!rounded-xl text-sm"
            />
          </>
        )}
      </DialogBody>
      <DialogActions>
        <Button plain onClick={handleClose}>
          {message ? 'Tutup' : 'Batal'}
        </Button>
        {!message && (
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            {submit.isPending ? 'Mengirim...' : 'Kirim laporan'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
