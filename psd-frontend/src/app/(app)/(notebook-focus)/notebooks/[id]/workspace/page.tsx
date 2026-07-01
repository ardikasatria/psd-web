import { NotebookEditorContent } from '@/components/features/notebooks/NotebookEditorContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Editor notebook' }

export default async function Page({ params }: Props) {
  const { id } = await params
  return <NotebookEditorContent id={id} />
}
