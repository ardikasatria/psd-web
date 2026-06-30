'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton, AdminTable, ConfirmDialog } from '@/components/admin/AdminShared'
import { MediaGalleryField } from '@/components/common/MediaGalleryField'
import { CategoryPicker } from '@/components/common/CategoryPicker'
import { RoomCoverField } from '@/components/features/rooms/RoomCoverField'
import { createEvent, deleteEvent, updateEvent } from '@/lib/api/admin'
import { setFeatured } from '@/lib/api/announcements'
import { getEvent, getEvents, uploadEventCover } from '@/lib/api/events'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { Switch } from '@/shared/switch'
import Textarea from '@/shared/Textarea'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { EventSummary } from '@/types/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

const emptyForm = {
  slug: '',
  title: '',
  type: 'webinar',
  mode: 'daring',
  status: 'upcoming',
  starts_at: '',
  ends_at: '',
  location: '',
  capacity: '',
  description_md: '',
  cover_url: null as string | null,
  gallery_urls: [] as string[],
}

function toDatetimeLocal(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminEventsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EventSummary | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const [subcategorySlug, setSubcategorySlug] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null)

  const list = useQuery({ queryKey: ['admin', 'events'], queryFn: () => getEvents({ page_size: 50 }) })
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'events'] })
    qc.invalidateQueries({ queryKey: ['events'] })
  }

  const toggleFeatured = useMutation({
    mutationFn: ({ slug, featured }: { slug: string; featured: boolean }) => setFeatured('events', slug, featured),
    onSuccess: invalidate,
  })

  const save = useMutation({
    mutationFn: async () => {
      let cover_url = form.cover_url
      if (coverFile) {
        const res = await uploadEventCover(coverFile)
        cover_url = res.cover_url
      }
      const body = {
        ...form,
        capacity: form.capacity ? Number(form.capacity) : null,
        cover_url,
        gallery_urls: form.gallery_urls,
        agenda: [],
        speakers: [],
        registered: editing?.registered ?? 0,
        category: categorySlug,
        subcategory: subcategorySlug,
      }
      if (editing) return updateEvent(editing.slug, body)
      return createEvent(body)
    },
    onSuccess: () => {
      invalidate()
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      setCoverFile(null)
      setCoverPreview(null)
    },
  })

  const remove = useMutation({ mutationFn: deleteEvent, onSuccess: invalidate })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setCategorySlug(null)
    setSubcategorySlug(null)
    setCoverPreview(null)
    setCoverFile(null)
    setOpen(true)
  }

  const openEdit = async (e: EventSummary) => {
    setLoadingEdit(e.slug)
    try {
      const full = await getEvent(e.slug)
      setEditing(e)
      setForm({
        slug: e.slug,
        title: e.title,
        type: e.type,
        mode: e.mode,
        status: e.status ?? 'upcoming',
        starts_at: toDatetimeLocal(e.starts_at),
        ends_at: toDatetimeLocal(e.ends_at),
        location: e.location ?? '',
        capacity: e.capacity?.toString() ?? '',
        description_md: full.description_md,
        cover_url: e.cover_url ?? null,
        gallery_urls: full.gallery_urls ?? [],
      })
      setCategorySlug(e.category?.slug ?? null)
      setSubcategorySlug(e.subcategory?.slug ?? null)
      setCoverPreview(e.cover_url ?? null)
      setOpen(true)
    } finally {
      setLoadingEdit(null)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Event"
        description="Kelola event komunitas — banner, carousel foto, dan detail."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button outline href="/admin/events/proposals">
              Pengajuan member
            </Button>
            <ButtonPrimary onClick={openCreate}>Buat event baru</ButtonPrimary>
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
                <TableHeader>Tipe</TableHeader>
                <TableHeader>Mode</TableHeader>
                <TableHeader>Media</TableHeader>
                <TableHeader>Pilihan</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(list.data?.items ?? []).map((e: EventSummary) => (
                <TableRow key={e.slug}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>{e.type}</TableCell>
                  <TableCell>{e.mode}</TableCell>
                  <TableCell className="text-xs text-neutral-500">
                    {e.cover_url ? 'Banner' : '—'}
                    {(e.gallery_urls?.length ?? 0) > 0 && ` · ${e.gallery_urls!.length} foto`}
                  </TableCell>
                  <TableCell>
                    <Switch checked={!!e.featured} onChange={(v) => toggleFeatured.mutate({ slug: e.slug, featured: v })} color="green" />
                  </TableCell>
                  <TableCell nowrap className="space-x-2">
                    <Button outline href={`/admin/events/${e.slug}`}>Peserta</Button>
                    <Button outline onClick={() => openEdit(e)} disabled={loadingEdit === e.slug}>
                      {loadingEdit === e.slug ? 'Memuat...' : 'Edit'}
                    </Button>
                    <Button plain href={`/events/${e.slug}`} target="_blank">
                      Pratinjau
                    </Button>
                    <ConfirmDialog label="Hapus" danger confirm={`Hapus event "${e.title}"?`} onConfirm={() => remove.mutate(e.slug)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
        </AdminContentCard>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} size="2xl">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate() }}>
          <DialogTitle>{editing ? 'Edit event' : 'Buat event baru'}</DialogTitle>
          <DialogBody className="max-h-[75vh] space-y-4 overflow-y-auto">
            <RoomCoverField label="Banner utama" previewAlt="Banner event" previewUrl={coverPreview} onPreviewChange={setCoverPreview} onFileChange={setCoverFile} disabled={save.isPending} />
            <MediaGalleryField urls={form.gallery_urls} onChange={(gallery_urls) => setForm({ ...form, gallery_urls })} disabled={save.isPending} />
            <Input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required disabled={!!editing} className="!rounded-xl" />
            <Input placeholder="Judul" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="!rounded-xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="!rounded-xl">
                <option value="webinar">Webinar</option>
                <option value="hackathon">Hackathon</option>
                <option value="bootcamp">Bootcamp</option>
                <option value="meetup">Meetup</option>
                <option value="demo_day">Demo day</option>
              </Select>
              <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="!rounded-xl">
                <option value="daring">Daring</option>
                <option value="luring">Luring</option>
              </Select>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="!rounded-xl" />
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="!rounded-xl" />
              <Input placeholder="Lokasi" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="!rounded-xl" />
              <Input placeholder="Kapasitas" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="!rounded-xl" />
            </div>
            <Textarea placeholder="Deskripsi" value={form.description_md} onChange={(e) => setForm({ ...form, description_md: e.target.value })} rows={4} className="!rounded-xl" />
            <CategoryPicker categorySlug={categorySlug} subcategorySlug={subcategorySlug} onChange={(cat, sub) => { setCategorySlug(cat); setSubcategorySlug(sub) }} />
            {editing && (
              <p className="text-xs text-neutral-500">
                Pratinjau: <Link href={`/events/${editing.slug}`} target="_blank" className="text-primary-600 underline">/events/{editing.slug}</Link>
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
