import { CollectionDetailContent } from '@/components/features/transformer/CollectionDetailContent'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <CollectionDetailContent slug={slug} />
}
