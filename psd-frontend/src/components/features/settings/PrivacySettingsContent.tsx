'use client'

import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { SettingsSavedToast } from '@/components/features/settings/SettingsSavedToast'
import { SettingsSectionCard } from '@/components/features/settings/SettingsSectionCard'
import { SettingsShell } from '@/components/features/settings/SettingsShell'
import { SettingsToggleRow } from '@/components/features/settings/SettingsToggleRow'
import { useSettingsPage } from '@/components/features/settings/useSettingsPage'
import { setTrackingEnabled } from '@/lib/analytics/track'
import { Field, Label } from '@/shared/fieldset'
import clsx from 'clsx'
import Link from 'next/link'
import { SwitchGroup } from '@/shared/switch'

const visibilityOptions = [
  {
    value: 'public' as const,
    label: 'Publik',
    description: 'Profil dapat dilihat siapa saja.',
  },
  {
    value: 'private' as const,
    label: 'Privat',
    description: 'Hanya Anda (dan admin) yang dapat melihat profil.',
  },
]

export function PrivacySettingsContent() {
  const { settings, isLoading, isError, error, patch, saved, isSaving } = useSettingsPage('/settings/privacy')

  return (
    <DetailPageShell>
      <DetailPageHeader
        title="Privasi"
        subtitle="Kendalikan visibilitas profil dan bagaimana orang lain menemukan Anda."
      />
      <SettingsShell active="privacy">
        <QueryState isLoading={isLoading} isError={isError} error={error} skeletonColumns={2}>
          {settings && (
            <div className="space-y-6">
              <SettingsSectionCard title="Visibilitas profil">
                <Field>
                  <Label>Siapa yang dapat melihat profil Anda?</Label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {visibilityOptions.map((opt) => {
                      const active = settings.privacy.profile_visibility === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isSaving}
                          onClick={() => patch({ privacy: { profile_visibility: opt.value } })}
                          className={clsx(
                            'rounded-2xl border p-4 text-left motion-safe:transition-colors',
                            active
                              ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-950/30'
                              : 'border-neutral-200 hover:border-primary-200 dark:border-neutral-700 dark:hover:border-primary-800'
                          )}
                        >
                          <span className="block font-semibold text-neutral-900 dark:text-white">{opt.label}</span>
                          <span className="mt-1 block text-sm text-neutral-500 dark:text-neutral-400">
                            {opt.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </Field>
              </SettingsSectionCard>

              <SettingsSectionCard title="Pelacakan & rekomendasi">
                <SwitchGroup>
                  <SettingsToggleRow
                    label="Pelacakan aktivitas untuk rekomendasi"
                    description="PSD mencatat tampilan, pencarian, dan klik untuk memahami minat Anda. Data mentah dihapus otomatis setelah 180 hari. Tidak ada informasi pribadi di log."
                    checked={settings.privacy.activity_tracking}
                    disabled={isSaving}
                    onChange={(activity_tracking) => {
                      setTrackingEnabled(activity_tracking)
                      patch({ privacy: { activity_tracking } })
                    }}
                  />
                </SwitchGroup>
                <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                  Lihat ringkasan minat di{' '}
                  <Link href="/me/interests" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
                    halaman Minat saya
                  </Link>
                  .
                </p>
              </SettingsSectionCard>

              <SettingsSectionCard title="Data & penemuan">
                <SwitchGroup>
                  <SettingsToggleRow
                    label="Tampilkan email di profil"
                    description="Email terlihat di halaman profil publik Anda."
                    checked={settings.privacy.show_email}
                    disabled={isSaving}
                    onChange={(show_email) => patch({ privacy: { show_email } })}
                  />
                  <SettingsToggleRow
                    label="Dapat ditemukan di pencarian"
                    description="Profil muncul saat pengguna lain mencari nama atau username."
                    checked={settings.privacy.searchable}
                    disabled={isSaving}
                    onChange={(searchable) => patch({ privacy: { searchable } })}
                  />
                </SwitchGroup>
              </SettingsSectionCard>
            </div>
          )}
        </QueryState>
      </SettingsShell>
      <SettingsSavedToast show={saved} />
    </DetailPageShell>
  )
}
