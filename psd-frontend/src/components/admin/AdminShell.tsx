'use client'

import { AdminSidebar } from '@/components/layout/admin/AdminSidebar'
import { DashboardTopBar } from '@/components/layout/dashboard/DashboardTopBar'
import { getAdminPageTitle } from '@/data/admin-menu'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const title = getAdminPageTitle(pathname)

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-neutral-50 dark:bg-neutral-950">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 lg:pl-64">
        <DashboardTopBar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 overflow-x-auto p-4 sm:p-6 lg:p-8 [-webkit-overflow-scrolling:touch]">{children}</main>
      </div>
    </div>
  )
}
