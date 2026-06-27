import { ForumPage } from '@/components/features/community/ForumPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Forum' }

export default function Page() {
  return <ForumPage />
}
