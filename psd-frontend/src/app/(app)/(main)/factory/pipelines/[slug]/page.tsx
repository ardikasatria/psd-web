import { PipelineDetailContent } from '@/components/features/factory/PipelineDetailContent'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <PipelineDetailContent slug={slug} />
}
