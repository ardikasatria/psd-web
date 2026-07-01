export const MORE_MENU_ID = 'nav-more-menu'

export async function getNavigation(): Promise<TNavigationItem[]> {
  return [
    { id: '2', href: '/explore', name: 'Explore' },
    { id: '2a', href: '/projects', name: 'Proyek' },
    { id: '3', href: '/datasets', name: 'Dataset' },
    {
      id: MORE_MENU_ID,
      name: 'Menu',
      type: 'mega-menu',
      children: [
        {
          id: 'col-aset',
          name: 'Aset',
          children: [
            { id: '3a', href: '/models', name: 'Model' },
            { id: '4', href: '/notebooks', name: 'Notebook' },
            { id: '5', href: '/competitions', name: 'Kompetisi' },
            { id: '2b', href: '/categories', name: 'Kategori' },
            { id: '5e', href: '/ml', name: 'Registry Model' },
            { id: '3b', href: '/synthesis', name: 'Data Sintesis' },
            { id: '5c', href: '/factory/pipelines', name: 'Pabrik Data' },
            { id: '5d', href: '/analytics', name: 'Ruang Analitik' },
            { id: '5a', href: '/idea-rooms', name: 'Ruang Ide' },
            { id: '5b', href: '/transformer', name: 'Ruang Transformer' },
          ],
        },
        {
          id: 'col-komunitas',
          name: 'Komunitas',
          children: [
            { id: '2c', href: '/quests', name: 'Quest', authRequired: true },
            { id: '8', href: '/community', name: 'Feed' },
            { id: '9', href: '/forum', name: 'Forum' },
            { id: '9a', href: '/teams', name: 'Tim Kolaborasi' },
            { id: '10', href: '/leaderboard', name: 'Peringkat' },
            { id: '6', href: '/events', name: 'Event' },
            { id: '7', href: '/learn', name: 'Belajar' },
          ],
        },
      ],
    },
  ]
}

export async function getNavMegaMenu(): Promise<TNavigationItem> {
  const navigation = await getNavigation()
  return navigation.find((item) => item.type === 'mega-menu') || {}
}

export type TNavigationItem = Partial<{
  id: string
  href: string
  name: string
  iconHref: string
  type?: 'dropdown' | 'mega-menu' | 'hamburger-menu'
  /** Hanya tampil setelah login (mis. Quest pribadi). */
  authRequired?: boolean
  isNew?: boolean
  children?: TNavigationItem[]
}>

/** Sembunyikan item `authRequired` bila pengguna belum login. */
export function filterNavigationByAuth(items: TNavigationItem[], isLoggedIn: boolean): TNavigationItem[] {
  return items
    .filter((item) => !item.authRequired || isLoggedIn)
    .map((item) =>
      item.children?.length
        ? { ...item, children: filterNavigationByAuth(item.children, isLoggedIn) }
        : item,
    )
}

export const getLanguages = async () => [
  { id: 'Indonesian', name: 'Bahasa Indonesia', description: 'Indonesia', href: '#', active: true },
]

export const getCurrencies = async () => [
  { id: 'IDR', name: 'IDR', href: '#', icon: '', active: true },
]

export const getHeaderDropdownCategories = async () => []
