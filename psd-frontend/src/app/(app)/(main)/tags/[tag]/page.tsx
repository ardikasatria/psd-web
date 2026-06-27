import { TagPageContent } from '@/components/features/tags/TagPageContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ tag: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params
  return { title: `Tag: ${decodeURIComponent(tag)}` }
}

export default async function Page({ params }: Props) {
  const { tag } = await params
  return <TagPageContent tag={decodeURIComponent(tag)} />
}
