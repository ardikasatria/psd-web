import { Settings, SettingsPatch, SettingsSchema } from '@/types/api'
import { apiFetch } from './client'

export const getSettings = () => apiFetch('/me/settings', SettingsSchema)

export const updateSettings = (patch: SettingsPatch) =>
  apiFetch<Settings>('/me/settings', SettingsSchema, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
