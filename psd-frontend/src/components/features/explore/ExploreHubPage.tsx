'use client'

import { QueryView } from '@/components/common/QueryView'
import { CompetitionCard } from '@/components/features/CompetitionCard'
import { NotebookCard } from '@/components/features/NotebookCard'
import { RepoCard } from '@/components/features/RepoCard'
import { OrgCard } from '@/components/features/orgs/OrgCard'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryState } from '@/components/features/QueryState'
import { ExploreStatsStrip } from '@/components/features/explore/ExploreStatsStrip'
import {
  CardGridSkeleton,
  FeaturePageHero,
  FeaturePageShell,
  FeatureSection,
  QuickNavGrid,
  SearchField,
} from '@/components/features/layout'
import { catalogMeta, catalogPopularTags } from '@/data/catalog-meta'
import { exploreAssetNav, exploreWorkspaceNav } from '@/data/explore-workspaces'
import { exploreSections } from '@/data/explore-sections'
import { getCompetitions } from '@/lib/api/competitions'
import { getNotebooks } from '@/lib/api/notebooks'
import { listOrgs } from '@/lib/api/orgs'
import { getDiscover, getRepos } from '@/lib/api/repos'
import {
  Discover,
  PaginatedCompetitionSummary,
  PaginatedRepoSummary,
  RepoKind,
  RepoSummary,
} from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useQueries, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useMemo, useState } from 'react'
import { ExploreSidenav, useExploreScrollSpy } from './ExploreSidenav'

