import { HelpMarkdown } from '@/components/common/HelpMarkdown'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { getHelpArticle, helpArticles } from '@/lib/content/help'
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return helpArticles.map((a) => ({ slug: a.slug }))
}

export default async function HelpArticlePage({ params }: Props) {
  const { slug } = await params
  const article = getHelpArticle(slug)
  if (!article) notFound()

  return (
    <FeaturePageShell>
      <FeaturePageHero title={article.title} subtitle={article.description} variant="compact" />
      <HelpMarkdown content={article.content} className="max-w-3xl" />

      {(article.downloadHref || slug === 'notebook-dataset-sdk') && (
        <div className="mt-8 max-w-3xl">
          <a
            href={article.downloadHref ?? '/docs/mulai-cepat-psd.ipynb'}
            download
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <DocumentArrowDownIcon className="size-5" />
            {article.downloadLabel ?? 'Unduh notebook contoh (mulai-cepat-psd.ipynb)'}
          </a>
        </div>
      )}

      <p className="mt-8 text-sm">
        <Link href="/help" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          ← Kembali ke pusat bantuan
        </Link>
      </p>
    </FeaturePageShell>
  )
}
