import { QuestDetailContent } from '@/components/features/quests/QuestDetailContent'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Detail Quest' }

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <QuestDetailContent slug={slug} />
}