function CatalogPreview({
  id,
  kind,
  title,
  subtitle,
  seeAllHref,
  sort = '-downloads',
}: {
  id: string
  kind: RepoKind
  title: string
  subtitle: string
  seeAllHref: string
  sort?: string
}) {
  const query = useQuery<PaginatedRepoSummary>({
    queryKey: ['repos', kind, 'explore-preview', sort],
    queryFn: () => getRepos(kind, { page_size: 8, sort }),
    staleTime: 60_000,
  })

  return (
    <section id={id} className="scroll-mt-36 lg:scroll-mt-28">
      <FeatureSection title={title} subtitle={subtitle} seeAllHref={seeAllHref} seeAllLabel="Lihat semua">
        <QueryView
          query={query}
          skeleton={<CardGridSkeleton count={4} columns={4} />}
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
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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

  const countQueries = useQueries({
    queries: [
      ...(['project', 'dataset', 'model'] as RepoKind[]).map((kind) => ({
        queryKey: ['repos', kind, 'explore-count'],
        queryFn: () => getRepos(kind, { page_size: 1 }),
        staleTime: 120_000,
      })),
      {
        queryKey: ['notebooks', 'explore-count'],
        queryFn: () => getNotebooks({ page_size: 1 }),
        staleTime: 120_000,
      },
    ],
  })

  const notebooks = useQuery({
    queryKey: ['notebooks', 'explore-preview'],
    queryFn: () => getNotebooks({ page_size: 8, page: 1 }),
    staleTime: 60_000,
  })

  const competitions = useQuery<PaginatedCompetitionSummary>({
    queryKey: ['competitions', 'explore-active'],
    queryFn: () => getCompetitions({ status: 'active', page_size: 3 }),
    staleTime: 60_000,
  })

  const orgs = useQuery({
    queryKey: ['orgs', 'explore-browse'],
    queryFn: () => listOrgs({ page: 1 }),
    staleTime: 60_000,
  })

  const repoCounts = useMemo(() => {
    const out: Partial<Record<RepoKind, number>> = {}
    ;(['project', 'dataset', 'model'] as RepoKind[]).forEach((kind, i) => {
      out[kind] = countQueries[i]?.data?.total ?? 0
    })
    return out
  }, [countQueries])

  const notebookCount = countQueries[3]?.data?.total ?? 0
  const countsLoading = countQueries.some((q) => q.isLoading)
  const totalAssets =
    (repoCounts.project ?? 0) + (repoCounts.dataset ?? 0) + (repoCounts.model ?? 0) + notebookCount

  const handleSearch = () => {
    const trimmed = searchQ.trim()
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}&type=repos`)
  }

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Jelajahi aset"
        dimHeading="sains data Indonesia"
        subtitle="Proyek, dataset, model, notebook, ruang kerja, dan komunitas — temukan semuanya dari satu pintu masuk."
        actions={
          <>
            <ButtonPrimary href="/projects/new">Bagikan aset</ButtonPrimary>
            {totalAssets > 0 && (
              <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                {totalAssets.toLocaleString('id-ID')}+ aset & notebook
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
              placeholder="Cari proyek, dataset, model, notebook…"
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
                href="/search"
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <MagnifyingGlassIcon className="size-4" aria-hidden />
                Pencarian lanjutan
              </Link>
            </div>
          </form>

          <section>
            <ExploreStatsStrip
              counts={repoCounts}
              notebookCount={notebookCount}
              loading={countsLoading}
            />
          </section>

          <section>
            <p className="mb-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Aset & konten</p>
            <QuickNavGrid items={exploreAssetNav} className="!grid-cols-2 sm:!grid-cols-3 xl:!grid-cols-6" />
          </section>

          <section id="featured" className="scroll-mt-36 lg:scroll-mt-28">
            <FeatureSection
              title="Pilihan PSD"
              subtitle="Kurasi tim Projek Sains Data — aset unggulan dari komunitas"
              seeAllHref="/search?type=repos&featured=1"
              seeAllLabel="Lihat kurasi"
            >
              <QueryState
                isLoading={discover.isLoading}
                isError={discover.isError}
                error={discover.error}
                isEmpty={!discover.data?.featured?.length}
                emptyTitle="Belum ada kurasi"
                emptyDescription="Kembali lagi nanti untuk melihat aset unggulan."
                skeleton={<CardGridSkeleton count={4} columns={4} />}
              >
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {(discover.data?.featured ?? []).map((repo: RepoSummary) => (
                    <RepoCard key={`featured-${repo.id}`} repo={repo} />
                  ))}
                </div>
              </QueryState>
            </FeatureSection>
          </section>

          <section id="recent" className="scroll-mt-36 lg:scroll-mt-28">
            <FeatureSection
              title="Baru di komunitas"
              subtitle="Aset publik terbaru dari seluruh kategori — diperbarui secara berkala"
              seeAllHref="/search?type=repos&sort=-updated_at"
              seeAllLabel="Lihat terbaru"
            >
              <QueryState
                isLoading={discover.isLoading}
                isError={discover.isError}
                error={discover.error}
                isEmpty={!discover.data?.recent?.length}
                emptyTitle="Belum ada aset publik"
                emptyDescription="Jadilah kontributor pertama di komunitas PSD."
                skeleton={<CardGridSkeleton count={4} columns={4} />}
              >
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {(discover.data?.recent ?? []).map((repo: RepoSummary) => (
                    <RepoCard key={`recent-${repo.id}`} repo={repo} />
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

          <section id="notebooks" className="scroll-mt-36 lg:scroll-mt-28">
            <FeatureSection
              title="Notebook"
              subtitle="Analisis interaktif, eksperimen, dan berbagi kode dari komunitas"
              seeAllHref="/notebooks"
            >
              <QueryState
                isLoading={notebooks.isLoading}
                isError={notebooks.isError}
                error={notebooks.error}
                isEmpty={!notebooks.data?.items?.length}
                emptyTitle="Belum ada notebook publik"
                emptyDescription="Buat notebook pertama Anda dan bagikan ke komunitas."
                emptyAction={{ label: 'Buat notebook', href: '/notebooks/new' }}
                skeleton={<CardGridSkeleton count={4} columns={4} />}
              >
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {(notebooks.data?.items ?? []).map((nb, i) => (
                    <NotebookCard key={nb.id} notebook={nb} index={i} />
                  ))}
                </div>
              </QueryState>
            </FeatureSection>
          </section>

          <section id="workspaces" className="scroll-mt-36 lg:scroll-mt-28">
            <FeatureSection
              title="Ruang kerja PSD"
              subtitle="Alat end-to-end — dari framing masalah hingga pipeline, analitik, dan kompetisi"
            >
              <QuickNavGrid items={exploreWorkspaceNav} className="!grid-cols-2 sm:!grid-cols-4" />
            </FeatureSection>
          </section>

          <section id="competitions" className="scroll-mt-36 lg:scroll-mt-28">
            <FeatureSection
              title="Kompetisi aktif"
              subtitle="Ikuti tantangan sains data dan naikkan reputasi Anda"
              seeAllHref="/competitions"
            >
              <QueryState
                isLoading={competitions.isLoading}
                isError={competitions.isError}
                error={competitions.error}
                isEmpty={!competitions.data?.items?.length}
                emptyTitle="Tidak ada kompetisi aktif"
                emptyDescription="Pantau halaman kompetisi untuk peluang berikutnya."
                emptyAction={{ label: 'Lihat kompetisi', href: '/competitions' }}
                skeleton={<CardGridSkeleton count={3} columns={3} />}
              >
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {(competitions.data?.items ?? []).map((c) => (
                    <CompetitionCard key={c.slug} competition={c} />
                  ))}
                </div>
              </QueryState>
            </FeatureSection>
          </section>

          <section id="orgs" className="scroll-mt-36 lg:scroll-mt-28">
            <FeatureSection
              title="Organisasi"
              subtitle="UMKM, akademik, komunitas, dan enterprise yang berkontribusi di PSD"
              seeAllHref="/orgs"
            >
              <QueryState
                isLoading={orgs.isLoading}
                isError={orgs.isError}
                error={orgs.error}
                isEmpty={!orgs.data?.items?.length}
                emptyTitle="Belum ada organisasi"
                emptyDescription="Daftarkan organisasi Anda dan kelola aset tim."
                emptyAction={{ label: 'Buat organisasi', href: '/orgs/new' }}
                skeleton={<CardGridSkeleton count={4} columns={4} />}
              >
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {(orgs.data?.items ?? []).map((org, i) => (
                    <OrgCard key={org.id} org={org} index={i} />
                  ))}
                </div>
              </QueryState>
            </FeatureSection>
          </section>

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
