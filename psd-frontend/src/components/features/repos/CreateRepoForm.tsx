'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createRepo, uploadRepoFile } from '@/lib/api/repos'
import { ApiError } from '@/lib/api/client'
import { fetchMyTeams, MY_TEAMS_QUERY_KEY } from '@/lib/teams/myTeamsQuery'
import { useAuth } from '@/lib/auth/useAuth'
import type { MyTeam, RepoKind } from '@/types/api'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { CategoryPicker } from '@/components/common/CategoryPicker'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Select from '@/shared/Select'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { useRouter, useSearchParams } from 'next/navigation'

const LICENSES = ['MIT', 'Apache-2.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'GPL-3.0']

const kindMeta: Record<RepoKind, { label: string; basePath: string }> = {
  project: { label: 'proyek', basePath: '/projects' },
  dataset: { label: 'dataset', basePath: '/datasets' },
  model: { label: 'model', basePath: '/models' },
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-_]*[a-z0-9])?$/

export function CreateRepoForm({ kind }: { kind: RepoKind }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoggedIn, isLoading } = useAuth()
  const meta = kindMeta[kind]

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [license, setLicense] = useState('MIT')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [readmeMd, setReadmeMd] = useState('')
  const [initialFile, setInitialFile] = useState<File | null>(null)
  const [categorySlug, setCategorySlug] = useState<string | null>(null)
  const [subcategorySlug, setSubcategorySlug] = useState<string | null>(null)
  const [ownerTeamId, setOwnerTeamId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const myTeamsQuery = useQuery({
    queryKey: MY_TEAMS_QUERY_KEY,
    queryFn: fetchMyTeams,
    enabled: isLoggedIn,
  })

  useEffect(() => {
    const tid = searchParams.get('team_id')
    if (tid) setOwnerTeamId(tid)
  }, [searchParams])

  const slugPreview = user && name ? `${user.username}/${name}` : '—'

  const create = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim()
      if (!SLUG_RE.test(trimmed)) {
        throw new Error('Nama hanya huruf kecil, angka, tanda hubung, dan garis bawah.')
      }
      const repo = await createRepo(kind, {
        name: trimmed,
        description,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        license: license || null,
        visibility,
        readme_md: readmeMd,
        category: categorySlug,
        subcategory: subcategorySlug,
        team_id: ownerTeamId || null,
      })
      if (initialFile) {
        try {
          await uploadRepoFile(repo.id, initialFile)
        } catch (err) {
          const msg =
            err instanceof ApiError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Gagal mengunggah file.'
          return { repo, uploadFailed: msg }
        }
      }
      return { repo, uploadFailed: null as string | null }
    },
    onSuccess: ({ repo, uploadFailed }) => {
      const [owner, repoName] = repo.slug.split('/')
      const params = new URLSearchParams({ published: '1' })
      if (uploadFailed) params.set('upload_error', '1')
      router.push(`${meta.basePath}/${owner}/${repoName}?${params.toString()}`)
    },
    onError: (e: Error) => setError(e.message || 'Gagal membuat aset.'),
  })

  if (!isLoading && !isLoggedIn) {
    return (
      <DetailPageShell>
        <div className="flex flex-col items-center rounded-3xl border border-dashed py-16 text-center">
          <p className="text-neutral-600">Masuk untuk membuat {meta.label}.</p>
          <ButtonPrimary href={`/login?next=${meta.basePath}/new`} className="mt-4">
            Masuk
          </ButtonPrimary>
        </div>
      </DetailPageShell>
    )
  }

  return (
    <DetailPageShell>
      <DetailPageHeader
        title={`Buat ${meta.label} baru`}
        subtitle="Isi metadata aset. Setelah dibuat, Anda bisa mengunggah file tambahan di halaman detail."
      />

      <div className="mx-auto max-w-2xl lg:max-w-4xl">
        <form
          className="space-y-6 rounded-3xl border border-neutral-200/80 bg-white p-6 lg:p-8 dark:border-neutral-700 dark:bg-neutral-800"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <Field>
            <Label>Nama aset</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="analisis-umkm-lampung"
              className="mt-1 !rounded-xl font-mono"
              required
            />
            <p className="mt-1 text-sm text-neutral-500">
              Slug: <span className="font-mono text-neutral-700 dark:text-neutral-300">{slugPreview}</span>
            </p>
          </Field>

          <Field>
            <Label>Deskripsi</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 !rounded-xl" required />
          </Field>

          <Field>
            <Label>Tags (pisahkan koma)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="nlp, lampung" className="mt-1 !rounded-xl" />
          </Field>

          <CategoryPicker
            categorySlug={categorySlug}
            subcategorySlug={subcategorySlug}
            onChange={(cat, sub) => {
              setCategorySlug(cat)
              setSubcategorySlug(sub)
            }}
          />

          {(myTeamsQuery.data?.length ?? 0) > 0 && (
            <Field>
              <Label>Pemilik</Label>
              <Select
                value={ownerTeamId}
                onChange={(e) => setOwnerTeamId(e.target.value)}
                className="mt-1 !rounded-xl"
              >
                <option value="">Diri sendiri ({user?.username})</option>
                {myTeamsQuery.data!.map((t: MyTeam) => (
                  <option key={t.id} value={t.id}>
                    Tim {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>Lisensi</Label>
              <Select value={license} onChange={(e) => setLicense(e.target.value)} className="mt-1 !rounded-xl">
                {LICENSES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Visibilitas</Label>
              <Select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
                className="mt-1 !rounded-xl"
              >
                <option value="public">Publik</option>
                <option value="private">Privat</option>
              </Select>
            </Field>
          </div>

          <Field>
            <Label>README awal (opsional)</Label>
            <Textarea value={readmeMd} onChange={(e) => setReadmeMd(e.target.value)} rows={5} className="mt-1 !rounded-xl font-mono text-sm" />
          </Field>

          <Field>
            <Label>File awal (opsional, ≤50MB)</Label>
            <Input
              type="file"
              className="mt-1 !rounded-xl"
              onChange={(e) => setInitialFile(e.target.files?.[0] ?? null)}
            />
          </Field>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <ButtonPrimary type="submit" disabled={create.isPending || !name.trim()}>
            {create.isPending ? 'Membuat...' : `Buat ${meta.label}`}
          </ButtonPrimary>
        </form>
      </div>
    </DetailPageShell>
  )
}
