import { ProfileContent } from '@/components/features/users/ProfileContent'
import { isReservedProfileSlug } from '@/lib/routes/profile'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  if (isReservedProfileSlug(username)) return {}
  return { title: username }
}

export default async function Page({ params }: Props) {
  const { username } = await params
  if (isReservedProfileSlug(username)) notFound()
  return <ProfileContent username={username} />
}
