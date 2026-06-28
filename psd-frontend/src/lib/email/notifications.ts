import type { Settings, SettingsEmail } from '@/types/api'

export type EmailEventMode = SettingsEmail['default_mode']
export type EmailEventOverride = EmailEventMode | 'default'

export const MODE_OPTIONS: { value: EmailEventOverride; label: string }[] = [
  { value: 'default', label: 'Ikuti default' },
  { value: 'immediate', label: 'Segera' },
  { value: 'digest', label: 'Ringkasan harian' },
  { value: 'off', label: 'Mati' },
]

export const MODE_HINT: Record<EmailEventMode, string> = {
  immediate: 'Segera',
  digest: 'Ringkasan harian',
  off: 'Mati',
}

/** Default backend per tipe (mirrors app/email/events.py). */
export const EVENT_DEFAULT_MODES: Record<string, EmailEventMode> = {
  event: 'immediate',
  course: 'immediate',
  course_published: 'immediate',
  course_enrolled: 'immediate',
  competition: 'immediate',
  competition_result: 'immediate',
  comment: 'digest',
  pr_commented: 'digest',
  pr_opened: 'immediate',
  pr_reviewed: 'immediate',
  pr_merged: 'immediate',
  drift_alert: 'immediate',
  model_promoted: 'immediate',
  follow: 'digest',
}

type LegacyNotifKey = keyof Settings['notifications']

export type EmailEventGroup = {
  legacyKey: LegacyNotifKey | null
  title: string
  events: { key: string; label: string }[]
}

export const EMAIL_EVENT_GROUPS: EmailEventGroup[] = [
  {
    legacyKey: 'email_event_reminder',
    title: 'Event & pembelajaran',
    events: [
      { key: 'event', label: 'Pengingat event' },
      { key: 'course', label: 'Course & enrollment' },
      { key: 'course_published', label: 'Course baru dipublish' },
    ],
  },
  {
    legacyKey: 'email_competition',
    title: 'Kompetisi',
    events: [
      { key: 'competition', label: 'Pembaruan kompetisi' },
      { key: 'competition_result', label: 'Hasil & leaderboard' },
    ],
  },
  {
    legacyKey: 'email_forum_reply',
    title: 'Forum & kontribusi Git',
    events: [
      { key: 'comment', label: 'Balasan forum' },
      { key: 'pr_commented', label: 'Komentar pull request' },
      { key: 'pr_opened', label: 'Pull request baru' },
      { key: 'pr_merged', label: 'PR di-merge' },
    ],
  },
  {
    legacyKey: null,
    title: 'ML & monitoring',
    events: [
      { key: 'drift_alert', label: 'Alert drift model' },
      { key: 'model_promoted', label: 'Model dipromosikan' },
    ],
  },
]

export function getEventOverride(settings: Settings, eventKey: string): EmailEventOverride {
  return settings.email.events?.[eventKey] ?? 'default'
}

export function eventDefaultHint(eventKey: string, settings: Settings): string {
  const sys = EVENT_DEFAULT_MODES[eventKey] ?? 'immediate'
  if (sys === 'immediate') {
    return `Jika ikuti default: ${MODE_HINT[settings.email.default_mode]}`
  }
  return `Jika ikuti default: ${MODE_HINT[sys]}`
}

export function patchEventModes(
  current: Settings['email']['events'] | undefined,
  eventKey: string,
  value: EmailEventOverride,
): Settings['email']['events'] {
  const next = { ...(current ?? {}) }
  if (value === 'default') {
    delete next[eventKey]
  } else {
    next[eventKey] = value
  }
  return next
}

export function isLegacyGroupEnabled(settings: Settings, legacyKey: LegacyNotifKey | null): boolean {
  if (!settings.email.email_enabled) return false
  if (!legacyKey) return true
  return Boolean(settings.notifications[legacyKey])
}
