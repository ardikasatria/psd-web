'use client'

import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { FeaturePageShell } from '@/components/features/layout'
import { QueryState } from '@/components/features/QueryState'
import { applyInstructor, getMyInstructorApplication } from '@/lib/api/instructors'
import { useMe } from '@/lib/api/dashboard'
import { isStaff } from '@/lib/auth/roles'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { Badge } from '@/shared/Badge'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useState } from 'react'
import Link from 'next/link'

export function InstructorApplyPage() {
  const qc = useQueryClient()
  const me = useMe()
  const app = useQuery({
    queryKey: ['instructor-application'],
    queryFn: getMyInstructorApplication,
    enabled: !!me.data?.user,
  })

  const [expertise, setExpertise] = useState('')
  const [motivation, setMotivation] = useState('')

  const submit = useMutation({
    mutationFn: () => applyInstructor({ expertise, motivation_md: motivation }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instructor-application'] }),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit.mutate()
  }

  if (me.data?.user?.is_instructor || isStaff(me.data?.user)) {
    return (
      <FeaturePageShell>
        <div className="mx-auto max-w-lg py-16 text-center">
          <Badge color="green">Instruktur</Badge>
          <h1 className="mt-4 text-2xl font-semibold">Anda sudah menjadi instruktur</h1>
          <p className="mt-2 text-neutral-500">Buka Studio untuk membuat dan mengelola course.</p>
          <ButtonPrimary href="/studio" className="mt-6">
            Buka Studio
          </ButtonPrimary>
        </div>
      </FeaturePageShell>
    )
  }

  return (
    <FeaturePageShell>
      <div className="mx-auto max-w-lg py-10">
        <h1 className="text-2xl font-semibold">Daftar sebagai instruktur</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Ajukan diri Anda untuk menjadi instruktur di Projek Sains Data. Tim admin akan meninjau pengajuan Anda.
        </p>

        <QueryState isLoading={app.isLoading} isError={app.isError} error={app.error}>
          {app.data?.status === 'pending' && (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/30">
              <Badge color="yellow">Menunggu persetujuan</Badge>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                Pengajuan Anda sedang ditinjau. Keahlian: <strong>{app.data.expertise}</strong>
              </p>
            </div>
          )}

          {app.data?.status === 'approved' && (
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
              <Badge color="green">Disetujui</Badge>
              <p className="mt-3 text-sm">Selamat! Anda dapat mulai membuat course di Studio.</p>
              <ButtonPrimary href="/studio" className="mt-4">
                Buka Studio
              </ButtonPrimary>
            </div>
          )}

          {app.data?.status === 'rejected' && (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/30">
              <Badge color="red">Ditolak</Badge>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                Pengajuan Anda belum disetujui. Hubungi tim PSD jika ada pertanyaan.
              </p>
            </div>
          )}

          {!app.data && (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div>
                <label className="text-sm font-medium">Keahlian</label>
                <Input
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  placeholder="Contoh: NLP, Machine Learning, Visualisasi Data"
                  required
                  className="mt-1 !rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Motivasi (markdown)</label>
                <Textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Ceritakan pengalaman dan motivasi Anda menjadi instruktur…"
                  rows={6}
                  className="mt-1 !rounded-xl font-mono text-sm"
                />
                {motivation && (
                  <div className="mt-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
                    <p className="mb-2 text-xs font-medium text-neutral-500">Pratinjau</p>
                    <SimpleMarkdown content={motivation} />
                  </div>
                )}
              </div>
              <ButtonPrimary type="submit" disabled={submit.isPending}>
                {submit.isPending ? 'Mengirim…' : 'Kirim pengajuan'}
              </ButtonPrimary>
            </form>
          )}
        </QueryState>

        <p className="mt-8 text-center text-sm text-neutral-500">
          <Link href="/learn" className="text-primary-600 hover:underline dark:text-primary-400">
            ← Kembali ke katalog belajar
          </Link>
        </p>
      </div>
    </FeaturePageShell>
  )
}
