import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { getHelpArticle, helpArticles } from '@/lib/content/help'
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
      <div className="prose dark:prose-invert max-w-3xl">
        <SimpleMarkdown content={article.content} />
      </div>
      <p className="mt-8 text-sm">
        <Link href="/help" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          ← Kembali ke pusat bantuan
        </Link>
      </p>
    </FeaturePageShell>
  )
}
