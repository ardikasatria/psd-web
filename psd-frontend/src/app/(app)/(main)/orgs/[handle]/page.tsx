import { OrgDetailContent } from '@/components/features/orgs/OrgDetailContent'

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  return <OrgDetailContent handle={handle} />
}
