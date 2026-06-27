'use client'

import { acceptTos } from '@/lib/api/auth'
import { useAuth } from '@/lib/auth/useAuth'
import { useLogout } from '@/lib/auth/useLogout'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/shared/dialog'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export function TosReacceptBanner() {
  const { user } = useAuth()
  const handleLogout = useLogout()
  const qc = useQueryClient()
  const [open, setOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!user || !user.tos_current) return null
  if (user.accepted_tos_version === user.tos_current) return null
  if (!open) return null

  const handleAccept = async () => {
    setBusy(true)
    setError('')
    try {
      await acceptTos()
      await qc.invalidateQueries({ queryKey: ['me'] })
      setOpen(false)
    } catch {
      setError('Gagal menyimpan persetujuan. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => {}} size="md">
      <DialogTitle>Pembaruan ketentuan layanan</DialogTitle>
      <DialogDescription>
        Ketentuan Layanan dan Kebijakan Privasi PSD telah diperbarui (versi {user.tos_current}). Anda perlu
        menyetujui versi terbaru untuk melanjutkan menggunakan platform.
      </DialogDescription>
      <DialogBody>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Baca{' '}
          <Link href="/legal/ketentuan-layanan" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            Ketentuan Layanan
          </Link>{' '}
          dan{' '}
          <Link href="/legal/kebijakan-privasi" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            Kebijakan Privasi
          </Link>
          .
        </p>
        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </DialogBody>
      <DialogActions>
        <Button type="button" outline onClick={handleLogout}>
          Keluar
        </Button>
        <ButtonPrimary onClick={handleAccept} disabled={busy}>
          {busy ? 'Menyimpan...' : 'Saya setuju'}
        </ButtonPrimary>
      </DialogActions>
    </Dialog>
  )
}
