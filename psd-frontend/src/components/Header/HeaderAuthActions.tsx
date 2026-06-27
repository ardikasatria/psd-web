'use client'

import { useLogout } from '@/lib/auth/useLogout'
import { useAuth } from '@/lib/auth/useAuth'
import { isStaff } from '@/lib/auth/roles'
import { profilePath } from '@/lib/routes/profile'
import Avatar from '@/shared/Avatar'
import { Button } from '@/shared/Button'
import { Dropdown, DropdownButton, DropdownDivider, DropdownItem, DropdownMenu } from '@/shared/dropdown'
import clsx from 'clsx'

interface Props {
  className?: string
}

export default function HeaderAuthActions({ className }: Props) {
  const handleLogout = useLogout()
  const { user, isLoggedIn, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className={clsx('flex shrink-0 items-center gap-2', className)} aria-busy="true" aria-label="Memuat status masuk">
        <span className="inline-flex h-10 w-[4.75rem] animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <span className="inline-flex h-10 w-[4.75rem] animate-pulse rounded-full bg-neutral-300 dark:bg-neutral-600" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className={clsx('flex shrink-0 items-center gap-2', className)}>
        <Button href="/login" outline className="h-10 !px-4">
          Masuk
        </Button>
        <Button href="/register" color="dark/neutral" className="h-10 !px-4">
          Daftar
        </Button>
      </div>
    )
  }

  return (
    <Dropdown>
      <DropdownButton
        as="button"
        className={clsx('rounded-full focus:outline-hidden', className)}
        aria-label="Menu akun"
      >
        {user ? (
          <Avatar
            src={user.avatar_url ?? undefined}
            alt={user.name}
            className="size-10"
            width={40}
            height={40}
            sizes="40px"
          />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
            ···
          </span>
        )}
      </DropdownButton>
      <DropdownMenu anchor="bottom end">
        {user && (
          <DropdownItem
            href={profilePath(user.username)}
            className="!cursor-pointer rounded-none border-b border-neutral-100 !px-3 !py-2.5 dark:border-neutral-700"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</p>
              <p className="truncate text-xs text-neutral-500">@{user.username}</p>
            </div>
          </DropdownItem>
        )}
        <DropdownItem href="/dashboard">Dasbor</DropdownItem>
        {isStaff(user) && <DropdownItem href="/admin">Admin</DropdownItem>}
        <DropdownItem href="/settings">Pengaturan</DropdownItem>
        <DropdownDivider />
        <DropdownItem onClick={handleLogout}>Keluar</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
