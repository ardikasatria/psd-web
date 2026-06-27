import { RepoDetailContent } from '@/components/features/repos/RepoDetailContent'
import { Metadata } from 'next'

type Props = { params: Promise<{ owner: string; name: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  return { title: name }
}

export default async function Page({ params }: Props) {
  const { owner, name } = await params
  return (
    <RepoDetailContent kind="model" owner={owner} name={name} />
  )
}
