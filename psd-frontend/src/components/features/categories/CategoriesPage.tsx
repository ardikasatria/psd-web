'use client'

import { CompetitionCard } from '@/components/features/CompetitionCard'
import { CourseCard } from '@/components/features/CourseCard'
import { EventCard } from '@/components/features/EventCard'
import { NotebookCard } from '@/components/features/NotebookCard'
import { QueryState } from '@/components/features/QueryState'
import { RepoCard } from '@/components/features/RepoCard'
import { FeaturePageHero, FeaturePageShell, FilterTabs } from '@/components/features/layout'
import { getCategory, getCategories } from '@/lib/api/categories'
import { trackCategoryClick } from '@/lib/analytics/entities'
import { getCompetitions } from '@/lib/api/competitions'
import { getEvents } from '@/lib/api/events'
import { getCourses } from '@/lib/api/learn'
import { getNotebooks } from '@/lib/api/notebooks'
import { getRepos } from '@/lib/api/repos'
import type {
  Category,
  CompetitionSummary,
  CourseSummary,
  EventSummary,
  NotebookSummary,
  RepoSummary,
  Subcategory,
} from '@/types/api'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const assetTabs = [
  { key: 'all', label: 'Semua' },
  { key: 'projects', label: 'Proyek' },
  { key: 'datasets', label: 'Dataset' },
  { key: 'models', label: 'Model' },
  { key: 'notebooks', label: 'Notebook' },
  { key: 'courses', label: 'Course' },
  { key: 'competitions', label: 'Kompetisi' },
  { key: 'events', label: 'Event' },
] as const

type AssetTab = (typeof assetTabs)[number]['key']

