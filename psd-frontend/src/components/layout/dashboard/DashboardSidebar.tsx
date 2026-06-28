'use client'

import {
  dashboardExternalLinks,
  dashboardMenuSections,
  dashboardTitleForPath,
  getStaffPanelLink,
} from '@/data/dashboard-menu'
import { getMe } from '@/lib/api/auth'
import { profilePath } from '@/lib/routes/profile'
import Avatar from '@/shared/Avatar'
import Logo from '@/shared/Logo'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Props {
  open: boolean
  onClose: () => void
}

export function DashboardSidebar({ open, onClose }: Props) {
  const pathname = usePathname()
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false })

  const user = me?.user
  const staffPanelLink = getStaffPanelLink(user?.role)

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/settings') return pathname.startsWith('/settings')
    return pathname.startsWith(href)
  }

  const navLink = (item: (typeof dashboardMenuSections)[0]['items'][0]) => {
    const Icon = item.icon
    const active = isActive(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={clsx(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          active
            ? 'bg-primary-600/10 text-primary-700 dark:bg-primary-600/20 dark:text-primary-300'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
        )}
      >
        <Icon className="size-5 shrink-0" aria-hidden />
        {item.name}
      </Link>
    )
  }

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-neutral-900/50 lg:hidden"
          onClick={onClose}
          aria-label="Tutup menu"
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-neutral-200 bg-white transition-transform duration-200 dark:border-neutral-700 dark:bg-neutral-900',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-neutral-200 px-4 dark:border-neutral-700">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Logo size="size-9" className="shrink-0" />
            <Link
              href="/"
              onClick={onClose}
              className="min-w-0 truncate text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100"
            >
              {process.env.NEXT_PUBLIC_APP_NAME ?? 'Projek Sains Data'}
            </Link>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 lg:hidden dark:hover:bg-neutral-800"
            onClick={onClose}
            aria-label="Tutup sidebar"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {user && (
          <div className="border-b border-neutral-200 px-4 py-4 dark:border-neutral-700">
            <Link
              href={user.username ? profilePath(user.username) : '/settings'}
              onClick={onClose}
              className="flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <Avatar
                src={user.avatar_url ?? undefined}
                alt={user.name}
                className="size-10"
                width={40}
                height={40}
                sizes="40px"
              />
              <div className="min-w-0 flex-1 text-start">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</p>
                <p className="truncate text-xs text-neutral-500">@{user.username}</p>
              </div>
            </Link>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {dashboardMenuSections.map((section) => (
            <div key={section.label} className="mb-4 last:mb-0">
              <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
                {section.label}
              </p>
              <div className="space-y-1">{section.items.map(navLink)}</div>
            </div>
          ))}

          {staffPanelLink && (
            <>
              <p className="mt-6 mb-2 px-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Staf</p>
              <div className="space-y-1">{navLink(staffPanelLink)}</div>
            </>
          )}

          <p className="mt-6 mb-2 px-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Situs</p>
          <div className="space-y-1">{dashboardExternalLinks.map(navLink)}</div>
        </nav>

        <div className="border-t border-neutral-200 p-4 dark:border-neutral-700">
          <div className="rounded-xl bg-primary-600/5 p-4 dark:bg-primary-600/10">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Butuh bantuan?</p>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              Panduan memulai, Git push, dan notebook JupyterHub.
            </p>
            <div className="mt-3 flex flex-col gap-2 text-xs font-medium">
              <Link href="/help/panduan-memulai" className="text-primary-600 hover:underline dark:text-primary-400">
                Panduan memulai →
              </Link>
              <Link href="/help" className="text-primary-600 hover:underline dark:text-primary-400">
                Pusat bantuan →
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
