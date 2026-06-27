import { getNavMegaMenu } from '@/data/navigation'
import { getAllPosts } from '@/data/posts'
import Logo from '@/shared/Logo'
import clsx from 'clsx'
import { FC } from 'react'
import HamburgerBtnMenu from './HamburgerBtnMenu'
import HeaderAuthActions from './HeaderAuthActions'
import MegaMenuPopover from './MegaMenuPopover'
import SearchModal from './SearchModal'

interface HeaderProps {
  bottomBorder?: boolean
  className?: string
}

const Header: FC<HeaderProps> = async ({ bottomBorder, className }) => {
  const megamenu = await getNavMegaMenu()
  const featuredPosts = (await getAllPosts()).slice(0, 2)

  return (
    <div
      className={clsx(
        'sticky top-0 z-30 bg-white dark:bg-neutral-900',
        className
      )}
    >
      <div className="container">
        <div
          className={clsx(
            'flex h-20 justify-between gap-x-2.5 border-neutral-200 dark:border-neutral-700',
            bottomBorder && 'border-b',
            !bottomBorder && 'has-[.header-popover-full-panel]:border-b'
          )}
        >
          <div className="flex items-center gap-x-4 sm:gap-x-5 lg:gap-x-7">
            <Logo />
            <div className="h-8 border-l" />
            <SearchModal />
          </div>

          <div className="ms-auto flex items-center justify-end gap-x-0.5">
            <MegaMenuPopover megamenu={megamenu} featuredPosts={featuredPosts} className="hidden lg:block" />
            <div className="ms-6 me-3 hidden h-8 border-l lg:block" />
            <HeaderAuthActions className="me-2" />
            <div className="ms-2.5 flex lg:hidden">
              <HamburgerBtnMenu />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
