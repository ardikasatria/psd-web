'use client'

import { AuthEmailNotice, AuthEmailTips } from '@/components/features/auth/AuthEmailNotice'
import { AuthPageShell } from '@/components/features/auth/AuthPageShell'
import { forgotPassword } from '@/lib/api/auth'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ForgotPasswordForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPassword({ email })
    } catch {
      /* respons selalu ok — hindari enumerasi email */
    } finally {
      setLoading(false)
      router.push(`/check-email?kind=reset&email=${encodeURIComponent(email)}`)
    }
  }

  return (
    <AuthPageShell>
      <h1 className="text-center text-2xl font-semibold text-neutral-900 dark:text-white">Lupa kata sandi</h1>
      <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Masukkan email terdaftar — kami kirim tautan aman untuk mengatur ulang kata sandi
      </p>

      <form className="mt-8 grid grid-cols-1 gap-5" onSubmit={handleSubmit}>
        <Field>
          <Label>Alamat email</Label>
          <Input
            type="email"
            placeholder="contoh@email.com"
            className="mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <AuthEmailNotice variant="info" title="Email reset elegan & aman">
          Email berisi tombol aksi berbahasa Indonesia, berlaku 30 menit, dan petunjuk jika Anda tidak meminta reset.
        </AuthEmailNotice>
        <ButtonPrimary type="submit" disabled={loading} className="w-full">
          {loading ? 'Mengirim...' : 'Kirim tautan reset'}
        </ButtonPrimary>
      </form>

      <AuthEmailTips />

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          Kembali ke masuk
        </Link>
      </p>
    </AuthPageShell>
  )
}
