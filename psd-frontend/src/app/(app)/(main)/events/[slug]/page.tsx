import { EventDetailContent } from '@/components/features/events/EventDetailContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: slug.replace(/-/g, ' ') }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return (
    <EventDetailContent slug={slug} />
  )
}
