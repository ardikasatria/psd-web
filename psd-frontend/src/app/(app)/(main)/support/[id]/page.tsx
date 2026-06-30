import { SupportTicketDetailContent } from '@/components/features/support/SupportTicketDetailContent'

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SupportTicketDetailContent id={id} />
}
