import '@/styles/tailwind.css'
import { AppProviders } from '@/components/providers/AppProviders'
import { getSiteUrl } from '@/lib/site'
import { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import ThemeProvider from './theme-provider'

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Projek Sains Data'

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    template: `%s - ${appName}`,
    default: appName,
  },
  description: 'Platform sains data kolaboratif lokal Indonesia',
  keywords: ['sains data', 'machine learning', 'UMKM', 'Indonesia'],
}

const themeInitScript = `(function(){try{var t=localStorage.getItem('psd-theme');if(!t){var l=localStorage.getItem('theme');t=l==='dark-mode'?'dark':l==='light-mode'?'light':'system'}var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={beVietnamPro.className} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-white text-base text-neutral-900 dark:bg-neutral-900 dark:text-neutral-200">
        <ThemeProvider>
          <AppProviders>
            <div>{children}</div>
          </AppProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}
