'use client'

import { AuthPageShell } from '@/components/features/auth/AuthPageShell'
import { resetPassword } from '@/lib/api/auth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Konfirmasi kata sandi tidak cocok.')
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
      router.push('/login')
    } catch {
      setError('Tautan reset tidak valid atau kedaluwarsa.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell>
      <h1 className="text-center text-2xl font-semibold text-neutral-900 dark:text-white">Reset kata sandi</h1>
      <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Masukkan kata sandi baru untuk akun Anda
      </p>

      <form className="mt-8 grid grid-cols-1 gap-5" onSubmit={handleSubmit}>
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        )}
        <Field>
          <Label>Kata sandi baru</Label>
          <Input
            type="password"
            className="mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
