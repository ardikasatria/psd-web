'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import {
  changeEmail,
  changePassword,
  getMe,
  resendVerification,
} from '@/lib/api/auth'
import { SettingsShell } from '@/components/features/settings/SettingsShell'
import { Button } from '@/shared/Button'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'

export function SecuritySettingsContent() {
  useAuthGuard('/settings/security')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')

  const { data, isLoading, isError, error: loadError } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  })

  const user = data?.user

  const passwordMutation = useMutation({
    mutationFn: () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Konfirmasi kata sandi tidak cocok.')
      }
      if (newPassword.length < 8) {
        throw new Error('Kata sandi baru minimal 8 karakter.')
      }
      return changePassword({ current_password: currentPassword, new_password: newPassword })
    },
    onSuccess: () => {
      setMessage('Kata sandi berhasil diperbarui.')
      setError(null)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (e: Error) => {
      setError(e.message)
      setMessage(null)
    },
  })

  const emailMutation = useMutation({
    mutationFn: () => changeEmail({ new_email: newEmail, password: emailPassword }),
    onSuccess: () => {
      setMessage('Cek email baru Anda untuk verifikasi.')
      setError(null)
      setNewEmail('')
      setEmailPassword('')
    },
    onError: (e: Error) => {
      setError(e.message)
      setMessage(null)
    },
  })

  const resendMutation = useMutation({
    mutationFn: resendVerification,
    onSuccess: () => {
      setMessage('Email verifikasi telah dikirim ulang.')
      setError(null)
    },
    onError: (e: Error) => {
      setError(e.message)
      setMessage(null)
    },
  })

  if (isError) {
    return (
      <DetailPageShell>
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-600">
          <p className="text-neutral-600 dark:text-neutral-400">Masuk untuk mengakses pengaturan keamanan.</p>
          <ButtonPrimary href="/login?next=/settings/security" className="mt-4">
            Masuk
          </ButtonPrimary>
        </div>
      </DetailPageShell>
    )
  }

  return (
    <DetailPageShell>
      <DetailPageHeader
        title="Keamanan akun"
        subtitle="Kelola kata sandi, email, dan verifikasi akun Anda."
      />

      <SettingsShell active="security">
        <QueryState isLoading={isLoading} isError={false} error={loadError}>
          <div className="space-y-6">
          {user && !user.email_verified && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Email belum diverifikasi
              </p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                Verifikasi email Anda untuk mengamankan akun.
              </p>
              <Button
                type="button"
                outline
                className="mt-3"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? 'Mengirim...' : 'Kirim ulang verifikasi'}
              </Button>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <form
            className="space-y-5 rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
            onSubmit={(e) => {
              e.preventDefault()
              passwordMutation.mutate()
            }}
          >
            <h2 className="text-lg font-semibold">Ganti kata sandi</h2>
            <Field>
              <Label>Kata sandi saat ini</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 !rounded-xl"
                required
              />
            </Field>
            <Field>
              <Label>Kata sandi baru</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 !rounded-xl"
                required
              />
            </Field>
            <Field>
              <Label>Konfirmasi kata sandi baru</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 !rounded-xl"
                required
              />
            </Field>
            <ButtonPrimary type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? 'Menyimpan...' : 'Perbarui kata sandi'}
            </ButtonPrimary>
          </form>

          <form
            className="space-y-5 rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
            onSubmit={(e) => {
              e.preventDefault()
              emailMutation.mutate()
            }}
          >
            <h2 className="text-lg font-semibold">Ganti email</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Email saat ini: <span className="font-medium text-neutral-800 dark:text-neutral-200">{user?.email}</span>
            </p>
            <Field>
              <Label>Email baru</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="mt-1 !rounded-xl"
                required
              />
            </Field>
            <Field>
              <Label>Kata sandi (konfirmasi)</Label>
              <Input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className="mt-1 !rounded-xl"
                required
              />
            </Field>
            <ButtonPrimary type="submit" disabled={emailMutation.isPending}>
              {emailMutation.isPending ? 'Mengirim...' : 'Kirim verifikasi email baru'}
            </ButtonPrimary>
          </form>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
          </div>
        </QueryState>
      </SettingsShell>
    </DetailPageShell>
  )
}
