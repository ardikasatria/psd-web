import { PostDetailContent } from '@/components/features/social/PostDetailContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: 'Postingan' }

export default async function Page({ params }: Props) {
  const { id } = await params
  return <PostDetailContent id={id} />
}
