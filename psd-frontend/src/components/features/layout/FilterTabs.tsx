import clsx from 'clsx'
import Link from 'next/link'

export interface FilterTab {
  label: string
  href: string
  isActive?: boolean
}

interface FilterTabsProps {
  tabs: FilterTab[]
  className?: string
}

export function FilterTabs({ tabs, className }: FilterTabsProps) {
  return (
    <div
      className={clsx(
        'flex flex-wrap gap-2 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-1.5 dark:border-neutral-700 dark:bg-neutral-800/50',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          role="tab"
          aria-selected={tab.isActive}
          className={clsx(
            'rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
            tab.isActive
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-neutral-600 hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
