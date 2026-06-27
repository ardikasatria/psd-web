/**
 * Gradient panels for feature pages — light pastels + dark neutral base with accent tint.
 * Dark pattern: neutral-900 → neutral-800 → accent-950 (avoids washed-out pastels in dark mode).
 */

const darkCore = 'dark:border-neutral-700 dark:from-neutral-900 dark:via-neutral-800/95'

/** Large page hero (title strip) */
export const heroGradient = {
  project:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-emerald-50/70 to-indigo-50/60 p-8 ${darkCore} dark:to-emerald-950/40 sm:p-10`,
  notebook:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-sky-50/70 to-indigo-50/60 p-8 ${darkCore} dark:to-sky-950/40 sm:p-10`,
  competition:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-amber-50 via-orange-50/70 to-rose-50/60 p-8 ${darkCore} dark:to-orange-950/40 sm:p-10`,
  ideaRoom:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-sky-50/70 to-indigo-50/60 p-8 ${darkCore} dark:to-indigo-950/40 sm:p-10`,
  team:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-sky-50/70 to-amber-50/40 p-8 ${darkCore} dark:to-amber-950/40 sm:p-10`,
  gamification:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-violet-50/70 to-indigo-50/60 p-8 ${darkCore} dark:to-violet-950/40 sm:p-10`,
  learn:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-sky-50/70 to-indigo-50/60 p-8 ${darkCore} dark:to-sky-950/40 sm:p-10`,
  event:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-blue-50/70 to-sky-50/60 p-8 ${darkCore} dark:to-blue-950/40 sm:p-10`,
} as const

/** Concept / explainer box (gradient-to-br) */
export const conceptGradientBr = {
  project:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50/80 via-white to-emerald-50/60 p-6 ${darkCore} dark:to-emerald-950/35 sm:p-8`,
  notebook:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50/80 via-white to-sky-50/60 p-6 ${darkCore} dark:to-sky-950/35 sm:p-8`,
  competition:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 p-6 ${darkCore} dark:to-orange-950/35 sm:p-8`,
  ideaRoom:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50/80 via-white to-sky-50/60 p-6 ${darkCore} dark:to-indigo-950/35 sm:p-8`,
  team:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50/80 via-white to-amber-50/60 p-6 ${darkCore} dark:to-amber-950/35 sm:p-8`,
  gamification:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50/80 via-white to-violet-50/60 p-6 ${darkCore} dark:to-violet-950/35 sm:p-8`,
  learn:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50/80 via-white to-sky-50/60 p-6 ${darkCore} dark:to-sky-950/35 sm:p-8`,
} as const

/** Journey / flow box (gradient-to-r) */
export const conceptGradientRow = {
  project:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-r from-emerald-50/60 via-white to-primary-50/50 p-6 ${darkCore} dark:to-emerald-950/30 sm:p-8`,
  notebook:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-r from-sky-50/60 via-white to-primary-50/50 p-6 ${darkCore} dark:to-sky-950/30 sm:p-8`,
  competition:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-r from-orange-50/60 via-white to-amber-50/50 p-6 ${darkCore} dark:to-orange-950/30 sm:p-8`,
  ideaRoom:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-r from-primary-50/80 via-white to-sky-50/60 p-6 ${darkCore} dark:to-indigo-950/30 sm:p-8`,
  team:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-r from-primary-50/80 via-white to-amber-50/50 p-6 ${darkCore} dark:to-amber-950/30 sm:p-8`,
  gamification:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-r from-violet-50/60 via-white to-primary-50/50 p-6 ${darkCore} dark:to-violet-950/30 sm:p-8`,
  learn:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-r from-sky-50/60 via-white to-primary-50/50 p-6 ${darkCore} dark:to-sky-950/30 sm:p-8`,
} as const

