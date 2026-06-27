import { NotebookDetailContent } from '@/components/features/notebooks/NotebookDetailContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Notebook' }

export default async function Page({ params }: Props) {
  const { id } = await params
  return (
    <NotebookDetailContent id={id} />
  )
}
