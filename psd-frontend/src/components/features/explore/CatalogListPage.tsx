'use client'

import { CategoryFilter } from '@/components/common/CategoryFilter'
import { RepoCard } from '@/components/features/RepoCard'
import { QueryState } from '@/components/features/QueryState'
import {
  CardGridSkeleton,
  FeaturePageHero,
  FeaturePageShell,
  SearchField,
} from '@/components/features/layout'
import { catalogMeta, catalogPopularTags, catalogSortOptions } from '@/data/catalog-meta'
import { getRepos } from '@/lib/api/repos'
import { useAuth } from '@/lib/auth/useAuth'
import { PaginatedRepoSummary, RepoKind, RepoSummary } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Suspense, useMemo } from 'react'
import { useCatalogParams } from './useCatalogParams'

function CatalogList({ kind }: { kind: RepoKind }) {
  const meta = catalogMeta[kind]
  const { q, setQ, page, sort, tagsParam, activeTags, category, subcategory, pushParams, toggleTag } = useCatalogParams()

  const { data, isLoading, isError, error } = useQuery<PaginatedRepoSummary>({
    queryKey: ['repos', kind, q, sort, tagsParam, category, subcategory, page],
    queryFn: () =>
      getRepos(kind, {
        q: q || undefined,
        tags: tagsParam || undefined,
        sort,
        category: category ?? undefined,
        subcategory: subcategory ?? undefined,
        page,
      }),
  })

  const { user } = useAuth()

  const sortedItems = useMemo(() => {
    const items = data?.items ?? []
    const interests = user?.interests ?? []
    if (!interests.length) return items
    const score = (repo: RepoSummary) =>
      repo.tags.filter((tag) => interests.some((i: string) => tag.includes(i) || i.includes(tag))).length
    return [...items].sort((a, b) => score(b) - score(a))
  }, [data?.items, user?.interests])

  return (
    <FeaturePageShell>
      <nav className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
        <Link href="/explore" className="transition-colors hover:text-primary-600 dark:hover:text-primary-400">
          Explore
        </Link>
        <ChevronRightIcon className="size-3.5 shrink-0" aria-hidden />
        <span className="font-medium text-neutral-800 dark:text-neutral-200">{meta.title}</span>
      </nav>

      <FeaturePageHero
        title={meta.title}
        subtitle={meta.subtitle}
        variant="compact"
        actions={<ButtonPrimary href={meta.createHref}>{meta.createLabel}</ButtonPrimary>}
      />

      <div className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchField
            value={q}
            onChange={setQ}
            placeholder={`Cari ${meta.title.toLowerCase()}...`}
            aria-label={`Cari ${meta.title.toLowerCase()}`}
            className="w-full lg:max-w-md"
          />
          <div className="flex flex-wrap gap-2">
            {catalogSortOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => pushParams({ sort: opt.value, page: 1 })}
                className={clsx(
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  sort === opt.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 dark:border-neutral-700">
          <CategoryFilter
            category={category}
            subcategory={subcategory}
            onChange={(cat, sub) => pushParams({ category: cat, subcategory: sub, page: 1 })}
          />
          <div className="flex flex-wrap gap-2">
            {catalogPopularTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  activeTags.includes(tag)
                    ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300',
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!data?.items.length}
        emptyTitle={`Belum ada ${meta.title.toLowerCase()} ditemukan`}
        emptyDescription="Coba kata kunci lain, ubah filter, atau jadilah yang pertama membagikan aset."
        emptyAction={{ label: 'Kembali ke Explore', href: '/explore' }}
        skeleton={<CardGridSkeleton count={6} />}
      >
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sortedItems.map((repo: RepoSummary) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
        {(data?.total ?? 0) > 0 && (
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Menampilkan {sortedItems.length} dari {data?.total} {meta.title.toLowerCase()}
          </p>
        )}
      </QueryState>
    </FeaturePageShell>
  )
}

export function CatalogListPage({ kind }: { kind: RepoKind }) {
  return (
    <Suspense>
      <CatalogList kind={kind} />
    </Suspense>
  )
}
