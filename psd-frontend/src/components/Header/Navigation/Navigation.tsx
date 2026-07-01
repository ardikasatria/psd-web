import { getNavItemIcon } from '@/data/navigation-icons'
import { TNavigationItem } from '@/data/navigation'
import { TPost } from '@/data/posts'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Link from 'next/link'
import { FC } from 'react'
import { NavDropdownMenu } from './NavDropdownMenu'
import { NavMegaMenu } from './NavMegaMenu'

const Lv1MenuItem = ({ menuItem }: { menuItem: TNavigationItem }) => {
  const Icon = getNavItemIcon(menuItem)
  const isDropdown = menuItem.type === 'dropdown' && !!menuItem.children?.length

  const className =
    'flex items-center gap-2 self-center rounded-full px-4 py-2.5 text-sm font-medium whitespace-nowrap text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 lg:text-[15px] xl:px-5 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'

  const content = (
    <>
      {Icon && (
        <Icon className="size-[18px] shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
      )}
      {menuItem.name}
      {(menuItem.children?.length || isDropdown) && (
        <ChevronDownIcon className="ms-1 -me-1 size-4 text-neutral-400" aria-hidden="true" />
      )}
    </>
  )

  if (isDropdown) {
    return (
      <span className={className} aria-haspopup="true">
        {content}
      </span>
    )
  }

  return (
    <Link className={className} href={menuItem.href || '#'}>
      {content}
    </Link>
  )
}

export interface Props {
  menu: TNavigationItem[]
  className?: string
  featuredPosts: TPost[]
}

const Navigation: FC<Props> = ({ menu, className }) => {
  return (
    <ul className={clsx('flex', className)}>
      {menu.map((menuItem) => {
        if (menuItem.type === 'mega-menu') {
          return <NavMegaMenu key={menuItem.id} menuItem={menuItem} />
        }
        if (menuItem.type === 'dropdown' || menuItem.type === 'hamburger-menu') {
          return <NavDropdownMenu key={menuItem.id} menuItem={menuItem} />
        }
        return (
          <li key={menuItem.id} className="relative menu-item flex">
            <Lv1MenuItem menuItem={menuItem} />
          </li>
        )
      })}
    </ul>
  )
}

export default Navigation
