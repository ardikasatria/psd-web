import { CategoriesIndexPage } from '@/components/features/categories/CategoriesPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Kategori' }

export default function Page() {
  return <CategoriesIndexPage />
}
