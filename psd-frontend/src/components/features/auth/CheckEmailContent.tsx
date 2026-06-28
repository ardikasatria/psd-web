'use client'

import { AuthEmailNotice, AuthEmailTips } from '@/components/features/auth/AuthEmailNotice'
import { AuthPageShell } from '@/components/features/auth/AuthPageShell'
import { resendVerification } from '@/lib/api/auth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const kind = searchParams.get('kind') ?? 'verify'
  const [resent, setResent] = useState(false)
  const [loading, setLoading] = useState(false)

  const title =
    kind === 'change'
      ? 'Cek email baru Anda'
      : kind === 'reset'
        ? 'Tautan reset telah dikirim'
        : 'Verifikasi email Anda'

  const lead =
    kind === 'change'
      ? 'Kami mengirim email konfirmasi ke alamat baru. Klik tombol di email untuk menyelesaikan perubahan.'
      : kind === 'reset'
        ? 'Jika email terdaftar, instruksi reset kata sandi telah dikirim.'
        : 'Akun berhasil dibuat. Kami mengirim email verifikasi — klik tombol di email untuk mengaktifkan akun sepenuhnya.'

  const handleResend = async () => {
    setLoading(true)
    try {
      await resendVerification()
      setResent(true)
    } catch {
      setResent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell>
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-400 text-white shadow-lg shadow-primary-600/25">
        <span className="text-2xl" aria-hidden>
          ✉
        </span>
      </div>
      <h1 className="mt-6 text-center text-2xl font-semibold text-neutral-900 dark:text-white">{title}</h1>

      <div className="mt-8 space-y-5">
        <AuthEmailNotice variant="info" title={email ? `Dikirim ke ${email}` : 'Periksa kotak masuk Anda'}>
          {lead}
        </AuthEmailNotice>

        {kind === 'verify' && (
          <>
            <AuthEmailTips />
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                outline
                className="w-full"
                disabled={loading || resent}
                onClick={handleResend}
              >
                {resent ? 'Email verifikasi dikirim ulang' : loading ? 'Mengirim...' : 'Kirim ulang email verifikasi'}
              </Button>
              <ButtonPrimary href="/dashboard" className="w-full">
                Lanjut ke dasbor
              </ButtonPrimary>
            </div>
          </>
        )}

        {kind === 'reset' && (
          <>
            <AuthEmailTips />
            <ButtonPrimary href="/login" className="w-full">
              Kembali ke masuk
            </ButtonPrimary>
          </>
        )}

        {kind === 'change' && (
          <>
            <AuthEmailTips />
            <ButtonPrimary href="/settings/security" className="w-full">
              Kembali ke pengaturan keamanan
            </ButtonPrimary>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Salah email?{' '}
        <Link href="/settings/security" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          Ubah di pengaturan
        </Link>
      </p>
    </AuthPageShell>
  )
}
