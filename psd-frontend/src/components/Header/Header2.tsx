import { getNavigation } from '@/data/navigation'
import { getAllPosts } from '@/data/posts'
import Logo from '@/shared/Logo'
import clsx from 'clsx'
import { FC } from 'react'
import HamburgerBtnMenu from './HamburgerBtnMenu'
import HeaderAuthActions from './HeaderAuthActions'
import { NotificationBell } from '@/components/features/notifications/NotificationBell'
import Navigation from './Navigation/Navigation'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import SearchModal from './SearchModal'

interface Props {
  bottomBorder?: boolean
  className?: string
}

const Header2: FC<Props> = async ({ bottomBorder, className }) => {
  const navigationMenu = await getNavigation()
  const featuredPosts = (await getAllPosts()).slice(0, 2)

  return (
    <div
      className={clsx(
        'header-2 sticky top-0 z-30 border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900',
        bottomBorder && 'border-b',
        !bottomBorder && 'has-[.header-popover-full-panel]:border-b',
        className
      )}
    >
      <div className="container flex h-20 items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-x-4 sm:gap-x-5 lg:gap-x-7">
          <Logo />
          <div className="hidden h-8 border-l lg:block" />
          <div className="hidden lg:block">
            <SearchModal />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-x-1 sm:gap-x-2">
          <div className="hidden lg:block">
            <Navigation menu={navigationMenu} featuredPosts={featuredPosts} />
          </div>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          <NotificationBell />
          <HeaderAuthActions className="me-2" />
          <div className="flex lg:hidden">
            <HamburgerBtnMenu />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header2
