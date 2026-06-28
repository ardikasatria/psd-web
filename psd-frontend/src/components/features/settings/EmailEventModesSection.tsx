'use client'

import {
  EMAIL_EVENT_GROUPS,
  MODE_OPTIONS,
  eventDefaultHint,
  getEventOverride,
  isLegacyGroupEnabled,
  patchEventModes,
} from '@/lib/email/notifications'
import type { Settings, SettingsEmail } from '@/types/api'
import { Description } from '@/shared/fieldset'

type Props = {
  settings: Settings
  disabled: boolean
  onPatchEvents: (events: SettingsEmail['events']) => void
}

export function EmailEventModesSection({ settings, disabled, onPatchEvents }: Props) {
  return (
    <div className="mt-6 space-y-6">
      <div>
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Mode per jenis notifikasi</p>
        <Description className="mt-1">
          Atur granular immediate, ringkasan harian, atau mati per tipe. Pilihan &quot;Ikuti default&quot; memakai mode
          default di atas. Tautan berhenti berlangganan di footer email menonaktifkan semua email notifikasi.
        </Description>
      </div>

      {EMAIL_EVENT_GROUPS.map((group) => {
        const groupDisabled = disabled || !isLegacyGroupEnabled(settings, group.legacyKey)
        return (
          <div key={group.title} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-700">
            <div className="border-b border-neutral-200/80 px-4 py-3 dark:border-neutral-700">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{group.title}</p>
              {groupDisabled && !disabled && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  Kategori dinonaktifkan — aktifkan toggle di atas untuk mengatur mode per jenis.
                </p>
              )}
            </div>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {group.events.map((ev) => {
                const value = getEventOverride(settings, ev.key)
                return (
                  <li key={ev.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-800 dark:text-neutral-200">{ev.label}</p>
                      <p className="text-xs text-neutral-500">{eventDefaultHint(ev.key, settings)}</p>
                    </div>
                    <select
                      className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm sm:w-52 dark:border-zinc-600 dark:bg-zinc-900"
                      value={value}
                      disabled={groupDisabled}
                      onChange={(e) => {
                        const next = patchEventModes(
                          settings.email.events,
                          ev.key,
                          e.target.value as SettingsEmail['default_mode'] | 'default',
                        )
                        onPatchEvents(next)
                      }}
                    >
                      {MODE_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
