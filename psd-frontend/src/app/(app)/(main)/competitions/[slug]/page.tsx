import { CompetitionDetailPage } from '@/components/features/competitions/CompetitionDetailPage'
import { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: slug.replace(/-/g, ' ') }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return (
    <CompetitionDetailPage slug={slug} />
  )
}
