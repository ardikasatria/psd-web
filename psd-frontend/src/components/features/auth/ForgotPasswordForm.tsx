'use client'

import { AuthPageShell } from '@/components/features/auth/AuthPageShell'
import { forgotPassword } from '@/lib/api/auth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Link from 'next/link'
import { useState } from 'react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword({ email })
      setSent(true)
    } catch {
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell>
      <h1 className="text-center text-2xl font-semibold text-neutral-900 dark:text-white">Lupa kata sandi</h1>
      <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Kami akan mengirim tautan reset ke email Anda
      </p>

      {sent ? (
        <p className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          Jika email terdaftar, tautan reset telah dikirim. Periksa kotak masuk Anda.
        </p>
      ) : (
        <form className="mt-8 grid grid-cols-1 gap-5" onSubmit={handleSubmit}>
          <Field>
            <Label>Alamat email</Label>
            <Input
              type="email"
              className="mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <ButtonPrimary type="submit" disabled={loading} className="w-full">
            {loading ? 'Mengirim...' : 'Kirim tautan reset'}
          </ButtonPrimary>
        </form>
      )}

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          Kembali ke masuk
        </Link>
      </p>
    </AuthPageShell>
  )
}
