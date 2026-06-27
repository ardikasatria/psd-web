import { ApplicationLayout } from '@/app/(app)/application-layout'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const Layout: React.FC<Props> = ({ children }) => {
  return <ApplicationLayout>{children}</ApplicationLayout>
}

export default Layout
