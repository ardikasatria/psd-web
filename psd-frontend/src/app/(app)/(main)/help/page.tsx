import Link from 'next/link'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { helpArticles } from '@/lib/content/help'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

export default function HelpIndexPage() {
  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Pusat bantuan"
        subtitle="Panduan singkat untuk memulai dan berkontribusi di Projek Sains Data."
        variant="compact"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {helpArticles.map((article) => (
          <Link
            key={article.slug}
            href={`/help/${article.slug}`}
            className="group flex items-start justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-700"
          >
            <div>
              <h2 className="font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100">
                {article.title}
              </h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{article.description}</p>
            </div>
            <ChevronRightIcon className="mt-1 size-5 shrink-0 text-neutral-400 group-hover:text-primary-500" />
          </Link>
        ))}
      </div>
    </FeaturePageShell>
  )
}
