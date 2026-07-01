'use client'

import { conceptGradientRow, heroGradient, highlightGradientBr } from '@/components/common/featureGradients'
import { CreateTeamDialog } from '@/components/features/teams/CreateTeamDialog'
import { TeamCard } from '@/components/features/teams/TeamCard'
import { OrgUmkmShowcase } from '@/components/features/teams/OrgUmkmShowcase'
import { TeamCompeteJourney } from '@/components/features/teams/TeamCompeteJourney'
import { TeamsSidebar } from '@/components/features/teams/TeamsSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { listTeams } from '@/lib/api/teams'
import { useAuth } from '@/lib/auth/useAuth'
import { PaginatedTeamSummary, TeamSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import {
  BoltIcon,
  FireIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrophyIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Suspense, useMemo, useState } from 'react'

const FOCUS_FILTERS = [
  { id: '', label: 'Semua' },
  { id: 'kompetisi', label: 'Kompetisi' },
  { id: 'umkm', label: 'UMKM' },
  { id: 'organisasi', label: 'Organisasi' },
  { id: 'nlp', label: 'NLP' },
] as const

function matchesFocus(team: TeamSummary, focus: string) {
  if (!focus) return true
  const hay = `${team.name} ${team.description ?? ''} ${team.focus ?? ''}`.toLowerCase()
  if (focus === 'kompetisi') return hay.includes('kompetisi') || hay.includes('competition') || hay.includes('tabular')
  if (focus === 'umkm') return hay.includes('umkm')
  if (focus === 'organisasi') return hay.includes('organisasi') || hay.includes('kolektif') || hay.includes('collective')
  if (focus === 'nlp') return hay.includes('nlp')
  return true
}

function TeamsPageInner() {
  const { isLoggedIn } = useAuth()
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isError, error } = useQuery<PaginatedTeamSummary>({
    queryKey: ['teams', q, page],
    queryFn: () => listTeams(q, page),
  })

  const items = data?.items ?? []

  const filtered = useMemo(() => {
    return items.filter((t) => matchesFocus(t, focus))
  }, [items, focus])

  const competitive = items.filter((t) => (t.competitions_count ?? 0) >= 2)

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <TeamsSidebar
          className="order-2 w-full shrink-0 lg:order-1 lg:sticky lg:top-24 lg:w-72"
          onCreateClick={() => setCreateOpen(true)}
        />

        <div className="order-1 min-w-0 flex-1 space-y-8 lg:order-2">
          <div className={heroGradient.team}>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  <UserGroupIcon className="size-3.5" aria-hidden />
                  Unit tempur PSD
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Tim Kolaborasi
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Bentuk tim, kolaborasi pada proyek nyata, dan kejar peringkat kompetisi bersama.
                  Semangat tim dan aura kompetisi dimulai dari sini.
                </p>
              </div>
              {isLoggedIn ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <ButtonPrimary type="button" onClick={() => setCreateOpen(true)}>
                    <PlusIcon className="size-4" aria-hidden />
                    Buat tim
                  </ButtonPrimary>
                  <ButtonPrimary href="/me/teams" outline>
                    Tim saya
                  </ButtonPrimary>
                </div>
              ) : (
                <ButtonPrimary href="/login?next=/teams">Masuk untuk buat tim</ButtonPrimary>
              )}
            </div>
            <div
              className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-600/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 start-1/3 size-48 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-600/10"
              aria-hidden
            />
          </div>

          <TeamCompeteJourney />

          <OrgUmkmShowcase onCreateClick={() => setCreateOpen(true)} />

          {competitive.length > 0 && !q && !focus && (
            <section className={highlightGradientBr.team}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FireIcon className="size-5 text-amber-600 dark:text-amber-400" aria-hidden />
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Tim dengan aura kompetisi</h2>
                </div>
                <Link href="/competitions" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
                  Lihat kompetisi
                </Link>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {competitive.slice(0, 4).map((t) => (
                  <Link
                    key={t.slug}
                    href={`/teams/${t.slug}`}
                    className="flex w-64 shrink-0 flex-col rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/95"
                  >
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      <TrophyIcon className="size-3.5" aria-hidden />
                      {t.competitions_count} kompetisi
                    </span>
                    <p className="mt-2 line-clamp-2 font-medium text-neutral-900 dark:text-neutral-100">{t.name}</p>
                    <p className="mt-2 text-xs text-neutral-500">
                      {t.member_count ?? 0} anggota · {t.assets_count ?? 0} aset
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
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
                placeholder="Cari tim…"
                className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
                aria-label="Cari tim"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                  aria-label="Hapus pencarian"
                >
                  <XMarkIcon className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {FOCUS_FILTERS.map((f) => (
                <button
                  key={f.id || 'all'}
                  type="button"
                  onClick={() => setFocus(f.id)}
                  className={clsx(
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    focus === f.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!filtered.length}
            emptyTitle="Belum ada tim publik"
            emptyDescription={
              q || focus
                ? 'Tidak ada tim yang cocok dengan filter Anda.'
                : isLoggedIn
                  ? 'Buat tim pertama Anda atau undang rekan untuk berkompetisi bersama.'
                  : 'Masuk untuk membuat tim dan bergabung dengan komunitas.'
            }
            skeletonColumns={2}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((t: TeamSummary, i) => (
                <TeamCard key={t.slug} team={t} index={i} />
              ))}
            </div>
            {!focus && (data?.total ?? 0) > items.length && (
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

          {!isLoggedIn && (
            <div className="rounded-3xl border border-dashed border-primary-300/70 bg-primary-50/40 px-6 py-8 text-center dark:border-primary-800 dark:bg-primary-950/20">
              <BoltIcon className="mx-auto size-8 text-primary-500" aria-hidden />
              <p className="mt-3 font-semibold text-neutral-900 dark:text-neutral-100">Siap berkompetisi?</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Masuk, bentuk tim, dan kejar leaderboard kompetisi PSD bersama rekan.
              </p>
              <Link href="/login?next=/teams" className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                Masuk sekarang
              </Link>
            </div>
          )}
        </div>
      </div>

      <CreateTeamDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </FeaturePageShell>
  )
}

export function TeamsPage() {
  return (
    <Suspense>
      <TeamsPageInner />
    </Suspense>
  )
}
