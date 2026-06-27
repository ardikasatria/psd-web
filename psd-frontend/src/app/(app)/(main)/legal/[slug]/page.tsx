import { SimpleMarkdown } from '@/components/common/SimpleMarkdown'
import { FeaturePageHero, FeaturePageShell } from '@/components/features/layout'
import { getLegalDocument, legalDocuments } from '@/lib/content/legal'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return legalDocuments.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const doc = getLegalDocument(slug)
  if (!doc) return { title: 'Legal' }
  return { title: doc.title, description: doc.description }
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params
  const doc = getLegalDocument(slug)
  if (!doc) notFound()

  return (
    <FeaturePageShell>
      <FeaturePageHero title={doc.title} subtitle={doc.description} variant="compact" />
      <div className="prose dark:prose-invert max-w-3xl">
        <SimpleMarkdown content={doc.content} />
      </div>
      <p className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">
        <Link href="/help/pedoman-komunitas" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          Pedoman komunitas
        </Link>
        {' · '}
        <Link href="/" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
          Beranda
        </Link>
      </p>
    </FeaturePageShell>
  )
}
