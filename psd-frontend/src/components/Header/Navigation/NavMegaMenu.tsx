'use client'

import { getNavItemIcon } from '@/data/navigation-icons'
import { filterNavigationByAuth, TNavigationItem } from '@/data/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function MegaMenuLink({ item, onNavigate }: { item: TNavigationItem; onNavigate: () => void }) {
  const Icon = getNavItemIcon(item)
  return (
    <Link
      href={item.href || '#'}
      onClick={onNavigate}
      className="flex items-center gap-2.5 font-normal text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
    >
      {Icon && <Icon className="size-[18px] shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />}
      {item.name}
    </Link>
  )
}

export function NavMegaMenu({ menuItem }: { menuItem: TNavigationItem }) {
  const { isLoggedIn } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLLIElement>(null)

  const columns = useMemo(() => {
    const filtered = filterNavigationByAuth(menuItem.children ?? [], isLoggedIn)
    return filtered
      .map((col) => ({
        ...col,
        children: filterNavigationByAuth(col.children ?? [], isLoggedIn),
      }))
      .filter((col) => col.children?.length)
  }, [menuItem.children, isLoggedIn])

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((v) => !v), [])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open, close])

  const triggerClass =
    'flex items-center gap-1 self-center rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 lg:text-[15px] xl:px-5 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'

  const colCount = columns.length

  return (
    <li ref={rootRef} className="menu-megamenu relative flex">
      <button
        type="button"
        className={triggerClass}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
      >
        {menuItem.name}
        <ChevronDownIcon
          className={clsx('ms-1 -me-1 size-4 text-neutral-400 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {columns.length > 0 ? (
        <div
          className={clsx(
            'fixed inset-x-0 top-20 z-50 border-t border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900',
            open ? 'block' : 'hidden',
          )}
        >
          <div className="container py-8 text-sm lg:py-10">
            <div
              className={clsx(
                'grid gap-x-12 gap-y-8',
                colCount === 1 && 'max-w-sm grid-cols-1',
                colCount === 2 && 'grid-cols-2',
                colCount === 3 && 'grid-cols-3',
                colCount >= 4 && 'grid-cols-4',
              )}
            >
              {columns.map((col, index) => {
                const sectionTitle = col.name || columns[index - 1]?.name || ''
                return (
                <div key={col.id} className="min-w-0">
                  {col.name ? (
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{col.name}</p>
                  ) : (
                    <p className="font-medium invisible select-none" aria-hidden="true">
                      {sectionTitle}
                    </p>
                  )}
                  <ul className="mt-4 flex flex-col gap-3">
                    {col.children?.map((link) => (
                      <li key={link.id}>
                        <MegaMenuLink item={link} onNavigate={close} />
                      </li>
                    ))}
                  </ul>
                </div>
              )})}
            </div>
          </div>
        </div>
      ) : null}
    </li>
  )
}
