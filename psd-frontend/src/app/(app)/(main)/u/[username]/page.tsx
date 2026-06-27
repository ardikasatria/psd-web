import { profilePath } from '@/lib/routes/profile'
import { redirect } from 'next/navigation'

type Props = { params: Promise<{ username: string }> }

/** Redirect permanen dari URL lama /u/:username */
export default async function Page({ params }: Props) {
  const { username } = await params
  redirect(profilePath(username))
}