/** Sidebar / compact callout (gradient-to-br, smaller) */
export const sidebarGradientBr = {
  project:
    `rounded-2xl border border-primary-200/80 bg-gradient-to-br from-primary-50/90 to-emerald-50/60 p-4 ${darkCore} dark:to-emerald-950/35`,
  notebook:
    `rounded-2xl border border-primary-200/80 bg-gradient-to-br from-primary-50/90 to-sky-50/60 p-4 ${darkCore} dark:to-sky-950/35`,
  competition:
    `rounded-2xl border border-primary-200/80 bg-gradient-to-br from-amber-50/90 to-orange-50/60 p-4 ${darkCore} dark:to-orange-950/35`,
  ideaRoom:
    `rounded-2xl border border-primary-200/80 bg-gradient-to-br from-primary-50/90 to-sky-50/60 p-4 ${darkCore} dark:to-indigo-950/35`,
  team:
    `rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-primary-50/60 p-4 ${darkCore} dark:to-amber-950/35`,
  gamification:
    `rounded-2xl border border-primary-200/80 bg-gradient-to-br from-primary-50/90 to-violet-50/60 p-4 ${darkCore} dark:to-violet-950/35`,
  learn:
    `rounded-2xl border border-primary-200/60 bg-gradient-to-br from-primary-50/90 via-sky-50/50 to-indigo-50/40 p-4 ${darkCore} dark:to-sky-950/35`,
  event:
    `rounded-2xl border border-primary-200/80 bg-gradient-to-br from-primary-50/90 to-blue-50/50 p-4 ${darkCore} dark:to-blue-950/35`,
  model:
    `rounded-2xl border border-primary-200/80 bg-gradient-to-br from-violet-50/90 to-indigo-50/60 p-4 ${darkCore} dark:to-indigo-950/35`,
} as const

/** Model feature — violet/indigo accent */
export const modelGradient = {
  hero:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-violet-50 via-indigo-50/70 to-sky-50/60 p-8 ${darkCore} dark:to-indigo-950/40 sm:p-10`,
  conceptBr:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/60 p-6 ${darkCore} dark:to-indigo-950/35 sm:p-8`,
  conceptRow:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-r from-indigo-50/60 via-white to-violet-50/50 p-6 ${darkCore} dark:to-violet-950/30 sm:p-8`,
} as const

/** Highlight strip on main content */
export const highlightGradientBr = {
  team:
    `rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50/70 to-primary-50/50 p-6 ${darkCore} dark:to-amber-950/35`,
  gamification:
    `overflow-hidden rounded-3xl border border-primary-200/70 bg-gradient-to-br from-primary-50 via-sky-50/50 to-indigo-50/40 ${darkCore} dark:to-violet-950/35`,
} as const

/** Data Sintesis — sky / indigo accent */
export const synthesisGradient = {
  hero:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-sky-50/70 to-indigo-50/60 p-8 ${darkCore} dark:to-indigo-950/40 sm:p-10`,
  conceptBr:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50/80 via-white to-sky-50/60 p-6 ${darkCore} dark:to-indigo-950/35 sm:p-8`,
  conceptRow:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-r from-sky-50/60 via-white to-indigo-50/50 p-6 ${darkCore} dark:to-indigo-950/30 sm:p-8`,
  warning:
    `rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/60 p-4 ${darkCore} dark:to-amber-950/35`,
  accentCard:
    `rounded-2xl border border-primary-200/80 bg-gradient-to-br from-primary-50/80 via-white to-sky-50/50 p-5 ${darkCore} dark:to-sky-950/30`,
  workshop:
    `rounded-3xl border border-primary-200/70 bg-gradient-to-br from-white via-primary-50/30 to-sky-50/40 p-6 ${darkCore} dark:to-indigo-950/35 sm:p-8`,
} as const

/** Neutral content panel — forms, tables, lists */
export const darkPanelClass =
  'rounded-2xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-800/90'

export const darkPanelLgClass =
  'rounded-3xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-800/90'

/** Pabrik Data — amber / orange accent */
export const factoryGradient = {
  hero:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-amber-50 via-orange-50/70 to-rose-50/60 p-8 ${darkCore} dark:to-orange-950/40 sm:p-10`,
  conceptBr:
    `rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50/80 via-white to-amber-50/60 p-6 ${darkCore} dark:to-orange-950/35 sm:p-8`,
  analyticsHero:
    `relative overflow-hidden rounded-3xl border border-primary-200/60 bg-gradient-to-br from-amber-50 via-rose-50/70 to-orange-50/60 p-8 ${darkCore} dark:to-rose-950/40 sm:p-10`,
} as const
