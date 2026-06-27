import { LessonPlayerContent } from '@/components/features/learn/LessonPlayerContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ slug: string; lessonId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lessonId } = await params
  return { title: `${lessonId} — ${slug.replace(/-/g, ' ')}` }
}

export default async function Page({ params }: Props) {
  const { slug, lessonId } = await params
  return <LessonPlayerContent slug={slug} lessonId={lessonId} focusMode />
}
