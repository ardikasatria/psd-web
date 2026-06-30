'use client'

import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { CategoryPicker } from '@/components/common/CategoryPicker'
import { NotebookHubCallout } from '@/components/features/notebooks/NotebookHubCallout'
import { createNotebook, getNotebook, updateNotebook } from '@/lib/api/notebooks'
import { fetchMyTeams, MY_TEAMS_QUERY_KEY } from '@/lib/teams/myTeamsQuery'
import { GIT_IPYNB_HINT, isGitNotebookUrl } from '@/lib/notebooks/source'
import { useAuth } from '@/lib/auth/useAuth'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Select from '@/shared/Select'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Button } from '@/shared/Button'
import { Badge } from '@/shared/Badge'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
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

const WORKFLOW_STEPS = [
  'Buka Jupyter Notebook dan buat atau edit notebook di folder kerja.',
  'Gunakan SDK psd:// untuk memuat dataset PSD.',
  'Push berkas .ipynb ke Git (Gitea PSD) — lihat panduan Simpan & push.',
  'Isi form di bawah untuk mendaftarkan notebook ke katalog komunitas.',
] as const

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
    queryKey: MY_TEAMS_QUERY_KEY,
    queryFn: fetchMyTeams,
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

  const gitSourceOk = !sourceUrl.trim() || isGitNotebookUrl(sourceUrl)

  const save = useMutation({
    mutationFn: async () => {
      const trimmedTitle = title.trim()
      if (!trimmedTitle) throw new Error('Judul wajib diisi.')
      const trimmedSource = sourceUrl.trim()
      if (trimmedSource) {
        try {
          new URL(trimmedSource)
        } catch {
          throw new Error('URL sumber tidak valid.')
        }
      }
      const payload = {
        title: trimmedTitle,
        description: description.trim(),
        tags,
        source_url: trimmedSource || null,
        category: categorySlug,
        subcategory: subcategorySlug,
      }
      if (isEdit && id) {
        return updateNotebook(id, payload)
      }
      return createNotebook({
        ...payload,
        source_url: trimmedSource || null,
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
          subtitle="Daftarkan notebook ke katalog PSD — kerjakan di Jupyter Notebook, simpan ke Git, lalu bagikan metadata ke komunitas."
        />

        <NotebookHubCallout />

        {!isEdit && (
          <ol className="max-w-2xl space-y-2 rounded-2xl border border-neutral-200/80 bg-white p-5 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            {WORKFLOW_STEPS.map((step, i) => (
              <li key={step} className="flex gap-3 text-neutral-700 dark:text-neutral-300">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        )}

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
              placeholder="Apa yang dipelajari, dataset yang dipakai, dan insight utama…"
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
            <Label>Link berkas .ipynb di Git (opsional)</Label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder={GIT_IPYNB_HINT}
              className="!rounded-xl"
            />
            <p className="mt-2 text-xs text-neutral-500">
              URL ke berkas notebook setelah di-push ke Gitea PSD atau GitHub — contoh:{' '}
              <code className="rounded bg-neutral-100 px-1 py-0.5 dark:bg-neutral-700">
                git.projeksainsdata.com/…/notebook.ipynb
              </code>
            </p>
            {sourceUrl.trim() && gitSourceOk && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircleIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>Link Git valid — pembaca bisa melihat sumber dan membuka notebook di Jupyter Notebook.</span>
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
