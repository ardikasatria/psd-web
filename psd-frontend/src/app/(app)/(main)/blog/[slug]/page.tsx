import { BlogDetailContent } from '@/components/features/blog/BlogDetailContent'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Artikel',
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <BlogDetailContent slug={slug} />
}
