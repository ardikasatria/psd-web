'use client'

import {
  emptyProposalForm,
  slugifyTitle,
  type ProposalFormState,
} from '@/components/features/competitions/competition-proposal-utils'
import { CategoryPicker } from '@/components/common/CategoryPicker'
import { RoomCoverField } from '@/components/features/rooms/RoomCoverField'
import { uploadCompetitionCover } from '@/lib/api/competitions'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { FormEvent, useState } from 'react'

type Props = {
  initial?: Partial<ProposalFormState>
  categorySlug?: string | null
  subcategorySlug?: string | null
  onCategoryChange?: (cat: string | null, sub: string | null) => void
  onSubmit: (form: ProposalFormState, submit: boolean) => void | Promise<void>
  pending?: boolean
  showSlug?: boolean
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

export function CompetitionProposalForm({
  initial,
  categorySlug = null,
  subcategorySlug = null,
  onCategoryChange,
  onSubmit,
  pending,
  showSlug = true,
}: Props) {
  const [form, setForm] = useState<ProposalFormState>({ ...emptyProposalForm(), ...initial })
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
        const res = await uploadCompetitionCover(coverFile)
        cover_url = res.cover_url
      } finally {
        setUploadingCover(false)
      }
    }
    await onSubmit({ ...form, cover_url }, submit)
  }

  const busy = pending || uploadingCover

  const saveDraft = () => {
    void handleSubmit({ preventDefault: () => {} } as FormEvent, false)
  }

  return (
    <form className="space-y-4" onSubmit={(e) => void handleSubmit(e, true)}>
      <RoomCoverField
        label="Banner / cover kompetisi"
        previewAlt="Pratinjau banner kompetisi"
        previewUrl={coverPreview}
        onPreviewChange={setCoverPreview}
        onFileChange={setCoverFile}
        disabled={busy}
      />

      <FieldLabel label="Judul kompetisi" hint="Nama yang tampil di halaman publik.">
        <Input
          value={form.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Contoh: Prediksi Permintaan Produk UMKM"
          required
          className="!rounded-xl"
        />
      </FieldLabel>

      {showSlug && (
        <FieldLabel label="Alamat URL (slug)" hint="Otomatis dari judul. Contoh: prediksi-permintaan-umkm">
          <Input
            value={form.proposed_slug}
            onChange={(e) => {
              setSlugTouched(true)
              setForm({ ...form, proposed_slug: e.target.value })
            }}
            placeholder="prediksi-permintaan-umkm"
            required
            className="!rounded-xl font-mono text-sm"
          />
        </FieldLabel>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="Penyelenggara / sponsor">
          <Input
            value={form.sponsor}
            onChange={(e) => setForm({ ...form, sponsor: e.target.value })}
            placeholder="Nama instansi atau komunitas"
            className="!rounded-xl"
          />
        </FieldLabel>
        <FieldLabel label="Metrik penilaian">
          <Input
            value={form.metric}
            onChange={(e) => setForm({ ...form, metric: e.target.value })}
            placeholder="Accuracy, RMSLE, F1 Score, ..."
            className="!rounded-xl"
          />
        </FieldLabel>
        <FieldLabel label="Total hadiah (teks tampilan)">
          <Input
            value={form.prize_pool}
            onChange={(e) => setForm({ ...form, prize_pool: e.target.value })}
            placeholder="Rp10.000.000"
            className="!rounded-xl"
          />
        </FieldLabel>
        <FieldLabel label="Batas submission/hari">
          <Input
            type="number"
            min={1}
            value={form.daily_submission_limit}
            onChange={(e) => setForm({ ...form, daily_submission_limit: e.target.value })}
            className="!rounded-xl"
          />
        </FieldLabel>
        <FieldLabel label="Mulai">
          <Input
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            required
            className="!rounded-xl"
          />
        </FieldLabel>
        <FieldLabel label="Berakhir">
          <Input
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            required
            className="!rounded-xl"
          />
        </FieldLabel>
      </div>

      {onCategoryChange && (
        <CategoryPicker
          categorySlug={categorySlug}
          subcategorySlug={subcategorySlug}
          onChange={onCategoryChange}
        />
      )}

      <FieldLabel label="Ikhtisar kompetisi">
        <Textarea
          value={form.overview_md}
          onChange={(e) => setForm({ ...form, overview_md: e.target.value })}
          rows={4}
          placeholder="Jelaskan tujuan, audiens, dan latar belakang kompetisi..."
          className="!rounded-xl"
        />
      </FieldLabel>

      <FieldLabel label="Aturan">
        <Textarea
          value={form.rules_md}
          onChange={(e) => setForm({ ...form, rules_md: e.target.value })}
          rows={3}
          placeholder="Aturan tim, batas submission, kode etik..."
          className="!rounded-xl"
        />
      </FieldLabel>

      <FieldLabel label="Informasi dataset">
        <Textarea
          value={form.dataset_info_md}
          onChange={(e) => setForm({ ...form, dataset_info_md: e.target.value })}
          rows={3}
          placeholder="Deskripsi dataset, format file, cara akses..."
          className="!rounded-xl"
        />
      </FieldLabel>

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={saveDraft}
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          {busy ? 'Menyimpan...' : 'Simpan draf'}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {busy ? 'Mengirim...' : 'Ajukan ke tim humas'}
        </button>
      </div>
    </form>
  )
}
