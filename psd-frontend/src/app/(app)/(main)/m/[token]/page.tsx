import { resolveShareToken } from '@/lib/api/member-card'
import { profilePath } from '@/lib/routes/profile'
import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ token: string }>
}

export default async function ShareRedirectPage({ params }: Props) {
  const { token } = await params
  try {
    const data = await resolveShareToken(token)
    redirect(profilePath(data.username))
  } catch {
    redirect('/')
  }
}
