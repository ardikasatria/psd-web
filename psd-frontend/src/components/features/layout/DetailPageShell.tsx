import clsx from 'clsx'
import { ReactNode } from 'react'

interface DetailPageShellProps {
  children: ReactNode
  className?: string
}

export function DetailPageShell({ children, className }: DetailPageShellProps) {
  return (
    <div className={clsx('relative pb-16 lg:pb-24', className)}>
      <div className="container space-y-8 pt-8 lg:space-y-10 lg:pt-12">{children}</div>
    </div>
  )
}

interface DetailPageHeaderProps {
  title: string
  subtitle?: string
  badges?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
}

export function DetailPageHeader({ title, subtitle, badges, meta, actions }: DetailPageHeaderProps) {
  return (
    <div className="relative isolate overflow-hidden rounded-[32px] border border-neutral-200/80 bg-white p-6 lg:rounded-[40px] lg:p-10 dark:border-neutral-700 dark:bg-neutral-800">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400" />
        <div className="absolute -end-8 -top-8 size-40 rounded-full bg-primary-100/50 blur-3xl dark:bg-primary-900/20" />
      </div>
      <div className="relative z-10">
        {badges && <div className="mb-4 flex flex-wrap gap-2">{badges}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl lg:text-4xl dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-base text-neutral-500 lg:text-lg dark:text-neutral-400">{subtitle}</p>
        )}
        {meta && <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-500">{meta}</div>}
        {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  )
}
