import { CategoryDetailPage } from '@/components/features/categories/CategoriesPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Kategori' }

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <CategoryDetailPage slug={slug} />
}
