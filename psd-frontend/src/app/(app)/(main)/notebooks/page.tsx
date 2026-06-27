import { NotebooksPage } from '@/components/features/notebooks/NotebooksPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Notebook' }

export default function Page() {
  return (
    <NotebooksPage />
  )
}
