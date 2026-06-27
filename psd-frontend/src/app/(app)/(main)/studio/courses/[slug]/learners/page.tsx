import { CourseLearnersPage } from '@/components/features/studio/CourseLearnersPage'
import { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: `Pembelajar — ${slug.replace(/-/g, ' ')}` }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <CourseLearnersPage slug={slug} />
}
