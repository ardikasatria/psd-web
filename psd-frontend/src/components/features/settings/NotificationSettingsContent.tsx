'use client'

import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { SettingsSavedToast } from '@/components/features/settings/SettingsSavedToast'
import { SettingsSectionCard } from '@/components/features/settings/SettingsSectionCard'
import { SettingsShell } from '@/components/features/settings/SettingsShell'
import { SettingsToggleRow } from '@/components/features/settings/SettingsToggleRow'
import { useSettingsPage } from '@/components/features/settings/useSettingsPage'
import { SwitchGroup } from '@/shared/switch'

export function NotificationSettingsContent() {
  const { settings, isLoading, isError, error, patch, saved, isSaving } = useSettingsPage('/settings/notifications')

  return (
    <DetailPageShell>
      <DetailPageHeader
        title="Notifikasi"
        subtitle="Atur cara PSD menghubungi Anda tentang event, kompetisi, dan diskusi."
      />
      <SettingsShell active="notifications">
        <QueryState isLoading={isLoading} isError={isError} error={error} skeletonColumns={2}>
          {settings && (
            <SettingsSectionCard
              title="Preferensi notifikasi"
              description="Anda dapat mengubah kapan saja. Perubahan disimpan otomatis."
            >
              <SwitchGroup>
                <SettingsToggleRow
                  label="Pengingat event"
                  description="Email sebelum event yang Anda daftarkan dimulai."
                  checked={settings.notifications.email_event_reminder}
                  disabled={isSaving}
                  onChange={(email_event_reminder) => patch({ notifications: { email_event_reminder } })}
                />
                <SettingsToggleRow
                  label="Kabar kompetisi"
                  description="Pembaruan kompetisi yang Anda ikuti atau pantau."
                  checked={settings.notifications.email_competition}
                  disabled={isSaving}
                  onChange={(email_competition) => patch({ notifications: { email_competition } })}
                />
                <SettingsToggleRow
                  label="Balasan forum"
                  description="Email saat ada balasan pada thread yang Anda ikuti."
                  checked={settings.notifications.email_forum_reply}
                  disabled={isSaving}
                  onChange={(email_forum_reply) => patch({ notifications: { email_forum_reply } })}
                />
                <SettingsToggleRow
                  label="Notifikasi dalam aplikasi"
                  description="Tampilkan pemberitahuan di dalam platform PSD."
                  checked={settings.notifications.inapp}
                  disabled={isSaving}
                  onChange={(inapp) => patch({ notifications: { inapp } })}
                />
              </SwitchGroup>
            </SettingsSectionCard>
          )}
        </QueryState>
      </SettingsShell>
      <SettingsSavedToast show={saved} />
    </DetailPageShell>
  )
}
