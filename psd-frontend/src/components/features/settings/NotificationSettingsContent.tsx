'use client'

import { AuthEmailNotice } from '@/components/features/auth/AuthEmailNotice'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { EmailEventModesSection } from '@/components/features/settings/EmailEventModesSection'
import { SettingsSavedToast } from '@/components/features/settings/SettingsSavedToast'
import { SettingsSectionCard } from '@/components/features/settings/SettingsSectionCard'
import { SettingsShell } from '@/components/features/settings/SettingsShell'
import { SettingsToggleRow } from '@/components/features/settings/SettingsToggleRow'
import { useSettingsPage } from '@/components/features/settings/useSettingsPage'
import { Description, Label } from '@/shared/fieldset'
import { SwitchGroup } from '@/shared/switch'
import type { SettingsEmail } from '@/types/api'

const MODE_LABELS: { value: SettingsEmail['default_mode']; label: string; hint: string }[] = [
  { value: 'immediate', label: 'Segera', hint: 'Kirim email setiap notifikasi penting.' },
  { value: 'digest', label: 'Ringkasan harian', hint: 'Gabungkan notifikasi ke satu email per hari.' },
  { value: 'off', label: 'Mati', hint: 'Hanya notifikasi dalam aplikasi (bila diaktifkan).' },
]

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
            <>
              <SettingsSectionCard
                title="Email notifikasi"
                description="Channel email dikirim async via antrian terpisah. PR/komentar forum default ringkasan harian."
              >
                <SwitchGroup>
                  <SettingsToggleRow
                    label="Terima email notifikasi"
                    description="Nonaktifkan untuk berhenti menerima semua email transaksional notifikasi."
                    checked={settings.email.email_enabled}
                    disabled={isSaving}
                    onChange={(email_enabled) => patch({ email: { email_enabled } })}
                  />
                </SwitchGroup>
                <div className="mt-6 space-y-2">
                  <Label>Mode default email</Label>
                  <Description>Berlaku untuk jenis notifikasi yang belum diatur khusus.</Description>
                  <select
                    className="mt-2 block w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                    value={settings.email.default_mode}
                    disabled={isSaving || !settings.email.email_enabled}
                    onChange={(e) =>
                      patch({
                        email: { default_mode: e.target.value as SettingsEmail['default_mode'] },
                      })
                    }
                  >
                    {MODE_LABELS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label} — {m.hint}
                      </option>
                    ))}
                  </select>
                </div>
                <EmailEventModesSection
                  settings={settings}
                  disabled={isSaving || !settings.email.email_enabled}
                  onPatchEvents={(events) => patch({ email: { events } })}
                />
                <AuthEmailNotice variant="info" title="Berhenti berlangganan via email" className="mt-6">
                  Setiap email notifikasi PSD memuat tautan &quot;Berhenti berlangganan&quot; yang menonaktifkan semua
                  email notifikasi sekaligus. Anda dapat mengaktifkannya kembali kapan saja di halaman ini.
                </AuthEmailNotice>
              </SettingsSectionCard>

              <SettingsSectionCard
                title="Preferensi per kategori"
                description="Anda dapat mengubah kapan saja. Perubahan disimpan otomatis."
              >
                <SwitchGroup>
                  <SettingsToggleRow
                    label="Pengingat event"
                    description="Email sebelum event yang Anda daftarkan dimulai."
                    checked={settings.notifications.email_event_reminder}
                    disabled={isSaving || !settings.email.email_enabled}
                    onChange={(email_event_reminder) => patch({ notifications: { email_event_reminder } })}
                  />
                  <SettingsToggleRow
                    label="Kabar kompetisi"
                    description="Pembaruan kompetisi yang Anda ikuti atau pantau."
                    checked={settings.notifications.email_competition}
                    disabled={isSaving || !settings.email.email_enabled}
                    onChange={(email_competition) => patch({ notifications: { email_competition } })}
                  />
                  <SettingsToggleRow
                    label="Balasan forum & PR"
                    description="Email untuk balasan forum dan komentar pull request (default digest)."
                    checked={settings.notifications.email_forum_reply}
                    disabled={isSaving || !settings.email.email_enabled}
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
            </>
          )}
        </QueryState>
      </SettingsShell>
      <SettingsSavedToast show={saved} />
    </DetailPageShell>
  )
}
