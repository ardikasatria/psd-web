'use client'

import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { SettingsShell } from '@/components/features/settings/SettingsShell'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { addSshKey, deleteSshKey, getGitInfo, listSshKeys } from '@/lib/api/git'
import type { SshKey } from '@/lib/api/git'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { Field, Label } from '@/shared/fieldset'
import {
  ClipboardDocumentIcon,
  CommandLineIcon,
  KeyIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 2000)
        })
      }}
    >
      <ClipboardDocumentIcon className="size-3.5" aria-hidden />
      {copied ? 'Tersalin' : label}
    </button>
  )
}

export function GitSettingsContent() {
  useAuthGuard('/settings/git')
  const qc = useQueryClient()
  const [title, setTitle] = useState('Laptop saya')
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const info = useQuery({ queryKey: ['git', 'info'], queryFn: getGitInfo })
  const keys = useQuery({ queryKey: ['git', 'ssh-keys'], queryFn: listSshKeys, enabled: info.data?.enabled })

  const addMutation = useMutation({
    mutationFn: () => addSshKey({ title: title.trim(), key: key.trim() }),
    onSuccess: () => {
      setError(null)
      setSuccess('Kunci SSH berhasil ditambahkan ke Git PSD.')
      setKey('')
      qc.invalidateQueries({ queryKey: ['git', 'ssh-keys'] })
    },
    onError: (e: Error) => {
      setSuccess(null)
      setError(e.message)
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteSshKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['git', 'ssh-keys'] }),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSuccess(null)
    addMutation.mutate()
  }

  const git = info.data

  return (
    <DetailPageShell>
      <DetailPageHeader
        title="Git & SSH"
        subtitle="Kelola kunci SSH untuk push dan clone repository di Git PSD — tanpa perlu membuka panel Gitea terpisah."
      />

      <SettingsShell active="git">
        <QueryState isLoading={info.isLoading} isError={info.isError} error={info.error}>
          {!git?.enabled ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-600 dark:bg-neutral-800/50">
              <KeyIcon className="mx-auto size-10 text-neutral-400" aria-hidden />
              <p className="mt-4 font-semibold text-neutral-900 dark:text-neutral-100">Git PSD belum aktif</p>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Integrasi Gitea belum diaktifkan di lingkungan ini. Hubungi administrator jika Anda membutuhkan
                akses Git.
              </p>
              <Link href="/help/git-menyiapkan-akses" className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                Panduan Git →
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-3xl border border-neutral-200/80 bg-gradient-to-br from-slate-50 via-white to-primary-50/40 p-6 dark:border-neutral-700 dark:from-neutral-900 dark:via-neutral-800 dark:to-primary-950/20">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  <CommandLineIcon className="size-5 text-primary-600" aria-hidden />
                  Koneksi Git Anda
                </h2>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-neutral-500">Host Git</dt>
                    <dd className="mt-0.5 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                      {git.git_host}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Username Gitea</dt>
                    <dd className="mt-0.5 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                      {git.gitea_username}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-neutral-500">Prefix clone SSH</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-900">
                        {git.ssh_clone_prefix}nama-repo.git
                      </code>
                      <CopyButton text={`${git.ssh_clone_prefix}nama-repo.git`} label="Salin contoh" />
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-neutral-500">Uji koneksi</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-900">
                        {git.ssh_test_command}
                      </code>
                      <CopyButton text={git.ssh_test_command} label="Salin perintah" />
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
                <h2 className="text-lg font-semibold">Kunci SSH terdaftar</h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Kunci yang Anda tambahkan di sini langsung terhubung ke akun Git PSD (Gitea) Anda.
                </p>

                <QueryState isLoading={keys.isLoading} isError={keys.isError} error={keys.error}>
                  {(keys.data?.items ?? []).length === 0 ? (
                    <p className="mt-4 rounded-2xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-600">
                      Belum ada kunci SSH — tambahkan kunci publik dari laptop Anda di bawah.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {(keys.data?.items ?? []).map((k: SshKey) => (
                        <li
                          key={k.id}
                          className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-neutral-200/80 px-4 py-3 dark:border-neutral-700"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-neutral-900 dark:text-neutral-100">{k.title}</span>
                              {k.key_type && <Badge color="zinc">{k.key_type}</Badge>}
                            </div>
                            {k.fingerprint && (
                              <p className="mt-1 truncate font-mono text-xs text-neutral-500">{k.fingerprint}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            outline
                            onClick={() => removeMutation.mutate(k.id)}
                            disabled={removeMutation.isPending}
                            aria-label={`Hapus kunci ${k.title}`}
                          >
                            <TrashIcon className="size-4" aria-hidden />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </QueryState>
              </section>

              <form
                onSubmit={onSubmit}
                className="space-y-5 rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <h2 className="text-lg font-semibold">Tambah kunci SSH</h2>
                <details className="rounded-2xl border border-primary-100 bg-primary-50/50 p-4 text-sm dark:border-primary-900/50 dark:bg-primary-950/20">
                  <summary className="cursor-pointer font-medium text-primary-800 dark:text-primary-200">
                    Belum punya kunci? Buat di terminal
                  </summary>
                  <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-900 p-4 text-xs text-neutral-100">
{`ssh-keygen -t ed25519 -C "email-anda@domain.ac.id"
cat ~/.ssh/id_ed25519.pub`}
                  </pre>
                  <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                    Salin seluruh baris output <code className="text-xs">cat</code> (dimulai dengan{' '}
                    <code className="text-xs">ssh-ed25519</code>) ke formulir di bawah.
                  </p>
                </details>

                <Field>
                  <Label>Label kunci</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Laptop kerja"
                    className="mt-1 !rounded-xl"
                    required
                  />
                </Field>
                <Field>
                  <Label>Kunci publik</Label>
                  <Textarea
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="ssh-ed25519 AAAA... comment@email"
                    rows={4}
                    className="mt-1 !rounded-xl font-mono text-sm"
                    required
                    spellCheck={false}
                  />
                </Field>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                {success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>}

                <ButtonPrimary type="submit" disabled={addMutation.isPending || !key.trim()}>
                  {addMutation.isPending ? 'Menyimpan…' : 'Tambah kunci SSH'}
                </ButtonPrimary>
              </form>

              <p className="text-center text-sm text-neutral-500">
                Butuh token HTTPS? Lihat{' '}
                <Link href="/help/git-menyiapkan-akses" className="text-primary-600 hover:underline dark:text-primary-400">
                  panduan akses Git
                </Link>
                .
              </p>
            </div>
          )}
        </QueryState>
      </SettingsShell>
    </DetailPageShell>
  )
}
