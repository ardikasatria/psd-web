import { MlServingPageContent } from '@/components/features/ml/MlServingPageContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: `Serving — ${slug}` }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <MlServingPageContent slug={slug} />
}
