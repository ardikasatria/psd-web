'use client'

import { OfficialBadge } from '@/components/common/OfficialBadge'
import { profilePath } from '@/lib/routes/profile'
import type { BlogSummary } from '@/types/api'
import Avatar from '@/shared/Avatar'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

type BlogCardProps = {
  article: BlogSummary
  variant?: 'list' | 'compact'
  className?: string
}

export function BlogCard({ article, variant = 'list', className }: BlogCardProps) {
  const href = `/blog/${article.slug}`

  if (variant === 'compact') {
    return (
      <Link
        href={href}
        className={clsx(
          'group block rounded-2xl border border-neutral-200/80 bg-white p-4 transition-shadow hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900',
          className
        )}
      >
        <h3 className="line-clamp-2 text-base font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
          {article.title}
        </h3>
        <p className="mt-1 text-xs text-neutral-500">{formatDate(article.published_at)}</p>
      </Link>
    )
  }

  return (
    <article
      className={clsx(
        'group flex flex-col gap-4 border-b border-neutral-200 pb-10 last:border-0 dark:border-neutral-800 sm:flex-row sm:items-start sm:gap-8',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <Link href={profilePath(article.author.username)} className="flex items-center gap-2 hover:text-primary-600">
            <Avatar
              src={article.author.avatar_url ?? undefined}
              alt={article.author.username}
              className="size-7"
              width={28}
              height={28}
              sizes="28px"
            />
            <span className="font-medium text-neutral-700 dark:text-neutral-300">@{article.author.username}</span>
          </Link>
          {article.author.is_official && <OfficialBadge className="!text-[10px]" />}
          {article.published_at && (
            <>
              <span aria-hidden>·</span>
              <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
            </>
          )}
        </div>
        <Link href={href}>
          <h2 className="text-xl font-bold leading-snug text-neutral-900 transition-colors group-hover:text-primary-600 sm:text-2xl dark:text-white dark:group-hover:text-primary-400">
            {article.title}
          </h2>
        </Link>
        {article.summary && (
          <p className="mt-2 line-clamp-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
            {article.summary}
          </p>
        )}
        {article.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      {article.cover_url && (
        <Link href={href} className="relative block aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl sm:w-44 md:w-56">
          <Image
            src={article.cover_url}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, 224px"
          />
        </Link>
      )}
    </article>
  )
}
