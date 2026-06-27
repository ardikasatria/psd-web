'use client'

import { BlogCard } from '@/components/features/blog/BlogCard'
import { QueryState } from '@/components/features/QueryState'
import { FeaturePageHero, FeaturePageShell, FeatureSection } from '@/components/features/layout'
import { getBlog } from '@/lib/api/blog'
import type { BlogSummary } from '@/types/api'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

export function BlogPageContent() {
  const searchParams = useSearchParams()
  const tag = searchParams.get('tag') ?? undefined
  const page = Number(searchParams.get('page') ?? 1)

  const articles = useQuery({
    queryKey: ['blog', page, tag],
    queryFn: () => getBlog({ page, tag }),
  })

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const item of articles.data?.items ?? []) {
      item.tags.forEach((t: string) => set.add(t))
    }
    return Array.from(set).sort()
  }, [articles.data?.items])

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Berita & informasi"
        dimHeading="PSD"
        subtitle="Kabar terbaru, panduan, dan wawasan sains data dari tim Projek Sains Data."
      />

      {allTags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <TagChip href="/blog" active={!tag} label="Semua" />
          {allTags.map((t) => (
            <TagChip key={t} href={`/blog?tag=${encodeURIComponent(t)}`} active={tag === t} label={t} />
          ))}
        </div>
      )}

      <FeatureSection title={tag ? `Tag: ${tag}` : 'Artikel terbaru'}>
        <QueryState
          isLoading={articles.isLoading}
          isError={articles.isError}
          error={articles.error}
          isEmpty={!articles.data?.items.length}
          emptyTitle="Belum ada artikel"
          emptyDescription="Tim PSD akan segera mempublikasikan berita dan panduan."
        >
          <div className="mx-auto max-w-3xl space-y-0">
            {(articles.data?.items ?? []).map((article: BlogSummary) => (
              <BlogCard key={article.slug} article={article} />
            ))}
          </div>
        </QueryState>
      </FeatureSection>
    </FeaturePageShell>
  )
}

function TagChip({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <a
      href={href}
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary-600 text-white'
          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
      )}
    >
      {label}
    </a>
  )
}
