import { SupportTicketDetailContent } from '@/components/features/support/SupportTicketDetailContent'

type Props = { params: Promise<{ id: string }> }

export default async function DashboardSupportTicketPage({ params }: Props) {
  const { id } = await params
  return <SupportTicketDetailContent id={id} />
}
