'use client'

import { getNavItemIcon } from '@/data/navigation-icons'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { filterNavigationByAuth, TNavigationItem } from '@/data/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { Link } from '@/shared/link'
import SocialsList from '@/shared/SocialsList'
import { Disclosure, DisclosureButton, DisclosurePanel, useClose } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import React, { useMemo, useState } from 'react'

interface Props {
  data: TNavigationItem[]
}

const SidebarNavigation: React.FC<Props> = ({ data }) => {
  const handleClose = useClose()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const { isLoggedIn } = useAuth()
  const navItems = useMemo(() => filterNavigationByAuth(data, isLoggedIn), [data, isLoggedIn])

  const _renderMenuChild = (
    item: TNavigationItem,
    itemClass = 'ps-3 text-neutral-900 dark:text-neutral-200 font-medium'
  ) => {
    return (
      <ul className="nav-mobile-sub-menu ps-6 pb-1 text-base">
        {item.children?.map((childMenu, index) => {
          const ChildIcon = getNavItemIcon(childMenu)
          return (
          <Disclosure key={index} as="li">
            <Link
              href={childMenu.href || '#'}
              onClick={handleClose}
              className={`mt-0.5 flex items-center gap-2.5 rounded-lg pe-4 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${itemClass}`}
            >
              {ChildIcon && (
                <ChildIcon className="size-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
              )}
              <span className={`py-2.5 ${!childMenu.children ? 'block w-full' : ''}`}>{childMenu.name}</span>
              {childMenu.children && (
                <span className="flex grow items-center" onClick={(e) => e.preventDefault()}>
                  <DisclosureButton as="span" className="flex grow justify-end">
                    <ChevronDownIcon className="ms-2 h-4 w-4 text-neutral-500" aria-hidden="true" />
                  </DisclosureButton>
                </span>
              )}
            </Link>
            {childMenu.children && (
              <DisclosurePanel>
                {_renderMenuChild(childMenu, 'ps-3 text-neutral-600 dark:text-neutral-400')}
              </DisclosurePanel>
            )}
          </Disclosure>
          )
        })}
      </ul>
    )
  }

  const _renderMegaMenuChild = (item: TNavigationItem) => (
    <ul className="nav-mobile-sub-menu space-y-5 ps-3 pb-2">
      {item.children?.map((col) => (
        <li key={col.id}>
          {col.name ? (
            <p className="px-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
              {col.name}
            </p>
          ) : null}
          <ul className={clsx('space-y-0.5', col.name ? 'mt-2' : 'mt-0')}>
            {col.children?.map((link) => {
              const LinkIcon = getNavItemIcon(link)
              return (
                <li key={link.id}>
                  <Link
                    href={link.href || '#'}
                    onClick={handleClose}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {LinkIcon && (
                      <LinkIcon className="size-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
                    )}
                    {link.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ul>
  )

  const _renderItem = (menu: TNavigationItem, index: number) => {
    const isMegaMenu = menu.type === 'mega-menu' && !!menu.children?.length
    const isDropdown =
      (menu.type === 'dropdown' || menu.type === 'hamburger-menu') && !!menu.children?.length
    const hasPanel = isMegaMenu || isDropdown
    const Icon = !hasPanel ? getNavItemIcon(menu) : null
    return (
      <Disclosure key={index} as="li" className="text-neutral-900 dark:text-white">
        <DisclosureButton className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-start text-sm font-medium tracking-wide uppercase hover:bg-neutral-100 dark:hover:bg-neutral-800">
          {Icon && (
            <Icon className="size-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
          )}
          {hasPanel ? (
            <span className="block flex-1 py-2.5">{menu.name}</span>
          ) : (
            <Link
              href={menu.href || '#'}
              className={clsx(!menu.children?.length && 'flex-1', 'block py-2.5')}
              onClick={handleClose}
            >
              {menu.name}
            </Link>
          )}
          {menu.children?.length && (
            <div className="flex flex-1 justify-end">
              <ChevronDownIcon className="ms-2 h-4 w-4 self-center text-neutral-500" aria-hidden="true" />
            </div>
          )}
        </DisclosureButton>
        {menu.children &&
          (isMegaMenu ? (
            <DisclosurePanel>{_renderMegaMenuChild(menu)}</DisclosurePanel>
          ) : (
            <DisclosurePanel>{_renderMenuChild(menu)}</DisclosurePanel>
          ))}
      </Disclosure>
    )
  }

  const renderSearchForm = () => {
    return (
      <form
        action="#"
        method="POST"
        className="flex-1 text-neutral-900 dark:text-neutral-200"
        onSubmit={(e) => {
          e.preventDefault()
          handleClose()
          const q = searchQuery.trim()
          router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
        }}
      >
        <div className="flex h-full items-center gap-x-2.5 rounded-xl bg-neutral-50 px-3 py-3 dark:bg-neutral-800">
          <HugeiconsIcon icon={Search01Icon} size={24} color="currentColor" strokeWidth={1.5} />
          <input
            type="search"
            name="q"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari..."
            className="w-full border-none bg-transparent focus:ring-0 focus:outline-hidden sm:text-sm"
          />
        </div>
        <input type="submit" hidden value="" />
      </form>
    )
  }

  return (
    <div>
      <p className="text-sm/relaxed text-neutral-600 dark:text-neutral-400">
        Platform sains data kolaboratif lokal Indonesia. Temukan, bagikan, dan kembangkan proyek, dataset, dan model
        bersama komunitas.
      </p>
      <div className="mt-5 flex items-center justify-between">
        <SocialsList />
      </div>
      <div className="mt-5 flex items-center gap-3">
        <div className="min-w-0 flex-1">{renderSearchForm()}</div>
        <ThemeToggle />
      </div>
      <ul className="flex flex-col gap-y-1 px-2 py-6">{navItems.map(_renderItem)}</ul>
    </div>
  )
}

export default SidebarNavigation
