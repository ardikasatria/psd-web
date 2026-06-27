import { ThreadDetailContent } from '@/components/features/community/ThreadDetailContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Diskusi' }

export default async function Page({ params }: Props) {
  const { id } = await params
  return <ThreadDetailContent id={id} />
}
