import { MyNotebooksPage } from '@/components/features/dashboard/MyNotebooksPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Notebook saya' }

export default function Page() {
  return <MyNotebooksPage />
}
