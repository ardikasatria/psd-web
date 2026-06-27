'use client'

import { heroGradient } from '@/components/common/featureGradients'
import { pageCtaPanelClass, pageHighlightStripClass } from '@/components/common/SidebarStatTile'
import { ProjectCard } from '@/components/features/projects/ProjectCard'
import { ProjectConceptSection } from '@/components/features/projects/ProjectConceptSection'
import { ProjectsLearnSidebar } from '@/components/features/projects/ProjectsLearnSidebar'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageShell } from '@/components/features/layout'
import { useMe } from '@/lib/api/dashboard'
import { getRepos } from '@/lib/api/repos'
import { PaginatedRepoSummary, RepoSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import {
  FolderIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

const TAG_FILTERS = [
  { id: '', label: 'Semua' },
  { id: 'nlp', label: 'NLP' },
  { id: 'visualisasi', label: 'Visualisasi' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'umkm', label: 'UMKM' },
  { id: 'pertanian', label: 'Pertanian' },
] as const

function matchesTag(project: RepoSummary, tag: string) {
  if (!tag) return true
  const hay = `${project.name} ${project.description} ${project.tags.join(' ')} ${project.category?.slug ?? ''}`.toLowerCase()
  return hay.includes(tag)
}

export function ProjectsPage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const me = useMe()

  const { data, isLoading, isError, error } = useQuery<PaginatedRepoSummary>({
    queryKey: ['projects', search],
    queryFn: () => getRepos('project', search ? { q: search } : {}),
  })

  const items = data?.items ?? []

  const filtered = useMemo(() => items.filter((p) => matchesTag(p, tagFilter)), [items, tagFilter])

  const featured = items.filter((p) => p.featured)
  const withDemo = items.filter((p) => p.project_preview?.has_demo)
  const popular = [...items].sort((a, b) => b.likes - a.likes)

  const scrollToCatalog = useCallback(() => {
    document.getElementById('project-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <FeaturePageShell>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Konten utama — kiri di desktop */}
        <div className="min-w-0 flex-1 space-y-8">
          <div className={heroGradient.project}>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                  <SparklesIcon className="size-3.5" aria-hidden />
                  Workspace end-to-end
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                  Proyek
                </h1>
                <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
                  Jelajahi solusi lengkap dari komunitas PSD — pipeline data, model, dashboard, dan demo
                  siap fork untuk tim Anda atau portofolio kompetisi.
                </p>
              </div>
              {me.data?.user ? (
                <ButtonPrimary href="/projects/new" className="shrink-0">
                  <PlusIcon className="size-4" aria-hidden />
                  Publikasikan proyek
                </ButtonPrimary>
              ) : (
                <ButtonPrimary href="/login?next=/projects/new" className="shrink-0">
                  Masuk untuk publikasi
                </ButtonPrimary>
              )}
            </div>
            <div
              className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-600/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-20 start-1/3 size-48 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-600/10"
              aria-hidden
            />
          </div>

          <ProjectConceptSection />

          {featured.length > 0 && !search && !tagFilter && (
            <section className={pageHighlightStripClass}>
              <div className="mb-4 flex items-center gap-2">
                <SparklesIcon className="size-5 text-primary-600 dark:text-primary-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Proyek featured</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1">
                {featured.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.owner.username}/${p.name}`}
                    className="flex w-64 shrink-0 flex-col rounded-2xl border border-white/80 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/95"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
                      Featured
                    </span>
                    <p className="mt-2 line-clamp-2 font-medium text-neutral-900 dark:text-neutral-100">{p.name}</p>
                    <p className="mt-2 text-xs text-neutral-500">@{p.owner.username}</p>
                    {p.project_preview?.stack?.[0] && (
                      <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {p.project_preview.stack.slice(0, 2).join(' · ')}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {withDemo.length > 0 && !search && !tagFilter && (
            <section className={pageHighlightStripClass}>
              <div className="mb-4 flex items-center gap-2">
                <FolderIcon className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Proyek dengan demo live</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {withDemo.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.owner.username}/${p.name}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-white dark:border-neutral-600 dark:bg-neutral-800/90 dark:text-neutral-200"
                  >
                    {p.name}
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Demo</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {popular.length > 0 && !search && !tagFilter && (
            <section className={pageHighlightStripClass}>
              <div className="mb-4 flex items-center gap-2">
                <FolderIcon className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Populer di komunitas</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {popular.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.owner.username}/${p.name}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-white dark:border-neutral-600 dark:bg-neutral-800/90 dark:text-neutral-200"
                  >
                    {p.name}
                    <span className="text-xs text-neutral-500">{p.likes} suka</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div id="project-catalog" className="scroll-mt-28 space-y-4">
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault()
                setSearch(q.trim())
              }}
            >
              <MagnifyingGlassIcon
                className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari proyek, stack, atau topik…"
                className="!rounded-2xl !py-3 !ps-12 !pe-10 text-base shadow-sm ring-1 ring-primary-100/80 dark:ring-primary-900/40"
                aria-label="Cari proyek"
              />
              {(q || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('')
                    setSearch('')
                  }}
                  className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                  aria-label="Hapus pencarian"
                >
                  <XMarkIcon className="size-4" />
                </button>
              )}
            </form>

            <div className="flex flex-wrap gap-2">
              {TAG_FILTERS.map((f) => (
                <button
                  key={f.id || 'all'}
                  type="button"
                  onClick={() => setTagFilter(f.id)}
                  className={clsx(
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    tagFilter === f.id
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
            emptyTitle="Belum ada proyek"
            emptyDescription={
              search || tagFilter
                ? 'Tidak ada proyek yang cocok dengan filter Anda.'
                : 'Jadilah yang pertama mempublikasikan proyek end-to-end ke komunitas.'
            }
            skeletonColumns={2}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((project: RepoSummary, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
            </div>
          </QueryState>

          {!me.data?.user && (
            <div className={pageCtaPanelClass}>
              <FolderIcon className="mx-auto size-8 text-primary-500" aria-hidden />
              <p className="mt-3 font-semibold text-neutral-900 dark:text-neutral-100">Punya proyek worth sharing?</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Masuk dan publikasikan solusi end-to-end — bantu tim lain belajar dari workflow Anda.
              </p>
              <Link
                href="/login?next=/projects/new"
                className="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Publikasikan proyek pertama
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar — kanan di desktop */}
        <ProjectsLearnSidebar
          className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72"
          onScrollToCatalog={scrollToCatalog}
        />
      </div>
    </FeaturePageShell>
  )
}
