import clsx from 'clsx'

export type SidebarStatAccent = 'primary' | 'sky' | 'indigo' | 'violet' | 'emerald' | 'amber'

const accentClass: Record<SidebarStatAccent, string> = {
  primary: 'text-primary-600 dark:text-primary-400',
  sky: 'text-sky-600 dark:text-sky-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  violet: 'text-violet-600 dark:text-violet-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
}

/** Stat tile grid item — sidebar learn panels */
export const sidebarStatTileClass =
  'rounded-2xl border border-primary-100/80 bg-primary-50/50 p-3 dark:border-neutral-700 dark:bg-neutral-800/90'

/** Neutral sidebar section (journey, links) */
export const sidebarSectionClass =
  'rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/90'

/** Accent sidebar callout (featured lists, highlights) */
export const sidebarCalloutClass =
  'rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-800/90'

/** Dashed tips / CTA panel in sidebar */
export const sidebarTipClass =
  'rounded-2xl border border-dashed border-primary-200/80 bg-primary-50/40 p-4 dark:border-neutral-600 dark:bg-neutral-800/60'

/** Dashed CTA panel on main content area */
export const pageCtaPanelClass =
  'rounded-3xl border border-dashed border-primary-300/70 bg-primary-50/40 px-6 py-8 text-center dark:border-neutral-600 dark:bg-neutral-800/60'

/** Featured / highlight strip on main page content */
export const pageHighlightStripClass =
  'rounded-3xl border border-neutral-200/70 bg-neutral-50/70 p-6 dark:border-neutral-700 dark:bg-neutral-800/50'

type Props = {
  label: string
  value: number | string
  icon: React.ReactNode
  accent?: SidebarStatAccent
  className?: string
}

export function SidebarStatTile({ label, value, icon, accent = 'primary', className }: Props) {
  return (
    <div className={clsx(sidebarStatTileClass, className)}>
      <div className={clsx('flex items-center gap-2', accentClass[accent])}>{icon}</div>
      <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-300">{label}</p>
    </div>
  )
}
