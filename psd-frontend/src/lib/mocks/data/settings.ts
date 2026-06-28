import { isStaff } from '@/lib/auth/roles'
import { DEFAULT_SETTINGS, mergeSettings } from '@/lib/settings/appearance'
import type { Settings, SettingsPatch } from '@/types/api'

const store: Record<string, Settings> = {}

export function getMockUserSettings(userId: string) {
  return mergeSettings(store[userId])
}

export function patchMockUserSettings(userId: string, patch: SettingsPatch) {
  const current = mergeSettings(store[userId])
  if (patch.notifications) {
    current.notifications = { ...current.notifications, ...patch.notifications }
  }
  if (patch.email) {
    current.email = {
      ...current.email,
      ...patch.email,
      events: { ...current.email.events, ...(patch.email.events ?? {}) },
    }
  }
  if (patch.privacy) {
    current.privacy = { ...current.privacy, ...patch.privacy }
  }
  if (patch.appearance) {
    current.appearance = { ...current.appearance, ...patch.appearance }
  }
  store[userId] = current
  return current
}

export function canViewMockProfile(targetUserId: string, viewerUserId: string | null, viewerRole?: string) {
  const settings = getMockUserSettings(targetUserId)
  if (settings.privacy.profile_visibility === 'public') return true
  if (viewerUserId === targetUserId) return true
  if (isStaff({ role: viewerRole })) return true
  return false
}

export function isMockUserSearchable(userId: string) {
  return getMockUserSettings(userId).privacy.searchable
}

export { DEFAULT_SETTINGS }
