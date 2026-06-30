'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, AdminTableEmpty, ConfirmDialog } from '@/components/admin/AdminShared'
import { CategoryPicker } from '@/components/common/CategoryPicker'
import { RoomCoverField } from '@/components/features/rooms/RoomCoverField'
import { createCompetition, deleteCompetition, updateCompetition, uploadCompetitionGroundTruth } from '@/lib/api/admin'
import { setFeatured } from '@/lib/api/announcements'
import { getCompetition, getCompetitions, uploadCompetitionCover } from '@/lib/api/competitions'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import { Switch } from '@/shared/switch'
import Textarea from '@/shared/Textarea'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { CompetitionSummary } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

const emptyForm = {
  slug: '',
  title: '',
  sponsor: '',
  status: 'upcoming',
  metric: 'Accuracy',
  prize_pool: '',
  starts_at: '',
  ends_at: '',
  overview_md: '',
  rules_md: '',
  dataset_info_md: '',
  daily_submission_limit: '5',
  max_score: '',
  cover_url: null as string | null,
}

function toDatetimeLocal(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminCompetitionsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CompetitionSummary | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const [subcategorySlug, setSubcategorySlug] = useState<string | null>(null)
  const [gtFile, setGtFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)

  const list = useQuery({ queryKey: ['admin', 'competitions'], queryFn: () => getCompetitions({ page_size: 50 }) })
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'competitions'] })
    qc.invalidateQueries({ queryKey: ['competitions'] })
    qc.invalidateQueries({ queryKey: ['discover'] })
  }

  const toggleFeatured = useMutation({
    mutationFn: ({ slug, featured }: { slug: string; featured: boolean }) =>
      setFeatured('competitions', slug, featured),
    onSuccess: invalidate,
  })

  const save = useMutation({
    mutationFn: async () => {
      let cover_url = form.cover_url
      if (coverFile) {
        const res = await uploadCompetitionCover(coverFile)
        cover_url = res.cover_url
      }
      const body = {
        ...form,
        daily_submission_limit: Number(form.daily_submission_limit) || 5,
        max_score: form.max_score ? Number(form.max_score) : null,
        prizes: [],
        tags: [],
        participants: editing?.participants ?? 0,
        cover_url,
        category: categorySlug,
        subcategory: subcategorySlug,
      }
      if (editing) {
        await updateCompetition(editing.slug, body)
        if (gtFile) await uploadCompetitionGroundTruth(editing.slug, gtFile)
        return
      }
      return createCompetition(body)
    },
    onSuccess: () => {
      invalidate()
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      setGtFile(null)
      setCoverFile(null)
      setCoverPreview(null)
    },
  })

  const remove = useMutation({
    mutationFn: (slug: string) => deleteCompetition(slug),
    onSuccess: invalidate,
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setCategorySlug(null)
    setSubcategorySlug(null)
    setGtFile(null)
    setCoverFile(null)
    setCoverPreview(null)
    setOpen(true)
  }

  const openEdit = async (c: CompetitionSummary) => {
    setLoadingEdit(c.slug)
    try {
      const full = await getCompetition(c.slug)
      setEditing(c)
      setForm({
        slug: c.slug,
        title: c.title,
        sponsor: c.sponsor ?? '',
        status: c.status,
        metric: c.metric,
        prize_pool: c.prize_pool ?? '',
        starts_at: toDatetimeLocal(c.starts_at),
        ends_at: toDatetimeLocal(c.ends_at),
        overview_md: full.overview_md,
        rules_md: full.rules_md,
        dataset_info_md: full.dataset_info_md,
        daily_submission_limit: String(full.daily_submission_limit),
        max_score: full.max_score != null ? String(full.max_score) : '',
        cover_url: c.cover_url ?? null,
      })
      setCategorySlug(c.category?.slug ?? null)
      setSubcategorySlug(c.subcategory?.slug ?? null)
      setCoverPreview(c.cover_url ?? null)
      setCoverFile(null)
      setGtFile(null)
      setOpen(true)
    } finally {
      setLoadingEdit(null)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate()
  }

  return (
    <div>
      <AdminPageHeader
        title="Kompetisi"
        description="Buat, ubah, dan hapus kompetisi sains data. Unggah banner untuk halaman detail."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button outline href="/admin/competitions/proposals">
              Pengajuan member
            </Button>
            <ButtonPrimary onClick={openCreate}>Buat baru</ButtonPrimary>
          </div>
        }
      />

      {list.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Judul</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Peserta</TableHeader>
                <TableHeader>Periode</TableHeader>
                <TableHeader>Pilihan</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(list.data?.items ?? []).map((c: CompetitionSummary) => (
                <TableRow key={c.slug}>
                  <TableCell>
                    <div className="font-medium">{c.title}</div>
                    {c.cover_url && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">Ada banner</span>
                    )}
                  </TableCell>
                  <TableCell>{c.status}</TableCell>
                  <TableCell>{c.participants}</TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {new Date(c.starts_at).toLocaleDateString('id-ID')} – {new Date(c.ends_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!!c.featured}
                      onChange={(v) => toggleFeatured.mutate({ slug: c.slug, featured: v })}
                      color="green"
                    />
                  </TableCell>
                  <TableCell nowrap className="space-x-2">
                    <Button outline onClick={() => openEdit(c)} disabled={loadingEdit === c.slug}>
                      {loadingEdit === c.slug ? 'Memuat...' : 'Edit'}
                    </Button>
                    <Button plain href={`/competitions/${c.slug}`} target="_blank">
                      Pratinjau
                    </Button>
                    <Button outline href={`/admin/competitions/${c.slug}/review`}>
                      Review
                    </Button>
                    <ConfirmDialog
                      label="Hapus"
                      danger
                      confirm={`Hapus kompetisi "${c.title}"? Tindakan ini permanen.`}
                      onConfirm={() => remove.mutate(c.slug)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
        </AdminContentCard>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} size="2xl">
        <form onSubmit={onSubmit}>
          <DialogTitle>{editing ? 'Edit kompetisi' : 'Buat kompetisi baru'}</DialogTitle>
          <DialogBody className="max-h-[75vh] space-y-4 overflow-y-auto">
            <RoomCoverField
              label="Banner halaman detail"
              previewAlt="Pratinjau banner kompetisi"
              previewUrl={coverPreview}
              onPreviewChange={setCoverPreview}
              onFileChange={setCoverFile}
              disabled={save.isPending}
            />

            <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required disabled={!!editing} className="!rounded-xl" />
            <Input placeholder="Judul" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="!rounded-xl" />
            <Input placeholder="Sponsor" value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} className="!rounded-xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="Status (active/upcoming/past)" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="!rounded-xl" />
              <Input placeholder="Metrik" value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} className="!rounded-xl" />
              <Input placeholder="Hadiah" value={form.prize_pool} onChange={(e) => setForm({ ...form, prize_pool: e.target.value })} className="!rounded-xl" />
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="!rounded-xl" />
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="!rounded-xl" />
              <Input
                type="number"
                min={1}
                placeholder="Batas submission/hari"
                value={form.daily_submission_limit}
                onChange={(e) => setForm({ ...form, daily_submission_limit: e.target.value })}
                className="!rounded-xl"
              />
              <Input
                type="number"
                step="any"
                placeholder="Skor maksimal (review admin)"
                value={form.max_score}
                onChange={(e) => setForm({ ...form, max_score: e.target.value })}
                className="!rounded-xl"
              />
            </div>
            {editing && (
              <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-600">
                <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">Ground truth (CSV)</p>
                <p className="mb-3 text-xs text-neutral-500">Kolom: id, target, split (public atau private)</p>
                <input type="file" accept=".csv" onChange={(e) => setGtFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
              </div>
            )}
            <Textarea placeholder="Ikhtisar (markdown)" value={form.overview_md} onChange={(e) => setForm({ ...form, overview_md: e.target.value })} rows={3} className="!rounded-xl" />
            <Textarea placeholder="Aturan (markdown)" value={form.rules_md} onChange={(e) => setForm({ ...form, rules_md: e.target.value })} rows={3} className="!rounded-xl" />
            <Textarea placeholder="Info dataset (markdown)" value={form.dataset_info_md} onChange={(e) => setForm({ ...form, dataset_info_md: e.target.value })} rows={2} className="!rounded-xl" />
            <CategoryPicker
              categorySlug={categorySlug}
              subcategorySlug={subcategorySlug}
              onChange={(cat, sub) => {
                setCategorySlug(cat)
                setSubcategorySlug(sub)
              }}
            />
            {editing && (
              <p className="text-xs text-neutral-500">
                Pratinjau publik:{' '}
                <Link href={`/competitions/${editing.slug}`} target="_blank" className="text-primary-600 underline">
                  /competitions/{editing.slug}
                </Link>
              </p>
            )}
          </DialogBody>
          <DialogActions>
            <Button outline type="button" onClick={() => setOpen(false)}>Batal</Button>
            <ButtonPrimary type="submit" disabled={save.isPending}>{save.isPending ? 'Menyimpan...' : 'Simpan'}</ButtonPrimary>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}
