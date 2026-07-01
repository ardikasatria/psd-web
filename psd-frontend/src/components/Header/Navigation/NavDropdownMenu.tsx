'use client'

import { getNavItemIcon } from '@/data/navigation-icons'
import { filterNavigationByAuth, TNavigationItem } from '@/data/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
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
    </Link>
  )
}

export function NavDropdownMenu({ menuItem }: { menuItem: TNavigationItem }) {
  const { isLoggedIn } = useAuth()
  const children = useMemo(
    () => filterNavigationByAuth(menuItem.children ?? [], isLoggedIn),
    [menuItem.children, isLoggedIn],
  )

  const triggerClass =
    'flex cursor-default items-center gap-1 self-center rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 lg:text-[15px] xl:px-5 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'

  return (
    <li className="menu-dropdown relative menu-item flex">
      <span className={triggerClass} aria-haspopup="true">
        {menuItem.name}
        <ChevronDownIcon className="ms-1 -me-1 size-4 text-neutral-400" aria-hidden />
      </span>

      {children.length > 0 ? (
        <div className="absolute top-full left-0 z-50 sub-menu w-56 pt-1">
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
