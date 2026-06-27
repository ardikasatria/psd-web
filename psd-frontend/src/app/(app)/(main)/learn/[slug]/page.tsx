import { CourseDetailContent } from '@/components/features/learn/CourseDetailContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: slug.replace(/-/g, ' ') }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return (
    <CourseDetailContent slug={slug} />
  )
}
