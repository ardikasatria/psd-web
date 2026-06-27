'use client'

import { search } from '@/lib/api/search'
import { createPost, uploadPostImage } from '@/lib/api/social'
import { getMyGamification } from '@/lib/api/gamification'
import { useAuth } from '@/lib/auth/useAuth'
import type { RepoSummary } from '@/types/api'
import { RepoSummarySchema } from '@/types/api'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Textarea from '@/shared/Textarea'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE = 5 * 1024 * 1024

type AssetAttachment = { kind: string; slug: string; label: string }

export function PostComposer({
  initialAsset,
  onPosted,
  className,
}: {
  initialAsset?: { kind: string; slug: string }
  onPosted?: () => void
  className?: string
}) {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const perksQuery = useQuery({
    queryKey: ['me', 'gamification'],
    queryFn: getMyGamification,
    enabled: isLoggedIn,
    staleTime: 60_000,
  })
  const perks = perksQuery.data?.perks
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [asset, setAsset] = useState<AssetAttachment | null>(
    initialAsset ? { ...initialAsset, label: initialAsset.slug } : null
  )
  const [assetQuery, setAssetQuery] = useState('')
  const [assetResults, setAssetResults] = useState<RepoSummary[]>([])
  const [showAssetSearch, setShowAssetSearch] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const postMutation = useMutation({
    mutationFn: () =>
      createPost({
        body_md: body.trim(),
        images,
        asset: asset ? { kind: asset.kind, slug: asset.slug } : undefined,
      }),
    onSuccess: async () => {
      setBody('')
      setImages([])
      if (!initialAsset) setAsset(null)
      setError(null)
      await qc.invalidateQueries({ queryKey: ['feed'] })
      await qc.invalidateQueries({ queryKey: ['feed-stats'] })
      onPosted?.()
    },
    onError: () => setError('Gagal mengirim postingan. Coba lagi.'),
  })

  async function handleImages(files: FileList | null) {
    if (!files?.length) return
    if (!isLoggedIn) {
      router.push(`/login?next=${window.location.pathname}`)
      return
    }
    setUploading(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        if (!ALLOWED_IMAGE.includes(file.type)) {
          setError('Format gambar harus JPG, PNG, atau WebP.')
          continue
        }
        if (file.size > MAX_IMAGE) {
          setError('Ukuran gambar maksimal 5 MB.')
          continue
        }
        const res = await uploadPostImage(file)
        setImages((prev) => [...prev, res.url])
      }
    } catch {
      setError('Gagal mengunggah gambar.')
    } finally {
      setUploading(false)
    }
  }

  async function searchAssets(q: string) {
    setAssetQuery(q)
    if (q.length < 2) {
      setAssetResults([])
      return
    }
    try {
      const res = await search(q, 'repos')
      setAssetResults(res.repos.map((r) => RepoSummarySchema.parse(r)))
    } catch {
      setAssetResults([])
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isLoggedIn) {
      router.push(`/login?next=${window.location.pathname}`)
      return
    }
    if (!body.trim() && images.length === 0 && !asset) {
      setError('Tulis sesuatu, tambahkan foto, atau lampirkan aset.')
      return
    }
    postMutation.mutate()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/50 ${className ?? ''}`}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Apa yang sedang Anda kerjakan?"
        rows={3}
        className="!rounded-xl !border-0 !bg-neutral-50 !shadow-none focus:!ring-2 focus:!ring-primary-500/30 dark:!bg-neutral-800"
      />

      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((url) => (
            <div key={url} className="relative size-20 overflow-hidden rounded-lg">
              <Image src={url} alt="" fill className="object-cover" sizes="80px" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                className="absolute end-1 top-1 rounded-full bg-black/50 p-0.5 text-white"
                aria-label="Hapus gambar"
              >
                <XMarkIcon className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {asset && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50/50 px-3 py-2 text-sm dark:border-primary-800 dark:bg-primary-900/20">
          <span className="font-medium text-primary-700 dark:text-primary-300">{asset.label}</span>
          {!initialAsset && (
            <button type="button" onClick={() => setAsset(null)} className="ms-auto text-neutral-400 hover:text-neutral-600">
              <XMarkIcon className="size-4" />
            </button>
          )}
        </div>
      )}

      {showAssetSearch && (
        <div className="mt-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
          <input
            type="search"
            value={assetQuery}
            onChange={(e) => void searchAssets(e.target.value)}
            placeholder="Cari aset PSD..."
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          />
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {assetResults.map((repo) => (
              <li key={repo.id}>
                <button
                  type="button"
                  className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => {
                    setAsset({ kind: repo.kind, slug: repo.slug, label: `${repo.name} (${repo.kind})` })
                    setShowAssetSearch(false)
                    setAssetQuery('')
                    setAssetResults([])
                  }}
                >
                  <span className="font-medium">{repo.name}</span>
                  <span className="ms-2 text-xs text-neutral-500">@{repo.owner.username}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {perks && (
        <p className="mt-2 text-xs text-neutral-500">
          Batas hari ini: hingga {perks.daily_post_limit} posting · maks {perks.post_image_max} gambar
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => void handleImages(e.target.files)}
              disabled={uploading}
            />
            <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800">
              <PhotoIcon className="size-5" />
              Foto
            </span>
          </label>
          {!initialAsset && (
            <Button type="button" outline onClick={() => setShowAssetSearch((v) => !v)}>
              Lampirkan aset
            </Button>
          )}
        </div>
        <ButtonPrimary type="submit" disabled={postMutation.isPending || uploading}>
          {postMutation.isPending ? 'Mengirim...' : 'Posting'}
        </ButtonPrimary>
      </div>
    </form>
  )
}
