import {
  MegaphoneIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import {
  AcademicCapIcon,
  BoltIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CubeIcon,
  DocumentTextIcon,
  HomeIcon,
  MapIcon,
  SparklesIcon,
  TagIcon,
  TrophyIcon,
  CalendarDaysIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'

export type AdminMenuItem = {
  name: string
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const adminMenuItems: AdminMenuItem[] = [
  { name: 'Ringkasan', href: '/admin', icon: ChartBarIcon },
  { name: 'Pengguna', href: '/admin/users', icon: UsersIcon },
  { name: 'Aset', href: '/admin/repos', icon: CubeIcon },
  { name: 'Kategori', href: '/admin/categories', icon: TagIcon },
  { name: 'Quest', href: '/admin/quests', icon: SparklesIcon },
  { name: 'Micro-lesson', href: '/admin/micro', icon: BoltIcon },
  { name: 'Kompetisi', href: '/admin/competitions', icon: TrophyIcon },
  { name: 'Pengajuan kompetisi', href: '/admin/competitions/proposals', icon: TrophyIcon },
  { name: 'Event', href: '/admin/events', icon: CalendarDaysIcon },
  { name: 'Pengajuan event', href: '/admin/events/proposals', icon: CalendarDaysIcon },
  { name: 'Pengumuman', href: '/admin/announcements', icon: MegaphoneIcon },
  { name: 'Blog', href: '/admin/blog', icon: DocumentTextIcon },
  { name: 'Course', href: '/admin/courses', icon: AcademicCapIcon },
  { name: 'Tinjauan Course', href: '/admin/courses/review', icon: AcademicCapIcon },
  { name: 'Instruktur', href: '/admin/instructors', icon: UsersIcon },
  { name: 'Jalur Belajar', href: '/admin/learning-paths', icon: MapIcon },
  { name: 'Forum', href: '/admin/forum', icon: ChatBubbleLeftRightIcon },
]

export const adminExternalLinks: AdminMenuItem[] = [
  { name: 'Beranda publik', href: '/', icon: HomeIcon },
]

export function getUserDashboardLink(): AdminMenuItem {
  return { name: 'Dasbor pengguna', href: '/dashboard', icon: ChartBarIcon }
}

export const SUPERADMIN_ONLY_HREFS = ['/admin/users']

export function getAdminMenuForRole(role?: string) {
  const superadmin = role === 'superadmin'
  return adminMenuItems.filter(
    (item) => superadmin || !SUPERADMIN_ONLY_HREFS.some((h) => item.href.startsWith(h))
  )
}

export function getStaffPanelLink(role?: string): AdminMenuItem | null {
  if (role === 'superadmin') {
    return { name: 'Panel Admin', href: '/admin', icon: ShieldCheckIcon }
  }
  if (role === 'moderator') {
    return { name: 'Panel Humas', href: '/admin', icon: ShieldCheckIcon }
  }
  return null
}
export function getAdminPageTitle(pathname: string): string {
  if (pathname === '/admin') return 'Panel Admin'
  const match = adminMenuItems.find(
    (item) => item.href !== '/admin' && pathname.startsWith(item.href)
  )
  return match?.name ?? 'Panel Admin'
}
