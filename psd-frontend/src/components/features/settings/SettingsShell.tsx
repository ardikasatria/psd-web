'use client'

import { useLogout } from '@/lib/auth/useLogout'
import clsx from 'clsx'
import {
  BellIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'

export type SettingsSection =
  | 'overview'
  | 'profile'
  | 'security'
  | 'notifications'
  | 'privacy'
  | 'appearance'
  | 'member-card'

type NavItem = {
  id: SettingsSection
  href: string
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    href: '/settings',
    label: 'Ringkasan',
    description: 'Ikhtisar akun Anda',
    icon: Cog6ToothIcon,
  },
  {
    id: 'profile',
    href: '/settings/profile',
    label: 'Personalisasi profil',
    description: 'Banner, accent, status, links',
    icon: SparklesIcon,
  },
  {
    id: 'security',
    href: '/settings/security',
    label: 'Keamanan akun',
    description: 'Kata sandi, email, verifikasi',
    icon: ShieldCheckIcon,
  },
  {
    id: 'notifications',
    href: '/settings/notifications',
    label: 'Notifikasi',
    description: 'Email & pemberitahuan dalam aplikasi',
    icon: BellIcon,
  },
  {
    id: 'privacy',
    href: '/settings/privacy',
    label: 'Privasi',
    description: 'Visibilitas profil & penemuan',
    icon: UserCircleIcon,
  },
  {
    id: 'member-card',
    href: '/settings/member-card',
    label: 'Kartu member',
    description: 'Kartu loyalitas & QR profil',
    icon: CreditCardIcon,
  },
  {
    id: 'appearance',
    href: '/settings/appearance',
    label: 'Tampilan',
    description: 'Tema, bahasa, animasi',
    icon: PaintBrushIcon,
  },
]

function NavLink({
  item,
  active,
  compact,
}: {
  item: NavItem
  active: boolean
  compact?: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={clsx(
        'group flex items-center gap-3 rounded-2xl border transition-all duration-200 motion-safe:transition-colors',
        compact ? 'p-3' : 'p-4',
        active
          ? 'border-primary-300 bg-primary-50 shadow-sm dark:border-primary-700 dark:bg-primary-950/40'
          : 'border-neutral-200/80 bg-white hover:border-primary-200 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-800 dark:hover:bg-neutral-800/80'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <span
        className={clsx(
          'flex shrink-0 items-center justify-center rounded-xl',
          compact ? 'size-10' : 'size-11',
          active
            ? 'bg-primary-600 text-white'
            : 'bg-neutral-100 text-neutral-600 group-hover:bg-primary-100 group-hover:text-primary-700 dark:bg-neutral-700 dark:text-neutral-300 dark:group-hover:bg-primary-900/50 dark:group-hover:text-primary-300'
        )}
      >
        <Icon className={compact ? 'size-5' : 'size-5'} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-neutral-900 dark:text-neutral-100">{item.label}</span>
        {!compact && (
          <span className="mt-0.5 block text-sm text-neutral-500 dark:text-neutral-400">{item.description}</span>
        )}
      </span>
      <ChevronRightIcon
        className={clsx(
          'size-4 shrink-0 text-neutral-400 motion-safe:transition-transform group-hover:translate-x-0.5',
          active && 'text-primary-600 dark:text-primary-400'
        )}
        aria-hidden
      />
    </Link>
  )
}

export function SettingsNav({ active }: { active: SettingsSection }) {
  const handleLogout = useLogout()

  return (
    <nav className="space-y-6" aria-label="Navigasi pengaturan">
      {/* Mobile: grid 2 kolom, label singkat */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.id} item={item} active={active === item.id} compact />
        ))}
      </div>

      {/* Desktop: sidebar vertikal penuh */}
      <div className="hidden space-y-2 lg:block">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Pengaturan
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.id} item={item} active={active === item.id} />
        ))}
      </div>

      <div className="space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <Squares2X2Icon className="size-5 shrink-0" aria-hidden />
          Kembali ke dashboard
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          Keluar
        </button>
      </div>
    </nav>
  )
}

interface SettingsShellProps {
  active: SettingsSection
  children: ReactNode
}

export function SettingsShell({ active, children }: SettingsShellProps) {
  return (
    <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-10">
      <aside className="mb-8 lg:col-span-4 lg:mb-0 xl:col-span-3">
        <div className="lg:sticky lg:top-24">
          <SettingsNav active={active} />
        </div>
      </aside>
      <div className="min-w-0 lg:col-span-8 xl:col-span-9">{children}</div>
    </div>
  )
}