function CategoryDetailInner({ slug }: { slug: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const subcategory = searchParams.get('subcategory')
  const tab = (searchParams.get('tab') as AssetTab) || 'all'

  const category = useQuery({ queryKey: ['category', slug], queryFn: () => getCategory(slug) })

  const filter = { category: slug, subcategory: subcategory ?? undefined, page_size: 12 }

  const projects = useQuery({
    queryKey: ['category-assets', slug, subcategory, 'projects'],
    queryFn: () => getRepos('project', filter),
    enabled: tab === 'all' || tab === 'projects',
  })
  const datasets = useQuery({
    queryKey: ['category-assets', slug, subcategory, 'datasets'],
    queryFn: () => getRepos('dataset', filter),
    enabled: tab === 'all' || tab === 'datasets',
  })
  const models = useQuery({
    queryKey: ['category-assets', slug, subcategory, 'models'],
    queryFn: () => getRepos('model', filter),
    enabled: tab === 'all' || tab === 'models',
  })
  const notebooks = useQuery({
    queryKey: ['category-assets', slug, subcategory, 'notebooks'],
    queryFn: () => getNotebooks(filter),
    enabled: tab === 'all' || tab === 'notebooks',
  })
  const courses = useQuery({
    queryKey: ['category-assets', slug, subcategory, 'courses'],
    queryFn: () => getCourses(filter),
    enabled: tab === 'all' || tab === 'courses',
  })
  const competitions = useQuery({
    queryKey: ['category-assets', slug, subcategory, 'competitions'],
    queryFn: () => getCompetitions(filter),
    enabled: tab === 'all' || tab === 'competitions',
  })
  const events = useQuery({
    queryKey: ['category-assets', slug, subcategory, 'events'],
    queryFn: () => getEvents(filter),
    enabled: tab === 'all' || tab === 'events',
  })

  const setSubcategory = (sub: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (sub) params.set('subcategory', sub)
    else params.delete('subcategory')
    router.replace(`/categories/${slug}?${params.toString()}`)
  }

  const loading =
    projects.isLoading ||
    datasets.isLoading ||
    models.isLoading ||
    notebooks.isLoading ||
    courses.isLoading ||
    competitions.isLoading ||
    events.isLoading

  const totalItems =
    (projects.data?.items.length ?? 0) +
    (datasets.data?.items.length ?? 0) +
    (models.data?.items.length ?? 0) +
    (notebooks.data?.items.length ?? 0) +
    (courses.data?.items.length ?? 0) +
    (competitions.data?.items.length ?? 0) +
    (events.data?.items.length ?? 0)

  return (
    <FeaturePageShell>
      <Link href="/categories" className="text-sm font-medium text-neutral-500 hover:text-primary-600">
        ← Semua kategori
      </Link>

      {category.data && (
        <>
          <FeaturePageHero
            title={category.data.name}
            subtitle={category.data.description || 'Jelajahi aset dalam kategori ini.'}
            variant="compact"
          />

          <div className="mb-6 rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Subkategori</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSubcategory(null)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  !subcategory
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                }`}
              >
                Semua
              </button>
              {category.data.subcategories.map((sub: Subcategory) => (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() => setSubcategory(sub.slug)}
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    subcategory === sub.slug
                      ? 'border border-primary-300 bg-primary-50 text-primary-800 ring-2 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-primary-50 dark:bg-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  #{sub.name}
                </button>
              ))}
            </div>
          </div>

          <FilterTabs
            tabs={assetTabs.map((t) => {
              const params = new URLSearchParams(searchParams.toString())
              if (t.key === 'all') params.delete('tab')
              else params.set('tab', t.key)
              const qs = params.toString()
              return {
                label: t.label,
                href: qs ? `/categories/${slug}?${qs}` : `/categories/${slug}`,
                isActive: tab === t.key,
              }
            })}
          />

          <QueryState
            isLoading={loading}
            isError={false}
            error={null}
            isEmpty={totalItems === 0}
            emptyTitle="Belum ada aset"
            emptyDescription="Belum ada aset dengan kategori ini. Jadilah yang pertama menambahkan."
            skeletonColumns={3}
          >
            <div className="space-y-10">
              {(tab === 'all' || tab === 'projects') && (projects.data?.items.length ?? 0) > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Proyek</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.data!.items.map((r: RepoSummary) => (
                      <RepoCard key={r.id} repo={r} />
                    ))}
                  </div>
                </section>
              )}
              {(tab === 'all' || tab === 'datasets') && (datasets.data?.items.length ?? 0) > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold">Dataset</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {datasets.data!.items.map((r: RepoSummary) => (
                      <RepoCard key={r.id} repo={r} />
                    ))}
                  </div>
                </section>
              )}
              {(tab === 'all' || tab === 'models') && (models.data?.items.length ?? 0) > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold">Model</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {models.data!.items.map((r: RepoSummary) => (
                      <RepoCard key={r.id} repo={r} />
                    ))}
                  </div>
                </section>
              )}
              {(tab === 'all' || tab === 'notebooks') && (notebooks.data?.items.length ?? 0) > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold">Notebook</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {notebooks.data!.items.map((nb: NotebookSummary) => (
                      <NotebookCard key={nb.id} notebook={nb} />
                    ))}
                  </div>
                </section>
              )}
              {(tab === 'all' || tab === 'courses') && (courses.data?.items.length ?? 0) > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold">Course</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {courses.data!.items.map((c: CourseSummary) => (
                      <CourseCard key={c.slug} course={c} />
                    ))}
                  </div>
                </section>
              )}
              {(tab === 'all' || tab === 'competitions') && (competitions.data?.items.length ?? 0) > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold">Kompetisi</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {competitions.data!.items.map((c: CompetitionSummary) => (
                      <CompetitionCard key={c.slug} competition={c} />
                    ))}
                  </div>
                </section>
              )}
              {(tab === 'all' || tab === 'events') && (events.data?.items.length ?? 0) > 0 && (
                <section>
                  <h2 className="mb-4 text-lg font-semibold">Event</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {events.data!.items.map((e: EventSummary) => (
                      <EventCard key={e.slug} event={e} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </QueryState>
        </>
      )}
    </FeaturePageShell>
  )
}

export function CategoryDetailPage({ slug }: { slug: string }) {
  return (
    <Suspense>
      <CategoryDetailInner slug={slug} />
    </Suspense>
  )
}

export function CategoriesIndexPage() {
  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: () => import('@/lib/api/categories').then((m) => m.getCategories()) })

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Kategori"
        subtitle="Jelajahi aset berdasarkan bidang sains data — dari NLP hingga computer vision dan UMKM."
        variant="compact"
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((cat: Category) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              onClick={() => trackCategoryClick(cat.slug)}
              className="group flex flex-col rounded-3xl border border-neutral-200/80 bg-white p-6 transition-all hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-700"
            >
              <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-lg font-bold text-white shadow-sm">
                #
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100">
                {cat.name}
              </h2>
              {cat.description && (
                <p className="mt-2 line-clamp-2 flex-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {cat.description}
                </p>
              )}
              <p className="mt-4 text-xs font-medium text-primary-600 dark:text-primary-400">
                {cat.subcategory_count ?? 0} subkategori →
              </p>
            </Link>
          ))}
        </div>
      )}
    </FeaturePageShell>
  )
}
