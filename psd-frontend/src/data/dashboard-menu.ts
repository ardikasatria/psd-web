import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  CubeIcon,
  HomeIcon,
  LifebuoyIcon,
  ShieldCheckIcon,
  TrophyIcon,
  BoltIcon,
  CalendarDaysIcon,
  BeakerIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

import type { ComponentType, SVGProps } from 'react'

export type DashboardMenuItem = {
  name: string
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export type DashboardMenuSection = {
  label: string
  items: DashboardMenuItem[]
}

export const dashboardMenuSections: DashboardMenuSection[] = [
  {
    label: 'Ringkasan',
    items: [{ name: 'Dasbor', href: '/dashboard', icon: ChartBarIcon }],
  },
  {
    label: 'Aset saya',
    items: [
      { name: 'Proyek saya', href: '/dashboard/projects', icon: CubeIcon },
      { name: 'Dataset saya', href: '/dashboard/datasets', icon: CircleStackIcon },
      { name: 'Model saya', href: '/dashboard/models', icon: CpuChipIcon },
      { name: 'Notebook saya', href: '/dashboard/notebooks', icon: BeakerIcon },
    ],
  },
  {
    label: 'Aktivitas',
    items: [
      { name: 'Kompetisi saya', href: '/dashboard/competitions', icon: TrophyIcon },
      { name: 'Event saya', href: '/dashboard/events', icon: CalendarDaysIcon },
      { name: 'Belajar saya', href: '/dashboard/learning', icon: AcademicCapIcon },
      { name: 'Diskusi saya', href: '/dashboard/community', icon: ChatBubbleLeftRightIcon },
    ],
  },
  {
    label: 'Akun',
    items: [
      { name: 'Minat saya', href: '/me/interests', icon: SparklesIcon },
      { name: 'Streak belajar', href: '/me/streak', icon: BoltIcon },
      { name: 'Bantuan & pengaduan', href: '/dashboard/support', icon: LifebuoyIcon },
      { name: 'Pengaturan', href: '/settings', icon: Cog6ToothIcon },
    ],
  },
]

/** Semua item menu (flat) — untuk judul top bar */
export const dashboardMenuItems: DashboardMenuItem[] = dashboardMenuSections.flatMap((s) => s.items)

export const dashboardExternalLinks: DashboardMenuItem[] = [
  { name: 'Beranda publik', href: '/', icon: HomeIcon },
  { name: 'Explore', href: '/explore', icon: BookOpenIcon },
]

export function getUserDashboardLink(): DashboardMenuItem {
  return { name: 'Dasbor pengguna', href: '/dashboard', icon: ChartBarIcon }
}

export function getStaffPanelLink(role?: string): DashboardMenuItem | null {
  if (role === 'superadmin') {
    return { name: 'Panel Admin', href: '/admin', icon: ShieldCheckIcon }
  }
  if (role === 'moderator') {
    return { name: 'Panel Humas', href: '/admin', icon: ShieldCheckIcon }
  }
  return null
}

export function dashboardTitleForPath(pathname: string): string {
  if (pathname === '/dashboard') return 'Dasbor'
  const match = dashboardMenuItems.find(
    (item) => item.href !== '/dashboard' && pathname.startsWith(item.href),
  )
  return match?.name ?? 'Dasbor'
}
