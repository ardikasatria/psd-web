'use client'

import { useContext } from 'react'
import { ThemeContext } from '@/app/theme-provider'
import { QueryState } from '@/components/features/QueryState'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { SettingsSavedToast } from '@/components/features/settings/SettingsSavedToast'
import { SettingsSectionCard } from '@/components/features/settings/SettingsSectionCard'
import { SettingsShell } from '@/components/features/settings/SettingsShell'
import { SettingsToggleRow } from '@/components/features/settings/SettingsToggleRow'
import { useSettingsPage } from '@/components/features/settings/useSettingsPage'
import { applyAppearanceSettings } from '@/lib/settings/appearance'
import { Field, Label } from '@/shared/fieldset'
import clsx from 'clsx'
import { SwitchGroup } from '@/shared/switch'
import type { SettingsAppearance } from '@/types/api'

const themeOptions: { value: SettingsAppearance['theme']; label: string }[] = [
  { value: 'system', label: 'Sistem' },
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
]

const languageOptions: { value: SettingsAppearance['language']; label: string }[] = [
  { value: 'id', label: 'Bahasa Indonesia' },
  { value: 'en', label: 'English' },
]

export function AppearanceSettingsContent() {
  const theme = useContext(ThemeContext)
  const { settings, isLoading, isError, error, patch, saved, isSaving } = useSettingsPage('/settings/appearance')

  const updateAppearance = (vals: Partial<SettingsAppearance>) => {
    if (!settings) return
    const next = { ...settings.appearance, ...vals }
    applyAppearanceSettings(next, theme?.setThemeMode)
    patch({ appearance: vals })
  }

  return (
    <DetailPageShell>
      <DetailPageHeader
        title="Tampilan"
        subtitle="Sesuaikan tema, bahasa, dan animasi antarmuka PSD."
      />
      <SettingsShell active="appearance">
        <QueryState isLoading={isLoading} isError={isError} error={error} skeletonColumns={2}>
          {settings && (
            <div className="space-y-6">
              <SettingsSectionCard title="Tema warna">
                <Field>
                  <Label>Mode tampilan</Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {themeOptions.map((opt) => {
                      const active = settings.appearance.theme === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isSaving}
                          onClick={() => updateAppearance({ theme: opt.value })}
                          className={clsx(
                            'rounded-full px-4 py-2 text-sm font-medium motion-safe:transition-colors',
                            active
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600'
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </Field>
              </SettingsSectionCard>

              <SettingsSectionCard title="Bahasa">
                <Field>
                  <Label>Preferensi bahasa</Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {languageOptions.map((opt) => {
                      const active = settings.appearance.language === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isSaving}
                          onClick={() => updateAppearance({ language: opt.value })}
                          className={clsx(
                            'rounded-full px-4 py-2 text-sm font-medium motion-safe:transition-colors',
                            active
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600'
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                    Terjemahan penuh akan menyusul; preferensi disimpan untuk pengalaman mendatang.
                  </p>
                </Field>
              </SettingsSectionCard>

              <SettingsSectionCard title="Aksesibilitas">
                <SwitchGroup>
                  <SettingsToggleRow
                    label="Kurangi animasi"
                    description="Meminimalkan transisi dan efek gerak di antarmuka."
                    checked={settings.appearance.reduced_motion}
                    disabled={isSaving}
                    onChange={(reduced_motion) => updateAppearance({ reduced_motion })}
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
