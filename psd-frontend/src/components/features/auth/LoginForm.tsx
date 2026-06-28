'use client'

import { AuthPageShell } from '@/components/features/auth/AuthPageShell'
import { useToast } from '@/components/common/Toast'
import { login } from '@/lib/api/auth'
import { getApiErrorMessage, isRateLimited } from '@/lib/api/errors'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function LoginForm() {
  const router = useRouter()
  const qc = useQueryClient()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setRateLimited(false)
    try {
      const auth = await login({ email, password })
      qc.setQueryData(['me'], { user: auth.user })
      router.push(next.startsWith('/') ? next : '/dashboard')
    } catch (err) {
      if (isRateLimited(err)) {
        setRateLimited(true)
        toast(getApiErrorMessage(err), 'error')
      }
      setError(getApiErrorMessage(err, 'Email atau kata sandi salah. Periksa kembali dan coba lagi.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell>
      <h1 className="text-center text-2xl font-semibold text-neutral-900 dark:text-white">Masuk</h1>
      <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Selamat datang kembali di Projek Sains Data
      </p>

      <form className="mt-8 grid grid-cols-1 gap-5" onSubmit={handleSubmit}>
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        )}
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
        <Field>
          <Label>Kata sandi</Label>
          <Input
            type="password"
            className="mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <ButtonPrimary type="submit" disabled={loading || rateLimited} className="w-full">
          {loading ? 'Memproses...' : rateLimited ? 'Coba lagi nanti' : 'Masuk'}
        </ButtonPrimary>
      </form>

      <p className="mt-5 text-center text-sm">
        <Link href="/forgot-password" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          Lupa kata sandi?
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-neutral-600 dark:text-neutral-400">
        Belum punya akun?{' '}
        <Link href="/register" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          Daftar sekarang
        </Link>
      </p>
      <p className="mt-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
        Demo: gunakan email apa saja yang mengandung &quot;budi-santoso&quot;
      </p>
    </AuthPageShell>
  )
}
