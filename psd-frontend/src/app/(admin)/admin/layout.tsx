'use client'

import { AdminPageSkeleton } from '@/components/admin/AdminShared'
import { AdminShell } from '@/components/admin/AdminShell'
import { useAdminGuard } from '@/lib/auth/useAdminGuard'
import { isStaff } from '@/lib/auth/roles'
import { usePathname } from 'next/navigation'

function isBlogEditorRoute(pathname: string) {
  return pathname === '/admin/blog/new' || /^\/admin\/blog\/[^/]+\/edit$/.test(pathname)
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading } = useAdminGuard()
  const editorMode = isBlogEditorRoute(pathname)

  if (editorMode) {
    if (isLoading || !user) return null
    if (!isStaff(user)) return null
    return <>{children}</>
  }

  if (isLoading || !user) {
    return (
      <AdminShell>
        <AdminPageSkeleton />
      </AdminShell>
    )
  }

  if (!isStaff(user)) {
    return null
  }

  return <AdminShell>{children}</AdminShell>
}
