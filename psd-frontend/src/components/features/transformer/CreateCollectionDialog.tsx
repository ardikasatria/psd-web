'use client'

import { CategoryPicker } from '@/components/common/CategoryPicker'
import { createCollection } from '@/lib/api/collections'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/shared/dialog'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

export function CreateCollectionDialog({ open, onClose }: Props) {
  const router = useRouter()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [descriptionMd, setDescriptionMd] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [categorySlug, setCategorySlug] = useState<string | null>('transformer')
  const [subcategorySlug, setSubcategorySlug] = useState<string | null>(null)
  const [isFeatured, setIsFeatured] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      createCollection({
        title: title.trim(),
        description_md: descriptionMd.trim(),
        cover_url: coverUrl.trim() || null,
        category: categorySlug,
        is_featured: isFeatured,
        items: [],
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      qc.invalidateQueries({ queryKey: ['transformer-hub'] })
      onClose()
      router.push(`/collections/${res.slug}`)
    },
    onError: (e: Error) => setError(e.message),
  })

  function handleClose() {
    setTitle('')
    setDescriptionMd('')
    setCoverUrl('')
    setCategorySlug('transformer')
    setSubcategorySlug(null)
    setIsFeatured(false)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} size="lg">
      <DialogTitle>Buat koleksi kurasi</DialogTitle>
      <DialogBody className="space-y-4">
        <Field>
          <Label>Judul koleksi</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Model Bahasa Indonesia" />
        </Field>
        <Field>
          <Label>Deskripsi (Markdown)</Label>
          <Textarea
            value={descriptionMd}
            onChange={(e) => setDescriptionMd(e.target.value)}
            rows={4}
            placeholder="Jelaskan tujuan kurasi dan aset yang akan dimasukkan…"
          />
        </Field>
        <Field>
          <Label>URL cover (opsional)</Label>
          <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
        </Field>
        <Field>
          <Label>Kategori</Label>
          <CategoryPicker
            categorySlug={categorySlug}
            subcategorySlug={subcategorySlug}
            onChange={(cat, sub) => {
              setCategorySlug(cat)
              setSubcategorySlug(sub)
            }}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          Tampilkan sebagai koleksi unggulan di Ruang Transformer
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </DialogBody>
      <DialogActions>
        <Button type="button" plain onClick={handleClose}>
          Batal
        </Button>
        <ButtonPrimary
          type="button"
          disabled={!title.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Menyimpan…' : 'Buat koleksi'}
        </ButtonPrimary>
      </DialogActions>
    </Dialog>
  )
}
