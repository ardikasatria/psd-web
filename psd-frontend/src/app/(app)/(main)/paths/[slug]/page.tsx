import { PathDetailContent } from '@/components/features/learn/PathDetailContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: slug.replace(/-/g, ' ') }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return (
    <PathDetailContent slug={slug} />
  )
}
