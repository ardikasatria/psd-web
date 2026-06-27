import { TeamJoinRequestsPage } from '@/components/features/teams/TeamJoinRequestsPage'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <TeamJoinRequestsPage slug={slug} />
}
