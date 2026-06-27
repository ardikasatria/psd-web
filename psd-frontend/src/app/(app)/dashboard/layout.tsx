import { DashboardLayout } from '@/components/layout/dashboard/DashboardLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
