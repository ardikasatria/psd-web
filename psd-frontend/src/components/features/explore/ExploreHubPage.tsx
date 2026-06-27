'use client'

import { QueryView } from '@/components/common/QueryView'
import { RepoCard } from '@/components/features/RepoCard'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryState } from '@/components/features/QueryState'
import {
  CardGridSkeleton,
  FeaturePageHero,
  FeaturePageShell,
  FeatureSection,
  QuickNavGrid,
  QuickNavItem,
  SearchField,
} from '@/components/features/layout'
import { catalogMeta, catalogPopularTags } from '@/data/catalog-meta'
import { exploreSections } from '@/data/explore-sections'
import { getDiscover, getRepos } from '@/lib/api/repos'
import { Discover, PaginatedRepoSummary, RepoKind, RepoSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  BeakerIcon,
  CubeIcon,
  FolderIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useQueries, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import { ExploreSidenav, useExploreScrollSpy } from './ExploreSidenav'

const quickNavItems: QuickNavItem[] = [
  {
    label: 'Proyek',
    description: 'Solusi sains data',
    href: '/projects',
    icon: FolderIcon,
    gradient: 'from-rose-400 to-primary-600',
  },
  {
    label: 'Dataset',
    description: 'Data terbuka lokal',
    href: '/datasets',
    icon: CubeIcon,
    gradient: 'from-blue-400 to-indigo-600',
  },
  {
    label: 'Model',
    description: 'Model ML siap pakai',
    href: '/models',
    icon: BeakerIcon,
    gradient: 'from-violet-400 to-purple-600',
  },
]

function CatalogPreview({
  id,
  kind,
  title,
  subtitle,
  seeAllHref,
}: {
  id: string
  kind: RepoKind
  title: string
  subtitle: string
  seeAllHref: string
}) {
  const query = useQuery<PaginatedRepoSummary>({
    queryKey: ['repos', kind, 'explore-preview'],
    queryFn: () => getRepos(kind, { page_size: 6, sort: '-downloads' }),
    staleTime: 60_000,
  })

  return (
    <section id={id} className="scroll-mt-36 lg:scroll-mt-28">
      <FeatureSection title={title} subtitle={subtitle} seeAllHref={seeAllHref} seeAllLabel="Lihat semua">
        <QueryView
          query={query}
          skeleton={<CardGridSkeleton count={3} columns={3} />}
          empty={
            <EmptyState
              title={`Belum ada ${title.toLowerCase()}`}
              description="Jadilah yang pertama membagikan aset di kategori ini."
              cta={catalogMeta[kind].createLabel}
              href={catalogMeta[kind].createHref}
            />
          }
        >
          {(data) => (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {(data.items ?? []).map((repo: RepoSummary) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          )}
        </QueryView>
      </FeatureSection>
    </section>
  )
}

function ExploreHub() {
  const router = useRouter()
  const [searchQ, setSearchQ] = useState('')
  const sectionIds = exploreSections.map((s) => s.id)
  const { activeId, scrollTo } = useExploreScrollSpy(sectionIds)

  const discover = useQuery<Discover>({
    queryKey: ['discover'],
    queryFn: getDiscover,
    staleTime: 60_000,
  })

  const previewQueries = useQueries({
    queries: (['project', 'dataset', 'model'] as RepoKind[]).map((kind) => ({
      queryKey: ['repos', kind, 'explore-count'],
      queryFn: () => getRepos(kind, { page_size: 1 }),
      staleTime: 120_000,
    })),
  })

  const totalAssets = previewQueries.reduce((sum, q) => sum + (q.data?.total ?? 0), 0)

  const handleSearch = () => {
    const trimmed = searchQ.trim()
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}&type=repos`)
  }

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Jelajahi aset"
        dimHeading="sains data Indonesia"
        subtitle="Temukan proyek, dataset, dan model dari komunitas PSD — semuanya dalam satu tempat."
        actions={
          <>
            <ButtonPrimary href="/projects/new">Bagikan aset</ButtonPrimary>
            {totalAssets > 0 && (
              <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white">
                {totalAssets.toLocaleString('id-ID')}+ aset tersedia
              </span>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
        <aside className="sticky top-24 z-20 hidden w-56 shrink-0 self-start pt-1 lg:block">
          <div className="max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200/80 bg-white/95 p-3 shadow-sm backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-800/95">
            <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Navigasi</p>
            <ExploreSidenav activeId={activeId} onNavigate={scrollTo} />
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-16 lg:space-y-20">
          <div className="sticky top-24 z-20 -mx-4 border-b border-neutral-200/80 bg-white/95 px-4 py-3 pt-4 shadow-sm backdrop-blur-md lg:hidden dark:border-neutral-700 dark:bg-neutral-900/95">
            <ExploreSidenav activeId={activeId} onNavigate={scrollTo} variant="rail" />
          </div>

          <form
            className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-6"
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
          >
            <SearchField
              value={searchQ}
              onChange={setSearchQ}
              placeholder="Cari proyek, dataset, model..."
              aria-label="Cari aset"
              className="w-full"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
              >
                Cari
              </button>
              <Link
                href="/search?type=repos"
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <MagnifyingGlassIcon className="size-4" aria-hidden />
                Pencarian lanjutan
              </Link>
            </div>
          </form>

          <section>
            <p className="mb-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Langsung ke kategori</p>
            <QuickNavGrid items={quickNavItems} className="!grid-cols-1 sm:!grid-cols-3" />
          </section>

          <section id="featured" className="scroll-mt-36 lg:scroll-mt-28">
            <FeatureSection
              title="Pilihan PSD"
              subtitle="Kurasi tim Projek Sains Data — aset unggulan dari komunitas"
            >
              <QueryState
                isLoading={discover.isLoading}
                isError={discover.isError}
                error={discover.error}
                isEmpty={!(discover.data?.featured?.length)}
                emptyTitle="Belum ada kurasi"
                emptyDescription="Kembali lagi nanti untuk melihat aset unggulan."
                skeleton={<CardGridSkeleton count={3} columns={3} />}
              >
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {(discover.data?.featured ?? []).map((repo: RepoSummary) => (
                    <RepoCard key={`featured-${repo.id}`} repo={repo} />
                  ))}
                </div>
              </QueryState>
            </FeatureSection>
          </section>

          <CatalogPreview
            id="projects"
            kind="project"
            title="Proyek"
            subtitle={catalogMeta.project.subtitle}
            seeAllHref="/projects"
          />
          <CatalogPreview
            id="datasets"
            kind="dataset"
            title="Dataset"
            subtitle={catalogMeta.dataset.subtitle}
            seeAllHref="/datasets"
          />
          <CatalogPreview
            id="models"
            kind="model"
            title="Model"
            subtitle={catalogMeta.model.subtitle}
            seeAllHref="/models"
          />

          <section id="tags" className="scroll-mt-36 lg:scroll-mt-28">
            <FeatureSection
              title="Topik populer"
              subtitle="Jelajahi aset berdasarkan bidang atau kasus penggunaan"
            >
              <div className="flex flex-wrap gap-2.5">
                {catalogPopularTags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className={clsx(
                      'rounded-2xl border border-neutral-200/80 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-all',
                      'hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 hover:shadow-sm',
                      'dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-primary-700 dark:hover:bg-primary-950/40 dark:hover:text-primary-300',
                    )}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </FeatureSection>
          </section>
        </div>
      </div>
    </FeaturePageShell>
  )
}

export function ExploreHubPage() {
  return (
    <Suspense>
      <ExploreHub />
    </Suspense>
  )
}
