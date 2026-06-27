import { CommunityPage } from '@/components/features/community/CommunityPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Feed' }

export default function Page() {
  return (
    <CommunityPage />
  )
}
