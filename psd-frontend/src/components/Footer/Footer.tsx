import { CustomLink } from '@/data/types'
import Logo from '@/shared/Logo'
import SocialsList1 from '@/shared/SocialsList1'
import Link from 'next/link'
import React from 'react'

export interface WidgetFooterMenu {
  id: string
  title: string
  menus: CustomLink[]
}

const widgetMenus: WidgetFooterMenu[] = [
  {
    id: 'help',
    title: 'Bantuan',
    menus: [
      { href: '/help', label: 'Pusat bantuan' },
      { href: '/help/panduan-memulai', label: 'Panduan memulai' },
      { href: '/help/git-menyiapkan-akses', label: 'Git push' },
      { href: '/help/notebook-membuka', label: 'Notebook JupyterHub' },
      { href: '/help/faq', label: 'FAQ' },
      { href: '/about', label: 'Tentang Kami' },
    ],
  },
  {
    id: 'explore',
    title: 'Jelajahi',
    menus: [
      { href: '/explore', label: 'Explore' },
      { href: '/projects', label: 'Proyek' },
      { href: '/datasets', label: 'Dataset' },
      { href: '/models', label: 'Model' },
      { href: '/competitions', label: 'Kompetisi' },
    ],
  },
  {
    id: 'learn',
    title: 'Belajar',
    menus: [
      { href: '/learn', label: 'Kursus' },
      { href: '/learn/paths', label: 'Learning path' },
      { href: '/events', label: 'Event' },
      { href: '/forum', label: 'Forum' },
      { href: '/community', label: 'Feed' },
      { href: '/blog', label: 'Berita' },
    ],
  },
  {
    id: 'legal',
    title: 'Legal',
    menus: [
      { href: '/legal/ketentuan-layanan', label: 'Ketentuan Layanan' },
      { href: '/legal/kebijakan-privasi', label: 'Kebijakan Privasi' },
      { href: '/help/pedoman-komunitas', label: 'Pedoman komunitas' },
    ],
  },
]

const Footer: React.FC = () => {
  const renderWidgetMenuItem = (menu: WidgetFooterMenu, index: number) => {
    return (
      <div key={index} className="text-sm">
        <h2 className="font-semibold text-neutral-700 dark:text-neutral-200">{menu.title}</h2>
        <ul className="mt-5 space-y-4">
          {menu.menus.map((item, index) => (
            <li key={index}>
              <Link
                href={item.href}
                className="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-400"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="nc-Footer relative border-t border-neutral-200 py-16 lg:py-28 dark:border-neutral-700">
      <div className="container grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-10">
        <div className="col-span-2 grid grid-cols-4 gap-5 md:col-span-4 lg:flex lg:flex-col lg:md:col-span-1">
          <div className="col-span-2 md:col-span-1">
            <Logo size="size-10" />
            <p className="mt-3 max-w-xs text-sm text-neutral-600 dark:text-neutral-400">
              Platform kolaboratif sains data untuk Indonesia.
            </p>
          </div>
          <div className="col-span-2 flex items-center md:col-span-3">
            <SocialsList1 />
          </div>
        </div>
        {widgetMenus.map(renderWidgetMenuItem)}
      </div>
    </div>
  )
}

export default Footer
