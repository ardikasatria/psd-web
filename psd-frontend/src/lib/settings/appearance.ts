import type { Settings, SettingsAppearance } from '@/types/api'
import type { ThemeMode } from '@/app/theme-provider'

export const DEFAULT_SETTINGS: Settings = {
  notifications: {
    email_event_reminder: true,
    email_competition: true,
    email_forum_reply: true,
    inapp: true,
  },
  privacy: {
    profile_visibility: 'public',
    show_email: false,
    searchable: true,
    activity_tracking: true,
  },
  appearance: {
    theme: 'system',
    language: 'id',
    reduced_motion: false,
  },
}

export function mergeSettings(stored: Partial<Settings> | null | undefined): Settings {
  const out: Settings = {
    notifications: { ...DEFAULT_SETTINGS.notifications },
    privacy: { ...DEFAULT_SETTINGS.privacy },
    appearance: { ...DEFAULT_SETTINGS.appearance },
  }
  if (!stored) return out
  if (stored.notifications) {
    out.notifications = { ...out.notifications, ...stored.notifications }
  }
  if (stored.privacy) {
    out.privacy = { ...out.privacy, ...stored.privacy }
  }
  if (stored.appearance) {
    out.appearance = { ...out.appearance, ...stored.appearance }
  }
  return out
}

export function applyAppearanceSettings(
  appearance: SettingsAppearance,
  setThemeMode?: (mode: ThemeMode) => void,
) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = appearance.language
    document.documentElement.classList.toggle('reduce-motion', appearance.reduced_motion)
  }
  if (setThemeMode) {
    setThemeMode(appearance.theme)
  }
}

export function initReducedMotionFromOs() {
  if (typeof window === 'undefined') return
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) {
    document.documentElement.classList.add('reduce-motion')
  }
}
