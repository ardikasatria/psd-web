import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

/** Redirect lama `/support/:id` → dasbor pengguna */
export default async function SupportTicketRedirectPage({ params }: Props) {
  const { id } = await params
  redirect(`/dashboard/support/${id}`)
}
