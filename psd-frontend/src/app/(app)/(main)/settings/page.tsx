import { SettingsContent } from '@/components/features/settings/SettingsContent'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pengaturan' }

export default function Page() {
  return (
    <SettingsContent />
  )
}
