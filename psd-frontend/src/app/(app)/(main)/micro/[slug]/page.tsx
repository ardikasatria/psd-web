import { MicroPlayerContent } from '@/components/features/micro/MicroPlayerContent'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Micro-lesson' }

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <MicroPlayerContent slug={slug} />
}
