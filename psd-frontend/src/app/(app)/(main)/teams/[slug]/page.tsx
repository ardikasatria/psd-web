import { TeamDetailContent } from '@/components/features/teams/TeamDetailContent'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <TeamDetailContent slug={slug} />
}
