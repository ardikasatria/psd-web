'use client'

import { adminExternalLinks, getAdminMenuForRole, getUserDashboardLink } from '@/data/admin-menu'
import { staffRoleLabel } from '@/lib/auth/roles'
import { getMe } from '@/lib/api/auth'
import { useLogout } from '@/lib/auth/useLogout'
import Avatar from '@/shared/Avatar'
import Logo from '@/shared/Logo'
import { Badge } from '@/shared/Badge'
import { Dropdown, DropdownButton, DropdownDivider, DropdownItem, DropdownMenu } from '@/shared/dropdown'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Props {
  open: boolean
  onClose: () => void
}

export function AdminSidebar({ open, onClose }: Props) {
  const pathname = usePathname()
  const handleLogout = useLogout()
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false })

  const user = me?.user
  const menuItems = getAdminMenuForRole(user?.role)
  const staffLabel = staffRoleLabel(user?.role)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const navLink = (item: (typeof menuItems)[0]) => {
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
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'
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
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Logo size="size-9" />
            <Badge color="zinc" className="!text-[10px]">
              Admin
            </Badge>
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
            <Dropdown>
              <DropdownButton
                as="button"
                className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800"
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
                  <p className="truncate text-xs text-neutral-500">
                    {staffLabel ?? 'Staf'}
                  </p>
                </div>
              </DropdownButton>
              <DropdownMenu>
                <DropdownItem href="/dashboard">Dasbor pengguna</DropdownItem>
                <DropdownDivider />
                <DropdownItem href="/me/orgs">Organisasi saya</DropdownItem>
                <DropdownItem href="/orgs/new">Buat organisasi</DropdownItem>
                <DropdownItem href="/orgs">Organisasi</DropdownItem>
                <DropdownDivider />
                <DropdownItem href="/settings">Pengaturan</DropdownItem>
                <DropdownItem onClick={handleLogout}>Keluar</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Kelola</p>
          <div className="space-y-1">{menuItems.map(navLink)}</div>

          <p className="mt-6 mb-2 px-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">Navigasi</p>
          <div className="space-y-1">
            {navLink(getUserDashboardLink())}
            {adminExternalLinks.map(navLink)}
          </div>
        </nav>

        {user?.role === 'superadmin' && (
          <div className="border-t border-neutral-200 p-4 dark:border-neutral-700">
            <div className="rounded-xl bg-primary-600/5 p-4 dark:bg-primary-600/10">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Panel administrasi</p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                Kelola pengguna, konten, dan aktivitas platform PSD.
              </p>
              <Link
                href="/admin/users"
                className="mt-3 inline-block text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Kelola pengguna →
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
