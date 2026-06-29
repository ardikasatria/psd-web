'use client'

import { useEffect, useState } from 'react'
import { QueryState } from '@/components/features/QueryState'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { SettingsToggleRow } from '@/components/features/settings/SettingsToggleRow'
import {
  getLikedSummary,
  getMyLiked,
  getUserLiked,
  setItemVisibility,
  setLikedListSettings,
} from '@/lib/api/liked'
import { formatCompactCount } from '@/lib/utils/format'
import type { LikedAsset, LikedSummary, PaginatedLikedAsset } from '@/types/api'
import { Badge } from '@/shared/Badge'
import { Switch, SwitchField } from '@/shared/switch'
import { Label } from '@/shared/fieldset'
import {
  ArrowDownTrayIcon,
  BeakerIcon,
  BookOpenIcon,
  CubeIcon,
  EyeIcon,
  EyeSlashIcon,
  FolderIcon,
  HeartIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const kindLabel: Record<string, string> = {
  project: 'Proyek',
  dataset: 'Dataset',
  model: 'Model',
  notebook: 'Notebook',
}

const kindIcon: Record<string, typeof FolderIcon> = {
  project: FolderIcon,
  dataset: CubeIcon,
  model: BeakerIcon,
  notebook: BookOpenIcon,
}

const kindColor: Record<string, string> = {
  project: 'text-primary-600 dark:text-primary-400',
  dataset: 'text-blue-600 dark:text-blue-400',
  model: 'text-violet-600 dark:text-violet-400',
  notebook: 'text-amber-600 dark:text-amber-400',
}

function formatLikedAt(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function LikedAssetCard({
  item,
  isOwner,
  onToggleVisibility,
  togglingKey,
}: {
  item: LikedAsset
  isOwner: boolean
  onToggleVisibility?: (item: LikedAsset, next: boolean) => void
  togglingKey?: string | null
}) {
  const Icon = kindIcon[item.kind] ?? FolderIcon
  const href = item.href ?? '/explore'
  const rowKey = `${item.kind}:${item.slug}`
  const toggling = togglingKey === rowKey

  return (
    <div className="group flex gap-4 rounded-2xl border border-neutral-200/80 bg-white px-4 py-4 dark:border-neutral-700 dark:bg-neutral-900/50">
      <Link
        href={href}
        className={clsx(
          'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-700/80',
          kindColor[item.kind],
        )}
      >
        <Icon className="size-5" aria-hidden />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={href}
                className="font-mono text-sm font-semibold text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-400"
              >
                {item.title}
              </Link>
              {item.owner.is_official && <OfficialBadge />}
              <Badge color="zinc">{kindLabel[item.kind] ?? item.kind}</Badge>
              {isOwner && !item.is_public && <Badge color="amber">Privat</Badge>}
            </div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              oleh @{item.owner.username} · disukai {formatLikedAt(item.liked_at)}
            </p>
          </div>

          {isOwner && onToggleVisibility && (
            <SwitchField className="shrink-0">
              <Label className="sr-only">Tampilkan ke publik</Label>
              <Switch
                color="primary"
                checked={item.is_public}
                disabled={toggling}
                onChange={(next) => onToggleVisibility(item, next)}
                aria-label={item.is_public ? 'Sembunyikan dari publik' : 'Tampilkan ke publik'}
              />
            </SwitchField>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1">
            <HeartIcon className="size-3.5" aria-hidden />
            {formatCompactCount(item.stats?.love_count ?? 0)}
          </span>
          <span className="flex items-center gap-1">
            <ArrowDownTrayIcon className="size-3.5" aria-hidden />
            {formatCompactCount(item.stats?.download_count ?? 0)}
          </span>
          {isOwner && (
            <span className="inline-flex items-center gap-1">
              {item.is_public ? (
                <EyeIcon className="size-3.5" aria-hidden />
              ) : (
                <EyeSlashIcon className="size-3.5" aria-hidden />
              )}
              {item.is_public ? 'Publik' : 'Hanya Anda'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProfileLikedTab({ username, isOwner }: { username: string; isOwner: boolean }) {
  const qc = useQueryClient()
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [defaultPublic, setDefaultPublic] = useState(true)

  const liked = useQuery<PaginatedLikedAsset>({
    queryKey: ['liked-assets', username, isOwner ? 'me' : 'public'],
    queryFn: () => (isOwner ? getMyLiked() : getUserLiked(username)),
  })

  const summary = useQuery<LikedSummary>({
    queryKey: ['liked-summary', username],
    queryFn: () => getLikedSummary(username),
  })

  useEffect(() => {
    if (summary.data?.default_public !== undefined) {
      setDefaultPublic(summary.data.default_public)
    }
  }, [summary.data?.default_public])

  const settingsMutation = useMutation({
    mutationFn: setLikedListSettings,
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ['liked-summary', username] })
      const prev = qc.getQueryData<LikedSummary>(['liked-summary', username])
      if (prev) {
        qc.setQueryData(['liked-summary', username], {
          ...prev,
          list_public: patch.list_public ?? prev.list_public,
          public_count: patch.list_public === false ? 0 : prev.public_count,
          default_public: patch.default_public ?? prev.default_public,
        })
      }
      if (patch.default_public !== undefined) setDefaultPublic(patch.default_public)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['liked-summary', username], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['liked-summary', username] })
      qc.invalidateQueries({ queryKey: ['liked-assets', username] })
    },
  })

  const visibilityMutation = useMutation({
    mutationFn: ({ kind, slug, is_public }: { kind: string; slug: string; is_public: boolean }) =>
      setItemVisibility(kind, slug, is_public),
    onMutate: async ({ kind, slug, is_public }) => {
      const key = ['liked-assets', username, isOwner ? 'me' : 'public'] as const
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<PaginatedLikedAsset>(key)
      if (prev) {
        qc.setQueryData(key, {
          ...prev,
          items: prev.items.map((it) =>
            it.kind === kind && it.slug === slug ? { ...it, is_public } : it,
          ),
        })
      }
      const prevSummary = qc.getQueryData<LikedSummary>(['liked-summary', username])
      if (prevSummary && isOwner) {
        const delta = is_public ? 1 : -1
        qc.setQueryData(['liked-summary', username], {
          ...prevSummary,
          public_count: Math.max(0, prevSummary.public_count + delta),
        })
      }
      return { prev, prevSummary }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['liked-assets', username, isOwner ? 'me' : 'public'], ctx.prev)
      }
      if (ctx?.prevSummary) qc.setQueryData(['liked-summary', username], ctx.prevSummary)
    },
    onSettled: () => {
      setTogglingKey(null)
      qc.invalidateQueries({ queryKey: ['liked-assets', username] })
      qc.invalidateQueries({ queryKey: ['liked-summary', username] })
    },
  })

  function handleToggleVisibility(item: LikedAsset, next: boolean) {
    setTogglingKey(`${item.kind}:${item.slug}`)
    visibilityMutation.mutate({ kind: item.kind, slug: item.slug, is_public: next })
  }

  const showPrivateState = !isOwner && summary.data && !summary.data.list_public

  return (
    <div className="space-y-6">
      {isOwner && summary.data && (
        <div className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold text-neutral-900 dark:text-white">
              {summary.data.public_count} dari {summary.data.total_count}
            </span>{' '}
            aset disukai tampil ke publik
          </p>
          <SettingsToggleRow
            label="Tampilkan daftar suka saya ke publik"
            description="Jika dimatikan, pengunjung tidak melihat arsip suka Anda."
            checked={summary.data.list_public}
            disabled={settingsMutation.isPending}
            onChange={(list_public) => settingsMutation.mutate({ list_public })}
          />
          <SettingsToggleRow
            label="Aset baru yang disukai bersifat publik secara default"
            description="Anda masih bisa mengubah visibilitas tiap aset setelah menyukainya."
            checked={summary.data.default_public ?? defaultPublic}
            disabled={settingsMutation.isPending}
            onChange={(next) => settingsMutation.mutate({ default_public: next })}
          />
        </div>
      )}

      {showPrivateState ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
          <span className="flex size-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800">
            <LockClosedIcon className="size-6" aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Daftar suka privat</h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Pengguna ini membatasi visibilitas arsip aset yang disukai.
            </p>
          </div>
        </div>
      ) : (
        <QueryState
          isLoading={liked.isLoading}
          isError={liked.isError}
          error={liked.error}
          isEmpty={!liked.data?.items.length}
          emptyTitle="Belum ada aset disukai"
          emptyDescription={
            isOwner
              ? 'Sukai dataset, model, atau notebook untuk mengumpulkannya di sini.'
              : 'Pengguna ini belum membagikan aset yang disukai secara publik.'
          }
        >
          <div className="space-y-3">
            {(liked.data?.items ?? []).map((item) => (
              <LikedAssetCard
                key={`${item.kind}:${item.slug}`}
                item={item}
                isOwner={isOwner}
                onToggleVisibility={isOwner ? handleToggleVisibility : undefined}
                togglingKey={togglingKey}
              />
            ))}
          </div>
        </QueryState>
      )}
    </div>
  )
}
