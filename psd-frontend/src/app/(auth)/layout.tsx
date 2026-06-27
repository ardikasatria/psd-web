import Aside from '@/components/aside'
import AsideSidebarNavigation from '@/components/aside-sidebar-navigation'
import { PSD_AUTH_GRADIENT } from '@/components/features/auth/AuthPageShell'
import Header2 from '@/components/Header/Header2'
import { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Aside.Provider>
      <div className="flex min-h-screen flex-col">
        <Header2 bottomBorder />
        <main className="flex flex-1 flex-col" style={{ background: PSD_AUTH_GRADIENT }}>
          {children}
        </main>
        <AsideSidebarNavigation />
      </div>
    </Aside.Provider>
  )
}
