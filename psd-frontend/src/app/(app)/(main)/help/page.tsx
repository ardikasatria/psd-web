import Link from 'next/link'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { helpArticles, helpCategories, getHelpArticlesByCategory } from '@/lib/content/help'
import { ChevronRightIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'

export default function HelpIndexPage() {
  const featured = helpArticles.filter((a) => ['panduan-memulai', 'git-menyiapkan-akses', 'notebook-membuka'].includes(a.slug))

  return (
    <FeaturePageShell>
      <FeaturePageHero
        title="Pusat bantuan"
        subtitle="Panduan lengkap memulai, Git, notebook JupyterHub, dan berkontribusi di Projek Sains Data."
        variant="compact"
      />

      <section className="mb-10 rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 dark:border-primary-800 dark:from-primary-950/40 dark:to-neutral-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
          Mulai di sini
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {featured.map((article) => (
            <Link
              key={article.slug}
              href={`/help/${article.slug}`}
              className="group rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm transition hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800/90 dark:hover:border-primary-700"
            >
              <p className="font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100">
                {article.title}
              </p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{article.description}</p>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
          Unduh notebook contoh:{' '}
          <a
            href="/docs/mulai-cepat-psd.ipynb"
            download
            className="inline-flex items-center gap-1 font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            <DocumentArrowDownIcon className="size-4" />
            mulai-cepat-psd.ipynb
          </a>
        </p>
      </section>

      {helpCategories.map((cat) => {
        const articles = getHelpArticlesByCategory(cat.id)
        return (
          <section key={cat.id} className="mb-10">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{cat.label}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{cat.description}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {articles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/help/${article.slug}`}
                  className="group flex items-start justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:border-primary-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-700"
                >
                  <div>
                    <h3 className="font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100">
                      {article.title}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{article.description}</p>
                  </div>
                  <ChevronRightIcon className="mt-1 size-5 shrink-0 text-neutral-400 group-hover:text-primary-500" />
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </FeaturePageShell>
  )
}
