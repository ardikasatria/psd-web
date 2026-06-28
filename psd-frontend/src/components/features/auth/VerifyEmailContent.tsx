'use client'

import { useEffect, useState } from 'react'
import { AuthEmailNotice } from '@/components/features/auth/AuthEmailNotice'
import { AuthPageShell } from '@/components/features/auth/AuthPageShell'
import { verifyEmail } from '@/lib/api/auth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    verifyEmail({ token })
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <AuthPageShell>
      <h1 className="text-center text-2xl font-semibold text-neutral-900 dark:text-white">Verifikasi email</h1>
      <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Mengonfirmasi alamat email akun PSD Anda
      </p>

      {status === 'loading' && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" aria-hidden />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Memverifikasi tautan Anda…</p>
        </div>
      )}

      {status === 'ok' && (
        <div className="mt-8 space-y-5">
          <AuthEmailNotice variant="success" title="Email berhasil diverifikasi">
            Akun Anda sudah aktif sepenuhnya. Anda dapat mengakses semua fitur PSD dengan aman.
          </AuthEmailNotice>
          <ButtonPrimary href="/dashboard" className="w-full">
            Lanjut ke dasbor
          </ButtonPrimary>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-8 space-y-5">
          <AuthEmailNotice variant="warning" title="Tautan tidak valid atau kedaluwarsa">
            Tautan verifikasi mungkin sudah dipakai atau melewati batas waktu (60 menit). Minta email baru dari
            pengaturan keamanan.
          </AuthEmailNotice>
          <div className="flex flex-col gap-3">
            <ButtonPrimary href="/settings/security" className="w-full">
              Kirim ulang verifikasi
            </ButtonPrimary>
            <p className="text-center text-sm">
              <Link href="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                Masuk ke akun
              </Link>
            </p>
          </div>
        </div>
      )}
    </AuthPageShell>
  )
}
