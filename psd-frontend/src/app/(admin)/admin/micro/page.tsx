'use client'

import { AdminMicroGuide } from '@/components/admin/micro/AdminMicroGuide'
import { AdminMicroQuizBuilder } from '@/components/admin/micro/AdminMicroQuizBuilder'
import {
  detailToForm,
  emptyMicroForm,
  formToBody,
  slugifyTitle,
  validateMicroForm,
  type MicroAdminForm,
} from '@/components/admin/micro/micro-admin-utils'
import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty } from '@/components/admin/AdminShared'
import { createMicro, getMicroAdmin, listMicroAdmin, updateMicro } from '@/lib/api/micro'
import { getCategories } from '@/lib/api/categories'
import type { Category, MicroAdminSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { Description, Label } from '@/shared/fieldset'
import { Switch, SwitchField } from '@/shared/switch'
import Textarea from '@/shared/Textarea'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { ArrowTopRightOnSquareIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { FormEvent, useMemo, useState } from 'react'

function FieldLabel({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</span>
      {hint && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
    </div>
  )
}

export default function AdminMicroPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<MicroAdminForm>(emptyMicroForm())
  const [slugTouched, setSlugTouched] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)

  const list = useQuery({ queryKey: ['admin', 'micro'], queryFn: listMicroAdmin })
  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const stats = useMemo(() => {
    const items = list.data ?? []
    return {
      total: items.length,
      active: items.filter((m: MicroAdminSummary) => m.active).length,
      withQuiz: items.filter((m: MicroAdminSummary) => m.has_quiz).length,
    }
  }, [list.data])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'micro'] })
    qc.invalidateQueries({ queryKey: ['micro'] })
  }

  const save = useMutation({
    mutationFn: async () => {
      const err = validateMicroForm(form, !!editing)
      if (err) throw new Error(err)
      const body = formToBody(form, !!editing)
      if (editing) return updateMicro(editing, body)
      return createMicro(body)
    },
    onSuccess: () => {
      invalidate()
      setOpen(false)
      setEditing(null)
      setForm(emptyMicroForm())
      setSlugTouched(false)
      setFormError(null)
    },
    onError: (e: Error) => setFormError(e.message || 'Gagal menyimpan. Coba lagi.'),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyMicroForm())
    setSlugTouched(false)
    setFormError(null)
    setOpen(true)
  }

  const openEdit = async (row: MicroAdminSummary) => {
    setLoadingEdit(row.slug)
    setFormError(null)
    try {
      const full = await getMicroAdmin(row.slug)
      setEditing(row.slug)
      setForm(detailToForm(full))
      setSlugTouched(true)
      setOpen(true)
    } finally {
      setLoadingEdit(null)
    }
  }

  const onTitleChange = (title: string) => {
    const next = { ...form, title }
    if (!editing && !slugTouched) {
      next.slug = slugifyTitle(title)
    }
    setForm(next)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    save.mutate()
  }

  return (
    <div>
      <AdminPageHeader
        title="Micro-lesson"
        description="Kelola materi belajar singkat untuk widget Belajar Harian dan halaman publik micro-lesson."
        actions={<ButtonPrimary onClick={openCreate}>Buat micro-lesson baru</ButtonPrimary>}
      />

      <AdminMicroGuide />

      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <StatTile label="Total materi" value={stats.total} />
            <StatTile label="Aktif" value={stats.active} />
            <StatTile label="Dengan quiz" value={stats.withQuiz} />
          </div>

          <AdminContentCard>
            {(list.data ?? []).length === 0 ? (
              <AdminTableEmpty>
                Belum ada micro-lesson. Klik &ldquo;Buat micro-lesson baru&rdquo; untuk menambahkan materi pertama.
              </AdminTableEmpty>
            ) : (
              <AdminTable>
                <TableHead>
                  <TableRow>
                    <TableHeader>Judul</TableHeader>
                    <TableHeader>Durasi</TableHeader>
                    <TableHeader>Quiz</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Aksi</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(list.data ?? []).map((m: MicroAdminSummary) => (
                    <TableRow key={m.slug}>
                      <TableCell>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">{m.title}</div>
                        <div className="mt-0.5 font-mono text-xs text-neutral-500">/micro/{m.slug}</div>
                      </TableCell>
                      <TableCell>{m.duration_min} menit</TableCell>
                      <TableCell>
                        {m.has_quiz ? (
                          <Badge color="blue">Ada quiz</Badge>
                        ) : (
                          <span className="text-sm text-neutral-500">Baca saja</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {m.active ? (
                          <Badge color="green">Aktif</Badge>
                        ) : (
                          <Badge color="zinc">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Button
                            plain
                            onClick={() => openEdit(m)}
                            disabled={loadingEdit === m.slug}
                          >
                            <PencilSquareIcon className="size-4" data-slot="icon" aria-hidden />
                            {loadingEdit === m.slug ? 'Memuat...' : 'Edit'}
                          </Button>
                          <Button plain href={`/micro/${m.slug}`} target="_blank">
                            <ArrowTopRightOnSquareIcon className="size-4" data-slot="icon" aria-hidden />
                            Pratinjau
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </AdminTable>
            )}
          </AdminContentCard>
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} size="3xl">
        <form onSubmit={onSubmit}>
          <DialogTitle>{editing ? 'Edit micro-lesson' : 'Buat micro-lesson baru'}</DialogTitle>
          <DialogBody className="max-h-[75vh] space-y-5 overflow-y-auto">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                {formError}
              </div>
            )}

            <FieldLabel label="Judul materi" hint="Judul yang tampil di dashboard dan halaman belajar.">
              <Input
                value={form.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Contoh: Etika data untuk UMKM"
                required
                className="!rounded-xl"
              />
            </FieldLabel>

            {!editing && (
              <FieldLabel
                label="Alamat URL (slug)"
                hint="Otomatis dari judul. Hanya huruf kecil, angka, dan strip. Contoh: etika-data-umkm"
              >
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setForm({ ...form, slug: e.target.value })
                  }}
                  placeholder="etika-data-umkm"
                  required
                  className="!rounded-xl font-mono text-sm"
                />
              </FieldLabel>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldLabel label="Perkiraan durasi baca" hint="Dalam menit — panduan untuk peserta.">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={form.duration_min}
                  onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })}
                  className="!rounded-xl"
                />
              </FieldLabel>

              <FieldLabel label="Kategori topik" hint="Opsional — membantu pengelompokan materi.">
                <Select
                  value={form.category_slug}
                  onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
                  className="!rounded-xl"
                >
                  <option value="">— Tanpa kategori —</option>
                  {(categories.data ?? []).map((c: Category) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FieldLabel>
            </div>

            <FieldLabel
              label="Isi materi"
              hint="Gunakan Markdown sederhana: ## untuk subjudul, - untuk poin, **tebal** untuk penekanan."
            >
              <Textarea
                value={form.content_md}
                onChange={(e) => setForm({ ...form, content_md: e.target.value })}
                placeholder={'## Pengantar\n\nJelaskan konsep inti dalam 2–3 paragraf singkat...\n\n- Poin penting 1\n- Poin penting 2'}
                rows={10}
                className="!rounded-xl text-sm"
              />
            </FieldLabel>

            <AdminMicroQuizBuilder value={form.quiz} onChange={(quiz) => setForm({ ...form, quiz })} />

            <SwitchField>
              <Label>Publikasikan (aktif)</Label>
              <Description>
                Nonaktif = disembunyikan dari antrean belajar harian.{' '}
                {editing && (
                  <>
                    Pratinjau:{' '}
                    <Link href={`/micro/${editing}`} target="_blank" className="text-primary-600 underline dark:text-primary-400">
                      /micro/{editing}
                    </Link>
                  </>
                )}
              </Description>
              <Switch color="primary" checked={form.active} onChange={(active) => setForm({ ...form, active })} />
            </SwitchField>
          </DialogBody>
          <DialogActions>
            <Button outline type="button" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <ButtonPrimary type="submit" disabled={save.isPending}>
              {save.isPending ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Terbitkan micro-lesson'}
            </ButtonPrimary>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}
