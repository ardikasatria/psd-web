'use client'

import { AdminContentCard, AdminPageHeader, AdminPageSkeleton } from '@/components/admin/AdminShared'
import { StatCard } from '@/components/dashboard/StatCard'
import { getMe } from '@/lib/api/auth'
import { getStats } from '@/lib/api/admin'
import Skeleton from '@/components/Skeleton'
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CubeIcon,
  TrophyIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'

export default function AdminHomePage() {
  const me = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false })
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: getStats })

  if (stats.isLoading) return <AdminPageSkeleton />

  const greeting = me.data?.user.name

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-2">
        {me.isLoading ? (
          <Skeleton className="h-9 w-72 rounded-lg" />
        ) : (
          <h2 className="text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-100">
            Selamat datang{greeting ? `, ${greeting}` : ''}
          </h2>
        )}
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Ringkasan platform Projek Sains Data — kelola pengguna, konten, dan aktivitas.
        </p>
      </section>

      <AdminPageHeader title="Statistik platform" description="Jumlah entitas terdaftar di sistem." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Pengguna" value={stats.data?.users ?? 0} href="/admin/users" icon={<UsersIcon className="size-5" />} />
        <StatCard label="Aset" value={stats.data?.repos ?? 0} href="/admin/repos" icon={<CubeIcon className="size-5" />} />
        <StatCard
          label="Kompetisi"
          value={stats.data?.competitions ?? 0}
          href="/admin/competitions"
          icon={<TrophyIcon className="size-5" />}
        />
        <StatCard label="Event" value={stats.data?.events ?? 0} href="/admin/events" icon={<CalendarDaysIcon className="size-5" />} />
        <StatCard
          label="Course"
          value={stats.data?.courses ?? 0}
          href="/admin/courses"
          icon={<AcademicCapIcon className="size-5" />}
        />
        <StatCard
          label="Utas forum"
          value={stats.data?.threads ?? 0}
          href="/admin/forum"
          icon={<ChatBubbleLeftRightIcon className="size-5" />}
        />
      </div>

      <AdminContentCard className="p-5 sm:p-6">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Aksi cepat</h3>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Langkah umum untuk administrasi harian.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Kelola pengguna', href: '/admin/users' },
            { label: 'Tinjau aset', href: '/admin/repos' },
            { label: 'Atur kompetisi', href: '/admin/competitions' },
            { label: 'Moderasi forum', href: '/admin/forum' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-xl border border-neutral-100 px-4 py-3 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
            >
              {item.label}
            </a>
          ))}
        </div>
      </AdminContentCard>
    </div>
  )
}
