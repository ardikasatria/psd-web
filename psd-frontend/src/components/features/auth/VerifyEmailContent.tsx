'use client'

import { useEffect, useState } from 'react'
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

      {status === 'loading' && (
        <p className="mt-8 text-center text-neutral-600 dark:text-neutral-400">Memverifikasi...</p>
      )}
      {status === 'ok' && (
        <div className="mt-8 space-y-5">
          <p className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
            Email berhasil diverifikasi. Akun Anda siap digunakan.
          </p>
          <ButtonPrimary href="/dashboard" className="w-full">
            Lanjut ke dasbor
          </ButtonPrimary>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-8 space-y-5">
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
            Tautan verifikasi tidak valid atau kedaluwarsa.
          </p>
          <p className="text-center text-sm">
            <Link href="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Masuk ke akun
            </Link>
          </p>
        </div>
      )}
    </AuthPageShell>
  )
}
