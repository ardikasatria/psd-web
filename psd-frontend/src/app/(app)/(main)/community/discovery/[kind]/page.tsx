import { DiscoveryListContent } from '@/components/features/community/DiscoveryListContent'
import { DISCOVERY_KIND_META, DiscoveryKind } from '@/lib/api/discovery'
import { Metadata } from 'next'

type Props = { params: Promise<{ kind: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kind } = await params
  const meta = DISCOVERY_KIND_META[kind as DiscoveryKind]
  return { title: meta?.title ?? 'Penemuan komunitas' }
}

export default async function Page({ params }: Props) {
  const { kind } = await params
  return <DiscoveryListContent kind={kind} />
}
