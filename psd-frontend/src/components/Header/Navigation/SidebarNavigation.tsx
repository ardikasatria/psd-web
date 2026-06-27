'use client'

import { getNavItemIcon } from '@/data/navigation-icons'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { TNavigationItem } from '@/data/navigation'
import { Link } from '@/shared/link'
import SocialsList from '@/shared/SocialsList'
import { Disclosure, DisclosureButton, DisclosurePanel, useClose } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

interface Props {
  data: TNavigationItem[]
}

const SidebarNavigation: React.FC<Props> = ({ data }) => {
  const handleClose = useClose()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

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

  const _renderItem = (menu: TNavigationItem, index: number) => {
    const isHamburger = menu.type === 'hamburger-menu'
    const Icon = isHamburger ? Bars3Icon : getNavItemIcon(menu)
    return (
      <Disclosure key={index} as="li" className="text-neutral-900 dark:text-white">
        <DisclosureButton className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-start text-sm font-medium tracking-wide uppercase hover:bg-neutral-100 dark:hover:bg-neutral-800">
          {Icon && (
            <Icon className="size-5 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
          )}
          {!isHamburger && (
            <Link
              href={menu.href || '#'}
              className={clsx(!menu.children?.length && 'flex-1', 'block py-2.5')}
              onClick={handleClose}
            >
              {menu.name}
            </Link>
          )}
          {isHamburger && <span className="block flex-1 py-2.5">{menu.name}</span>}
          {menu.children?.length && (
            <div className="flex flex-1 justify-end">
              <ChevronDownIcon className="ms-2 h-4 w-4 self-center text-neutral-500" aria-hidden="true" />
            </div>
          )}
        </DisclosureButton>
        {menu.children && <DisclosurePanel>{_renderMenuChild(menu)}</DisclosurePanel>}
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
      <p className="text-sm/relaxed">
        Discover the most outstanding articles on all topics of life. Write your stories and share them
      </p>
      <div className="mt-5 flex items-center justify-between">
        <SocialsList />
      </div>
      <div className="mt-5 flex items-center gap-3">
        <div className="min-w-0 flex-1">{renderSearchForm()}</div>
        <ThemeToggle />
      </div>
      <ul className="flex flex-col gap-y-1 px-2 py-6">{data?.map(_renderItem)}</ul>
    </div>
  )
}

export default SidebarNavigation
