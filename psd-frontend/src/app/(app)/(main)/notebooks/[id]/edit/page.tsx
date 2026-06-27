import { NotebookForm } from '@/components/features/notebooks/NotebookForm'
import { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Edit notebook' }

export default async function Page({ params }: Props) {
  const { id } = await params
  return <NotebookForm id={id} />
}
