'use client'

import { getPersonalizedFeed, type FeedSection } from '@/lib/api/assistant'
import { QueryState } from '@/components/features/QueryState'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'
import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline'

const KIND_LABEL: Record<string, string> = {
  dataset: 'Dataset',
  course: 'Course',
  kompetisi: 'Kompetisi',
  ruang: 'Ruang Ide',
}

type Props = {
  className?: string
  compact?: boolean
}

export function PersonalizedFeedSection({ className, compact = false }: Props) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['personalized-feed'],
    queryFn: () => getPersonalizedFeed(),
    retry: false,
  })

  if (isError) {
    return null
  }

  return (
    <section
      className={clsx(
        'rounded-3xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-800',
        compact ? 'p-5' : 'p-6 sm:p-8',
        className,
      )}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
            <SparklesIcon className="size-3.5" aria-hidden />
            Untuk Anda
          </div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Rekomendasi & langkah berikutnya
          </h2>
          {data?.strategy && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Strategi: {data.strategy === 'popularity' ? 'populer (cold-start)' : 'afinitas minat Anda'}
            </p>
          )}
        </div>
        <Link
          href="/assistant"
          className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline dark:text-sky-300"
        >
          Buka asisten
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      </div>

      <QueryState isLoading={isLoading} isError={false} error={error} skeletonColumns={1}>
        {!data?.feed.length ? (
          <p className="text-sm text-neutral-500">Belum ada rekomendasi — jelajahi platform untuk memperkaya feed.</p>
        ) : (
          <div className="space-y-6">
            {data.feed.map((section: FeedSection) => (
              <div key={`${section.type}-${section.title}`}>
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{section.title}</h3>
                {section.type === 'next_steps' ? (
                  <ul className="mt-3 space-y-2">
                    {section.items.map((step) => (
                      <li key={step.action}>
                        {step.href ? (
                          <Link
                            href={step.href}
                            className="block rounded-xl border border-sky-200/80 bg-sky-50/60 px-4 py-3 text-sm text-sky-900 transition hover:border-sky-300 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200"
                          >
                            {step.text}
                          </Link>
                        ) : (
                          <p className="rounded-xl border border-neutral-200/80 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/50">
                            {step.text}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href ?? '#'}
                          className="block rounded-xl border border-neutral-200/80 bg-neutral-50/80 px-4 py-3 transition hover:border-sky-300 hover:bg-sky-50/50 dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:border-sky-800"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                            {KIND_LABEL[section.kind] ?? section.kind}
                          </span>
                          <p className="mt-0.5 font-medium text-neutral-900 dark:text-neutral-100">{item.title}</p>
                          {(item.tags?.length ?? 0) > 0 && (
                            <p className="mt-1 truncate text-xs text-neutral-500">{item.tags!.slice(0, 3).join(' · ')}</p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </section>
  )
}
