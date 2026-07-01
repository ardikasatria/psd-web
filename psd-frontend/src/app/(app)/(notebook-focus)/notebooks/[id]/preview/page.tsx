import { NotebookPreviewContent } from '@/components/features/notebooks/NotebookPreviewContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Preview notebook' }

export default async function Page({ params }: Props) {
  const { id } = await params
  return <NotebookPreviewContent id={id} />
}
