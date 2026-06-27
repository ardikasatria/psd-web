'use client'

import { BlogCard } from '@/components/features/blog/BlogCard'
import { BlogArticleBody } from '@/components/features/blog/BlogArticleBody'
import { OfficialBadge } from '@/components/common/OfficialBadge'
import { QueryState } from '@/components/features/QueryState'
import { getArticle, getBlog } from '@/lib/api/blog'
import { profilePath } from '@/lib/routes/profile'
import type { BlogDetail, BlogSummary } from '@/types/api'
import Avatar from '@/shared/Avatar'
import { Badge } from '@/shared/Badge'
import { Divider } from '@/shared/divider'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

type BlogDetailContentProps = {
  slug: string
}

export function BlogDetailContent({ slug }: BlogDetailContentProps) {
  const article = useQuery({ queryKey: ['blog', slug], queryFn: () => getArticle(slug) })
  const related = useQuery({
    queryKey: ['blog', 'related'],
    queryFn: () => getBlog({ page_size: 4 }),
    enabled: !!article.data,
  })

  const relatedItems = (related.data?.items ?? []).filter((a: BlogSummary) => a.slug !== slug).slice(0, 3)

  return (
    <QueryState
      isLoading={article.isLoading}
      isError={article.isError}
      error={article.error}
      isEmpty={!article.data}
      emptyTitle="Artikel tidak ditemukan"
      emptyDescription="Artikel mungkin telah dihapus atau belum diterbitkan."
      emptyAction={{ label: 'Kembali ke blog', href: '/blog' }}
    >
      {article.data && <ArticleView article={article.data} related={relatedItems} />}
    </QueryState>
  )
}

function ArticleView({
  article,
  related,
}: {
  article: BlogDetail
  related: { slug: string; title: string; summary: string; cover_url: string | null; tags: string[]; author: BlogDetail['author']; published_at: string | null }[]
}) {
  return (
    <article className="single-post-page">
      <header className="container mt-8 lg:mt-12">
        <div className="mx-auto max-w-3xl">
          {article.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl dark:text-white">
            {article.title}
          </h1>
          {article.summary && (
            <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">{article.summary}</p>
          )}
          <Divider className="my-6" />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link href={profilePath(article.author.username)} className="flex items-center gap-2.5">
              <Avatar
                src={article.author.avatar_url ?? undefined}
                alt={article.author.username}
                className="size-10"
                width={40}
                height={40}
                sizes="40px"
              />
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">@{article.author.username}</span>
            </Link>
            {article.author.is_official && <OfficialBadge />}
            {article.published_at && (
              <time className="text-neutral-500" dateTime={article.published_at}>
                {formatDate(article.published_at)}
              </time>
            )}
            {article.status === 'draft' && <Badge color="amber">Draft</Badge>}
          </div>
        </div>
        {article.cover_url && (
          <div className="relative mx-auto mt-10 aspect-[16/9] max-w-4xl overflow-hidden rounded-2xl">
            <Image
              src={article.cover_url}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
          </div>
        )}
      </header>

      <div className="container mt-12 lg:mt-16">
        <div className="mx-auto max-w-3xl">
          <BlogArticleBody html={article.body_md} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="container mt-16 border-t border-neutral-200 pt-12 dark:border-neutral-800 lg:mt-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-xl font-bold text-neutral-900 dark:text-white">Artikel lain</h2>
            <div className="space-y-0">
              {related.map((item) => (
                <BlogCard key={item.slug} article={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  )
}
