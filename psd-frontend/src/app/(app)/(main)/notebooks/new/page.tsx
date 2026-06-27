import { NotebookForm } from '@/components/features/notebooks/NotebookForm'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Bagikan notebook' }

export default function Page() {
  return <NotebookForm />
}
