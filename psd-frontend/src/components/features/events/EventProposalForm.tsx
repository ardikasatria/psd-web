'use client'

import { MediaGalleryField } from '@/components/common/MediaGalleryField'
import { CategoryPicker } from '@/components/common/CategoryPicker'
import {
  emptyEventProposalForm,
  slugifyTitle,
  type EventProposalFormState,
} from '@/components/features/events/event-proposal-utils'
import { RoomCoverField } from '@/components/features/rooms/RoomCoverField'
import { uploadEventCover } from '@/lib/api/events'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import Textarea from '@/shared/Textarea'
import { FormEvent, useState } from 'react'

type Props = {
  initial?: Partial<EventProposalFormState>
  categorySlug?: string | null
  subcategorySlug?: string | null
  onCategoryChange?: (cat: string | null, sub: string | null) => void
  onSubmit: (form: EventProposalFormState, submit: boolean) => void | Promise<void>
  pending?: boolean
}

function FieldLabel({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</span>
      {hint && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export function EventProposalForm({
  initial,
  categorySlug = null,
  subcategorySlug = null,
  onCategoryChange,
  onSubmit,
  pending,
}: Props) {
  const [form, setForm] = useState<EventProposalFormState>({ ...emptyEventProposalForm(), ...initial })
  const [slugTouched, setSlugTouched] = useState(!!initial?.proposed_slug)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.cover_url ?? null)
  const [uploadingCover, setUploadingCover] = useState(false)

  const onTitleChange = (title: string) => {
    const next = { ...form, title }
    if (!slugTouched) next.proposed_slug = slugifyTitle(title)
    setForm(next)
  }

  const handleSubmit = async (e: FormEvent, submit: boolean) => {
    e.preventDefault()
    let cover_url = form.cover_url
    if (coverFile) {
      setUploadingCover(true)
      try {
        const res = await uploadEventCover(coverFile)
        cover_url = res.cover_url
      } finally {
        setUploadingCover(false)
      }
    }
    await onSubmit({ ...form, cover_url }, submit)
  }

  const busy = pending || uploadingCover
  const saveDraft = () => void handleSubmit({ preventDefault: () => {} } as FormEvent, false)

  return (
    <form className="space-y-4" onSubmit={(e) => void handleSubmit(e, true)}>
      <RoomCoverField
        label="Banner utama event"
        previewAlt="Pratinjau banner event"
        previewUrl={coverPreview}
        onPreviewChange={setCoverPreview}
        onFileChange={setCoverFile}
        disabled={busy}
      />

      <MediaGalleryField
        urls={form.gallery_urls}
        onChange={(gallery_urls) => setForm({ ...form, gallery_urls })}
        disabled={busy}
      />

      <FieldLabel label="Judul event">
        <Input value={form.title} onChange={(e) => onTitleChange(e.target.value)} required className="!rounded-xl" />
      </FieldLabel>

      <FieldLabel label="Alamat URL (slug)" hint="Otomatis dari judul">
        <Input
          value={form.proposed_slug}
          onChange={(e) => {
            setSlugTouched(true)
            setForm({ ...form, proposed_slug: e.target.value })
          }}
          required
          className="!rounded-xl font-mono text-sm"
        />
      </FieldLabel>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Tipe event">
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="!rounded-xl">
            <option value="webinar">Webinar</option>
            <option value="hackathon">Hackathon</option>
            <option value="bootcamp">Bootcamp</option>
            <option value="meetup">Meetup</option>
            <option value="demo_day">Demo day</option>
          </Select>
        </FieldLabel>
        <FieldLabel label="Mode">
          <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="!rounded-xl">
            <option value="daring">Daring</option>
            <option value="luring">Luring</option>
          </Select>
        </FieldLabel>
        <FieldLabel label="Mulai">
          <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} required className="!rounded-xl" />
        </FieldLabel>
        <FieldLabel label="Selesai">
          <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} required className="!rounded-xl" />
        </FieldLabel>
        <FieldLabel label="Lokasi">
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Alamat atau kosongkan jika daring" className="!rounded-xl" />
        </FieldLabel>
        <FieldLabel label="Kapasitas (opsional)">
          <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="!rounded-xl" />
        </FieldLabel>
      </div>

      {onCategoryChange && (
        <CategoryPicker categorySlug={categorySlug} subcategorySlug={subcategorySlug} onChange={onCategoryChange} />
      )}

      <FieldLabel label="Deskripsi event">
        <Textarea
          value={form.description_md}
          onChange={(e) => setForm({ ...form, description_md: e.target.value })}
          rows={5}
          placeholder="Jelaskan tujuan event, audiens, dan manfaat untuk peserta..."
          className="!rounded-xl"
        />
      </FieldLabel>

      <div className="flex flex-wrap gap-2 pt-2">
        <button type="button" disabled={busy} onClick={saveDraft} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-600">
          {busy ? 'Menyimpan...' : 'Simpan draf'}
        </button>
        <button type="submit" disabled={busy} className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy ? 'Mengirim...' : 'Ajukan ke tim humas'}
        </button>
      </div>
    </form>
  )
}
