'use client'

import { AuthEmailNotice } from '@/components/features/auth/AuthEmailNotice'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { EnvelopeOpenIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

type Status = 'loading' | 'success' | 'error'

export function EmailUnsubscribeContent() {
  const params = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    fetch(`${API}/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((res) => setStatus(res.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-16 dark:bg-neutral-950">
      <div className="w-full max-w-lg rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 sm:p-10">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-400 text-white shadow-lg shadow-primary-600/25">
          <EnvelopeOpenIcon className="size-7" aria-hidden />
        </div>

        {status === 'loading' && (
          <>
            <h1 className="mt-6 text-center text-xl font-semibold text-neutral-900 dark:text-white">
              Memproses permintaan…
            </h1>
            <p className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
              Mohon tunggu sebentar.
            </p>
            <div className="mx-auto mt-6 size-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="mt-6 text-center text-xl font-semibold text-neutral-900 dark:text-white">
              Email notifikasi dinonaktifkan
            </h1>
            <div className="mt-6">
              <AuthEmailNotice variant="success" title="Berhasil berhenti berlangganan">
                Anda tidak akan menerima email notifikasi dari PSD lagi. Notifikasi dalam aplikasi tetap dapat
                diaktifkan di pengaturan.
              </AuthEmailNotice>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <ButtonPrimary href="/settings/notifications" className="w-full">
                Kelola preferensi notifikasi
              </ButtonPrimary>
              <Link
                href="/dashboard"
                className="text-center text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Kembali ke dasbor
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="mt-6 text-center text-xl font-semibold text-neutral-900 dark:text-white">
              Link tidak valid
            </h1>
            <div className="mt-6">
              <AuthEmailNotice variant="warning" title="Tautan kedaluwarsa atau tidak dikenali">
                Token berhenti berlangganan tidak ditemukan atau sudah tidak berlaku. Anda juga dapat menonaktifkan
                email langsung dari pengaturan akun.
              </AuthEmailNotice>
            </div>
            <ButtonPrimary href="/settings/notifications" className="mt-6 w-full">
              Buka pengaturan notifikasi
            </ButtonPrimary>
          </>
        )}
      </div>
    </main>
  )
}
