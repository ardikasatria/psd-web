'use client'

import { AuthEmailNotice } from '@/components/features/auth/AuthEmailNotice'
import { AuthPageShell } from '@/components/features/auth/AuthPageShell'
import { resetPassword } from '@/lib/api/auth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Konfirmasi kata sandi tidak cocok.')
      return
    }
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.')
      return
    }
    if (!token) {
      setError('Tautan reset tidak valid.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await resetPassword({ token, new_password: password })
      setDone(true)
    } catch {
      setError('Tautan reset tidak valid atau kedaluwarsa.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthPageShell>
        <h1 className="text-center text-2xl font-semibold text-neutral-900 dark:text-white">Kata sandi diperbarui</h1>
        <div className="mt-8 space-y-5">
          <AuthEmailNotice variant="success" title="Berhasil">
            Kata sandi baru Anda sudah aktif. Kami juga mengirim email konfirmasi ke alamat terdaftar.
          </AuthEmailNotice>
          <ButtonPrimary href="/login" className="w-full">
            Masuk dengan kata sandi baru
          </ButtonPrimary>
        </div>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell>
      <h1 className="text-center text-2xl font-semibold text-neutral-900 dark:text-white">Reset kata sandi</h1>
      <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Pilih kata sandi baru yang kuat untuk akun PSD Anda
      </p>

      {!token && (
        <div className="mt-8">
          <AuthEmailNotice variant="warning" title="Tautan reset tidak ditemukan">
            Buka tautan dari email reset kata sandi, atau{' '}
            <Link href="/forgot-password" className="font-medium underline">
              minta tautan baru
            </Link>
            .
          </AuthEmailNotice>
        </div>
      )}

      <form className="mt-8 grid grid-cols-1 gap-5" onSubmit={handleSubmit}>
        {error && (
          <AuthEmailNotice variant="warning" title="Gagal memperbarui">
            {error}
          </AuthEmailNotice>
        )}
        <Field>
          <Label>Kata sandi baru</Label>
          <Input
            type="password"
            className="mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </Field>
        <Field>
          <Label>Konfirmasi kata sandi</Label>
          <Input
            type="password"
            className="mt-1"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </Field>
        <ButtonPrimary type="submit" disabled={loading || !token} className="w-full">
          {loading ? 'Memproses...' : 'Simpan kata sandi baru'}
        </ButtonPrimary>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          Kembali ke masuk
        </Link>
      </p>
    </AuthPageShell>
  )
}
