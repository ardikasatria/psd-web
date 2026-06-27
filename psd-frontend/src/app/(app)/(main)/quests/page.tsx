import { QuestsPageContent } from '@/components/features/quests/QuestsPageContent'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Quest' }

export default function Page() {
  return <QuestsPageContent />
}
