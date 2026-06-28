import { MlRegistryDetailContent } from '@/components/features/ml/MlRegistryDetailContent'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <MlRegistryDetailContent slug={slug} />
}
