'use client'

import { DashboardSidebar } from '@/components/layout/dashboard/DashboardSidebar'
import { DashboardTopBar } from '@/components/layout/dashboard/DashboardTopBar'
import { AssistantShell } from '@/components/features/assistant/AssistantShell'
import { AnnouncementBanner } from '@/components/common/AnnouncementBanner'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import { useState } from 'react'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  useAuthGuard()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-neutral-50 dark:bg-neutral-950">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 lg:pl-64">
        <DashboardTopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 overflow-x-auto p-4 sm:p-6 lg:p-8 [-webkit-overflow-scrolling:touch]">
          <AnnouncementBanner className="mb-6" />
          {children}
        </main>
      </div>
      <AssistantShell />
    </div>
  )
}
