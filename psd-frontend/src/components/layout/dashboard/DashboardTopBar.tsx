'use client'

import { ThemeToggle } from '@/components/common/ThemeToggle'
import { dashboardTitleForPath } from '@/data/dashboard-menu'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'

interface Props {
  title?: string
  onMenuClick: () => void
}

export function DashboardTopBar({ title, onMenuClick }: Props) {
  const pathname = usePathname()
  const pageTitle = title ?? dashboardTitleForPath(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8 dark:border-neutral-700 dark:bg-neutral-900/80">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800"
          onClick={onMenuClick}
          aria-label="Buka menu"
        >
          <Bars3Icon className="size-5" />
        </button>
        <h1 className="text-lg font-semibold text-neutral-900 sm:text-xl dark:text-neutral-100">{pageTitle}</h1>
      </div>

      <ThemeToggle />
    </header>
  )
}
