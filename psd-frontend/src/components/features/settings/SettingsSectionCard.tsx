import clsx from 'clsx'
import type { ReactNode } from 'react'

export function SettingsSectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={clsx(
        'overflow-hidden rounded-3xl border border-neutral-200/80 bg-white dark:border-neutral-700 dark:bg-neutral-800',
        className
      )}
    >
      <div className="h-1 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400" aria-hidden />
      <div className="border-b border-neutral-100 px-6 py-5 dark:border-neutral-700">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}
