'use client'

import { AuthPageShell } from '@/components/features/auth/AuthPageShell'
import { AuthEmailNotice } from '@/components/features/auth/AuthEmailNotice'
import { useToast } from '@/components/common/Toast'
import { register } from '@/lib/api/auth'
import { getApiErrorMessage, isRateLimited } from '@/lib/api/errors'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function RegisterForm() {
  const router = useRouter()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [form, setForm] = useState({ username: '', email: '', password: '', name: '' })
  const [acceptTos, setAcceptTos] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTos) {
      setError('Anda harus menyetujui Ketentuan Layanan & Kebijakan Privasi.')
      return
    }
    setLoading(true)
    setError('')
    setRateLimited(false)
    try {
      await register({ ...form, accept_tos: true })
      await qc.invalidateQueries({ queryKey: ['me'] })
      router.push(`/check-email?email=${encodeURIComponent(form.email)}`)
    } catch (err) {
      if (isRateLimited(err)) {
        setRateLimited(true)
        toast(getApiErrorMessage(err), 'error')
      }
      setError(getApiErrorMessage(err, 'Pendaftaran gagal. Periksa data Anda dan coba lagi.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageShell>
      <h1 className="text-center text-2xl font-semibold text-neutral-900 dark:text-white">Daftar</h1>
      <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Buat akun untuk berkolaborasi di PSD
      </p>

      <form className="mt-8 grid grid-cols-1 gap-5" onSubmit={handleSubmit}>
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
            {error}
          </p>
        )}
        <Field>
          <Label>Nama lengkap</Label>
          <Input
            className="mt-1"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field>
          <Label>Username</Label>
          <Input
            className="mt-1"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </Field>
        <Field>
          <Label>Alamat email</Label>
          <Input
            type="email"
            className="mt-1"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </Field>
        <Field>
          <Label>Kata sandi</Label>
          <Input
            type="password"
            className="mt-1"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </Field>
        <AuthEmailNotice variant="info" title="Verifikasi email">
          Setelah mendaftar, kami mengirim email verifikasi berbahasa Indonesia dengan tombol aksi aman ke alamat di atas.
        </AuthEmailNotice>
        <label className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            checked={acceptTos}
            onChange={(e) => setAcceptTos(e.target.checked)}
            required
          />
          <span>
            Saya menyetujui{' '}
            <Link href="/legal/ketentuan-layanan" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Ketentuan Layanan
            </Link>{' '}
            &{' '}
            <Link href="/legal/kebijakan-privasi" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Kebijakan Privasi
            </Link>
          </span>
        </label>
        <ButtonPrimary type="submit" disabled={loading || rateLimited || !acceptTos} className="w-full">
          {loading ? 'Memproses...' : rateLimited ? 'Coba lagi nanti' : 'Buat akun'}
        </ButtonPrimary>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
        Sudah punya akun?{' '}
        <Link href="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          Masuk
        </Link>
      </p>
    </AuthPageShell>
  )
}
