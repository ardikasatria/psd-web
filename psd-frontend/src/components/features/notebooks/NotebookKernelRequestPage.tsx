'use client'

import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { FeaturePageShell } from '@/components/features/layout'
import { QueryState } from '@/components/features/QueryState'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { getMyNotebookKernelRequest, submitNotebookKernelRequest } from '@/lib/api/notebook-kernel'
import { kernelServerAvailable } from '@/lib/gamification/config'
import { hubTierFromGamificationLevel } from '@/lib/notebooks/tier'
import { getMyGamification } from '@/lib/api/gamification'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { Badge } from '@/shared/Badge'
import {
  AcademicCapIcon,
  CpuChipIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

type ApplicantType = 'student' | 'umum'

export function NotebookKernelRequestPage() {
  useAuthGuard('/login?next=/notebooks/kernel-request')
  const qc = useQueryClient()

  const gamification = useQuery({
    queryKey: ['me', 'gamification'],
    queryFn: getMyGamification,
  })

  const application = useQuery({
    queryKey: ['notebook-kernel-request'],
    queryFn: getMyNotebookKernelRequest,
  })

  const tierSlug = hubTierFromGamificationLevel(gamification.data?.tier.level ?? 0)
  const alreadyHasKernel = kernelServerAvailable(tierSlug)

  const [applicantType, setApplicantType] = useState<ApplicantType>('student')
  const [nim, setNim] = useState('')
  const [institution, setInstitution] = useState('')
  const [reason, setReason] = useState('')
  const [ktmFile, setKtmFile] = useState<File | null>(null)

  const submit = useMutation({
    mutationFn: () =>
      submitNotebookKernelRequest({
        applicant_type: applicantType,
        nim: applicantType === 'student' ? nim.trim() : undefined,
        institution: institution.trim() || undefined,
        reason_md: reason,
        ktm: applicantType === 'student' ? ktmFile : null,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notebook-kernel-request'] }),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit.mutate()
  }

  const status = application.data?.status

  return (
    <FeaturePageShell>
      <div className="mx-auto max-w-2xl py-10">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
            <CpuChipIcon className="size-3.5" aria-hidden />
            Kernel server
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Ajukan akses kernel</h1>
          <p className="mt-3 text-neutral-600 dark:text-neutral-400">
            Kernel server PSD memberi compute terisolasi untuk notebook berat (pandas besar, training ringan).
            Biasanya tersedia dari tier Ahli — ajukan di sini jika Anda mahasiswa atau pengguna umum yang membutuhkan
            akses lebih awal.
          </p>
        </div>

        {alreadyHasKernel && (
          <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
            <Badge color="green">Sudah tersedia</Badge>
            <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
              Tier gamifikasi Anda sudah mencakup kernel server. Buka workspace notebook untuk memakainya.
            </p>
            <ButtonPrimary href="/notebooks/workspace" className="mt-4">
              Buka workspace
            </ButtonPrimary>
          </div>
        )}

        <QueryState isLoading={application.isLoading} isError={application.isError} error={application.error}>
          {status === 'pending' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/30">
              <Badge color="yellow">Menunggu tinjauan</Badge>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                Pengajuan Anda ({application.data?.applicant_type === 'student' ? 'Mahasiswa' : 'Umum'}) sedang
                ditinjau tim PSD. Biasanya 1–3 hari kerja.
              </p>
              {application.data?.nim && (
                <p className="mt-2 text-xs text-neutral-500">NIM: {application.data.nim}</p>
              )}
            </div>
          )}

          {status === 'approved' && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
              <Badge color="green">Disetujui</Badge>
              <p className="mt-3 text-sm">Akses kernel server aktif. Buka notebook dan pilih kernel server.</p>
              <ButtonPrimary href="/notebooks/workspace" className="mt-4">
                Buka workspace
              </ButtonPrimary>
            </div>
          )}

          {status === 'rejected' && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/30">
              <Badge color="red">Ditolak</Badge>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                {application.data?.review_note || 'Pengajuan belum disetujui. Anda dapat mengajukan ulang setelah memperbaiki data.'}
              </p>
            </div>
          )}

          {!alreadyHasKernel && status !== 'pending' && status !== 'approved' && (
            <form onSubmit={onSubmit} className="space-y-6">
              <fieldset>
                <legend className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Tipe pemohon</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        id: 'student' as const,
                        label: 'Mahasiswa',
                        desc: 'Wajib NIM & foto KTM',
                        icon: AcademicCapIcon,
                      },
                      {
                        id: 'umum' as const,
                        label: 'Umum',
                        desc: 'Profesional, pelajar non-KTM',
                        icon: UserIcon,
                      },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon
                    const active = applicantType === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setApplicantType(opt.id)}
                        className={clsx(
                          'flex items-start gap-3 rounded-2xl border p-4 text-start transition',
                          active
                            ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200 dark:border-violet-600 dark:bg-violet-950/30 dark:ring-violet-800'
                            : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800',
                        )}
                      >
                        <Icon className={clsx('size-6 shrink-0', active ? 'text-violet-600' : 'text-neutral-400')} />
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{opt.label}</p>
                          <p className="mt-0.5 text-xs text-neutral-500">{opt.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {applicantType === 'student' && (
                <div className="space-y-4 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-5 dark:border-violet-800/50 dark:bg-violet-950/20">
                  <div>
                    <label htmlFor="nim" className="text-sm font-medium">
                      NIM <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="nim"
                      value={nim}
                      onChange={(e) => setNim(e.target.value)}
                      placeholder="Contoh: 2215061201"
                      required
                      className="mt-1 !rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="institution" className="text-sm font-medium">
                      Perguruan tinggi
                    </label>
                    <Input
                      id="institution"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="Contoh: Universitas Lampung"
                      className="mt-1 !rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="ktm" className="text-sm font-medium">
                      Foto KTM <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="ktm"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      required
                      className="mt-2 block w-full text-sm text-neutral-600 file:me-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-violet-800 dark:text-neutral-400 dark:file:bg-violet-900/50 dark:file:text-violet-200"
                      onChange={(e) => setKtmFile(e.target.files?.[0] ?? null)}
                    />
                    <p className="mt-1 text-xs text-neutral-500">JPEG, PNG, WebP, atau PDF — maks. 5 MB</p>
                  </div>
                </div>
              )}

              {applicantType === 'umum' && (
                <div>
                  <label htmlFor="institution-umum" className="text-sm font-medium">
                    Organisasi / afiliasi (opsional)
                  </label>
                  <Input
                    id="institution-umum"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Contoh: UMKM, komunitas data lokal"
                    className="mt-1 !rounded-xl"
                  />
                </div>
              )}

              <div>
                <label htmlFor="reason" className="text-sm font-medium">
                  Alasan & rencana penggunaan
                </label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan proyek atau course yang membutuhkan kernel server…"
                  rows={5}
                  className="mt-1 !rounded-xl font-mono text-sm"
                />
                {reason && (
                  <div className="mt-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                    <p className="mb-2 text-xs font-medium text-neutral-500">Pratinjau</p>
                    <SimpleMarkdown content={reason} />
                  </div>
                )}
              </div>

              {submit.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">{(submit.error as Error).message}</p>
              )}

              <ButtonPrimary type="submit" disabled={submit.isPending}>
                {submit.isPending ? 'Mengirim…' : 'Kirim pengajuan'}
              </ButtonPrimary>
            </form>
          )}
        </QueryState>

        <p className="mt-10 text-center text-sm text-neutral-500">
          <Link href="/notebooks" className="text-primary-600 hover:underline dark:text-primary-400">
            ← Kembali ke notebook
          </Link>
        </p>
      </div>
    </FeaturePageShell>
  )
}
