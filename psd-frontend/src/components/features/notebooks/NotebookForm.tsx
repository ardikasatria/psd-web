'use client'

import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { CategoryPicker } from '@/components/common/CategoryPicker'
import { createNotebook, getNotebook, updateNotebook } from '@/lib/api/notebooks'
import { getMyTeams } from '@/lib/api/teams'
import { GITHUB_IPYNB_HINT, previewColabUrl } from '@/lib/notebooks/colab'
import { useAuth } from '@/lib/auth/useAuth'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Select from '@/shared/Select'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import type { MyTeam } from '@/types/api'

function TagsInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('')

  const addTag = () => {
    const tag = draft.trim().toLowerCase()
    if (!tag || value.includes(tag)) {
      setDraft('')
      return
    }
    onChange([...value, tag])
    setDraft('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="group"
          >
            <Badge color="zinc" className="cursor-pointer group-hover:ring-2 group-hover:ring-red-300">
              {tag} ×
            </Badge>
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
          }}
          placeholder="Ketik tag lalu Enter"
          className="!rounded-xl"
        />
        <ButtonPrimary type="button" onClick={addTag}>
          Tambah
        </ButtonPrimary>
      </div>
    </div>
  )
}

export function NotebookForm({ id }: { id?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoggedIn, isLoading: authLoading } = useAuth()
  const isEdit = Boolean(id)

  const existing = useQuery({
    enabled: isEdit && !!id,
    queryKey: ['notebook', id],
    queryFn: () => getNotebook(id!),
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [sourceUrl, setSourceUrl] = useState('')
  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const [subcategorySlug, setSubcategorySlug] = useState<string | null>(null)
  const [ownerTeamId, setOwnerTeamId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const myTeamsQuery = useQuery({
    queryKey: ['my-teams'],
    queryFn: async () => {
      const res = await getMyTeams()
      return res.items as MyTeam[]
    },
    enabled: isLoggedIn && !isEdit,
  })

  useEffect(() => {
    const tid = searchParams.get('team_id')
    if (tid && !isEdit) setOwnerTeamId(tid)
  }, [searchParams, isEdit])

  useEffect(() => {
    if (existing.data) {
      setTitle(existing.data.title)
      setDescription(existing.data.description)
      setTags(existing.data.tags)
      setSourceUrl(existing.data.source_url ?? '')
      setCategorySlug(existing.data.category?.slug ?? null)
      setSubcategorySlug(existing.data.subcategory?.slug ?? null)
    }
  }, [existing.data])

  const colabPreview = previewColabUrl(sourceUrl)

  const save = useMutation({
    mutationFn: async () => {
      const trimmedTitle = title.trim()
      if (!trimmedTitle) throw new Error('Judul wajib diisi.')
      if (sourceUrl.trim()) {
        try {
          new URL(sourceUrl.trim())
        } catch {
          throw new Error('URL sumber tidak valid.')
        }
      }
      if (isEdit && id) {
        return updateNotebook(id, {
          title: trimmedTitle,
          description: description.trim(),
          tags,
          source_url: sourceUrl.trim() || null,
          category: categorySlug,
          subcategory: subcategorySlug,
        })
      }
      return createNotebook({
        title: trimmedTitle,
        description: description.trim(),
        tags,
        source_url: sourceUrl.trim(),
        category: categorySlug,
        subcategory: subcategorySlug,
        team_id: ownerTeamId || null,
      })
    },
    onSuccess: (nb) => router.push(`/notebooks/${nb.id}`),
    onError: (e: Error) => setError(e.message || 'Gagal menyimpan notebook.'),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    save.mutate()
  }

  if (!authLoading && !isLoggedIn) {
    return (
      <DetailPageShell>
        <div className="flex flex-col items-center rounded-3xl border border-dashed py-16 text-center">
          <p className="text-neutral-600">Masuk untuk membagikan notebook.</p>
          <ButtonPrimary href={`/login?next=/notebooks/new`} className="mt-4">
            Masuk
          </ButtonPrimary>
        </div>
      </DetailPageShell>
    )
  }

  if (isEdit && existing.isLoading) {
    return (
      <DetailPageShell>
        <p className="text-neutral-500">Memuat notebook…</p>
      </DetailPageShell>
    )
  }

  return (
    <DetailPageShell>
      <Link
        href={isEdit ? `/notebooks/${id}` : '/notebooks'}
        className="inline-flex text-sm font-medium text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400"
      >
        ← {isEdit ? 'Kembali ke detail' : 'Semua notebook'}
      </Link>

      <form onSubmit={onSubmit} className="mt-6 space-y-8">
        <DetailPageHeader
          title={isEdit ? 'Edit notebook' : 'Bagikan notebook'}
          subtitle="Tautkan file .ipynb di GitHub agar anggota komunitas dapat membukanya langsung di Colab."
        />

        <div className="max-w-2xl space-y-6 rounded-2xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-800">
          <Field>
            <Label>Judul</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="!rounded-xl" />
          </Field>

          <Field>
            <Label>Deskripsi</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="!rounded-xl"
            />
          </Field>

          <Field>
            <Label>Tag</Label>
            <TagsInput value={tags} onChange={setTags} />
          </Field>

          <CategoryPicker
            categorySlug={categorySlug}
            subcategorySlug={subcategorySlug}
            onChange={(cat, sub) => {
              setCategorySlug(cat)
              setSubcategorySlug(sub)
            }}
          />

          {!isEdit && (myTeamsQuery.data?.length ?? 0) > 0 && (
            <Field>
              <Label>Pemilik</Label>
              <Select
                value={ownerTeamId}
                onChange={(e) => setOwnerTeamId(e.target.value)}
                className="!rounded-xl"
              >
                <option value="">Diri sendiri</option>
                {myTeamsQuery.data!.map((t: MyTeam) => (
                  <option key={t.id} value={t.id}>
                    Tim {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field>
            <Label>URL sumber (.ipynb)</Label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder={GITHUB_IPYNB_HINT}
              className="!rounded-xl"
            />
            <p className="mt-2 text-xs text-neutral-500">
              Format GitHub yang didukung Colab:{' '}
              <code className="rounded bg-neutral-100 px-1 py-0.5 dark:bg-neutral-700">{GITHUB_IPYNB_HINT}</code>
            </p>
            {sourceUrl.trim() && (
              <div
                className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                  colabPreview
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                {colabPreview ? (
                  <CheckCircleIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
                ) : (
                  <XCircleIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
                )}
                <span>
                  {colabPreview
                    ? 'Tombol "Buka di Colab" akan aktif setelah disimpan.'
                    : 'URL ini bukan GitHub .ipynb — Colab tidak akan tersedia; pengguna tetap bisa melihat sumber.'}
                </span>
              </div>
            )}
          </Field>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <ButtonPrimary type="submit" disabled={save.isPending}>
              {save.isPending ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Bagikan notebook'}
            </ButtonPrimary>
            <Button href={isEdit ? `/notebooks/${id}` : '/notebooks'} outline>
              Batal
            </Button>
          </div>
        </div>
      </form>
    </DetailPageShell>
  )
}
