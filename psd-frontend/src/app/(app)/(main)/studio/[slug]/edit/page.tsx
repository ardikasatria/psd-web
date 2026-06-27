import { CourseBuilderPage } from '@/components/features/studio/CourseBuilderPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Course Builder' }

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <CourseBuilderPage slug={slug} />
}
