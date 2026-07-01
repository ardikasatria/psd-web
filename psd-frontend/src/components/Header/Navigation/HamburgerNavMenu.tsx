'use client'

import { getNavItemIcon } from '@/data/navigation-icons'
import { filterNavigationByAuth, TNavigationItem } from '@/data/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { Bars3Icon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useMemo } from 'react'

function DropdownMenuLink({ menuItem }: { menuItem: TNavigationItem }) {
  const Icon = getNavItemIcon(menuItem)
  return (
    <Link
      className="flex items-center gap-2.5 rounded-md px-4 py-2.5 font-normal text-neutral-600 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      href={menuItem.href || '#'}
    >
      {Icon && <Icon className="size-[18px] shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />}
      {menuItem.name}
      {menuItem.children?.length && (
        <ChevronDownIcon className="ml-auto h-4 w-4 text-neutral-500" aria-hidden="true" />
      )}
    </Link>
  )
}

export function HamburgerNavMenu({ menuItem }: { menuItem: TNavigationItem }) {
  const { isLoggedIn } = useAuth()
  const children = useMemo(
    () => filterNavigationByAuth(menuItem.children ?? [], isLoggedIn),
    [menuItem.children, isLoggedIn],
  )

  return (
    <li className="menu-dropdown relative menu-item flex">
      <span
        className="flex cursor-default items-center gap-0.5 self-center rounded-full px-3 py-2.5 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        aria-haspopup="true"
        aria-label={menuItem.name ?? 'Menu lainnya'}
      >
        <Bars3Icon className="size-5" aria-hidden />
        <ChevronDownIcon className="size-4 text-neutral-400" aria-hidden />
      </span>

      {children.length > 0 ? (
        <div className="absolute top-full left-1/2 z-50 sub-menu w-52 -translate-x-1/2 pt-1">
          <ul className="relative grid space-y-0.5 rounded-xl bg-white py-2 text-sm shadow-lg ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
            {children.map((childItem) => (
              <li key={childItem.id} className="px-1.5">
                <DropdownMenuLink menuItem={childItem} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  )
}
