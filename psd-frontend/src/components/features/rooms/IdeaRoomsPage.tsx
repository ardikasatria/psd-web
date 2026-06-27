'use client'

import { heroGradient } from '@/components/common/featureGradients'
import { pageHighlightStripClass } from '@/components/common/SidebarStatTile'
import { CreateRoomDialog } from '@/components/features/rooms/CreateRoomDialog'
import { IdeaRoomConceptSection } from '@/components/features/rooms/IdeaRoomConceptSection'
import { IdeaRoomsSidebar } from '@/components/features/rooms/IdeaRoomsSidebar'
import { RoomCard } from '@/components/features/rooms/RoomCard'
import { RoomCollaborationJourney } from '@/components/features/rooms/RoomCollaborationJourney'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { listRooms } from '@/lib/api/rooms'
import { useAuth } from '@/lib/auth/useAuth'
import { PaginatedRoomSummary, RoomStatus, RoomSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import {
  BoltIcon,
  ChatBubbleLeftEllipsisIcon,
  LightBulbIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Suspense, useMemo, useState } from 'react'

const STATUS_FILTERS: { id: RoomStatus | ''; label: string; icon: typeof LightBulbIcon }[] = [
  { id: '', label: 'Semua', icon: BoltIcon },
  { id: 'open', label: 'Terbuka', icon: UserGroupIcon },
  { id: 'framing', label: 'Framing', icon: ChatBubbleLeftEllipsisIcon },
  { id: 'solving', label: 'Menyelesaikan', icon: RocketLaunchIcon },
  { id: 'closed', label: 'Tertutup', icon: LockClosedIcon },
]

function IdeaRoomsPageInner() {
  const { isLoggedIn } = useAuth()
  const [statusFilter, setStatusFilter] = useState<RoomStatus | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, error } = useQuery<PaginatedRoomSummary>({
    queryKey: ['idea-rooms', statusFilter, page],
    queryFn: () =>
      listRooms({
        status: statusFilter || undefined,
        page,
      }),
  })

  const items = data?.items ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.pitch_preview?.toLowerCase().includes(q) ||
        r.category?.name.toLowerCase().includes(q),
    )
  }, [items, search])

  const framingHot = items.filter((r) => r.status === 'framing')
  const openHot = items.filter((r) => r.status === 'open')

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <IdeaRoomsSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          onCreateClick={() => setCreateOpen(true)}
        />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className={heroGradient.ideaRoom}>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  <UserGroupIcon className="size-3.5" aria-hidden />
                  Kolaborasi terstruktur
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Ruang Ide
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Ajukan masalah nyata, bentuk tim, dan rapikan pemahaman bersama sebelum mengeksekusi solusi data.
                  Setiap ruang punya ritme kolaboratif — masuk saat energi Anda paling cocok.
                </p>
              </div>
              {isLoggedIn ? (
                <ButtonPrimary type="button" onClick={() => setCreateOpen(true)} className="shrink-0">
                  <PlusIcon className="size-4" aria-hidden />
                  Ajukan ide
                </ButtonPrimary>
              ) : (
                <ButtonPrimary href="/login?next=/idea-rooms" className="shrink-0">
                  Masuk untuk mengajukan
                </ButtonPrimary>
              )}
            </div>
            <div
              className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-600/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 start-1/3 size-48 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-600/10"
              aria-hidden
            />
          </div>

          <IdeaRoomConceptSection />

          <RoomCollaborationJourney />

          {(framingHot.length > 0 || openHot.length > 0) && !statusFilter && !search && (
            <section className={pageHighlightStripClass}>
              <div className="mb-4 flex items-center gap-2">
                <BoltIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Butuh energi tim sekarang</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {[...framingHot, ...openHot].slice(0, 4).map((r: RoomSummary) => (
                  <Link
                    key={r.slug}
                    href={`/idea-rooms/${r.slug}`}
                    className="flex w-64 shrink-0 flex-col rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/90"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                      {r.status === 'framing' ? 'Sedang framing' : 'Terbuka'}
                    </span>
                    <p className="mt-2 line-clamp-2 font-medium text-neutral-900 dark:text-neutral-100">{r.title}</p>
                    <p className="mt-2 text-xs text-neutral-500">
                      {r.member_count}
                      {r.max_members != null ? `/${r.max_members}` : ''} anggota
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon
                className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari ruang ide…"
                className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
                aria-label="Cari ruang ide"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                  aria-label="Hapus pencarian"
                >
                  <XMarkIcon className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id || 'all'}
                  type="button"
                  onClick={() => {
                    setStatusFilter(id)
                    setPage(1)
                  }}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition',
                    statusFilter === id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!filtered.length}
            emptyTitle="Belum ada ruang ide publik"
            emptyDescription={
              search
                ? 'Tidak ada ruang yang cocok dengan pencarian Anda.'
                : isLoggedIn
                  ? 'Jadilah yang pertama mengajukan masalah untuk kolaborasi komunitas.'
                  : 'Masuk untuk mengajukan ide atau jelajahi ruang yang sudah terbuka.'
            }
            skeletonColumns={3}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r: RoomSummary) => (
                <RoomCard key={r.slug} room={r} />
              ))}
            </div>
            {!search && (data?.total ?? 0) > items.length && (
              <p className="mt-8 text-center text-sm text-neutral-500">
                Menampilkan {items.length} dari {data?.total}{' '}
                <button
                  type="button"
                  className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Muat lebih banyak
                </button>
              </p>
            )}
          </QueryState>
        </div>
      </div>

      <CreateRoomDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </FeaturePageShell>
  )
}

export function IdeaRoomsPage() {
  return (
    <Suspense>
      <IdeaRoomsPageInner />
    </Suspense>
  )
}
