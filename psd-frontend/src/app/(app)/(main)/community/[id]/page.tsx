import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

/** Redirect lama `/community/:id` → `/forum/:id` */
export default async function Page({ params }: Props) {
  const { id } = await params
  redirect(`/forum/${id}`)
}
