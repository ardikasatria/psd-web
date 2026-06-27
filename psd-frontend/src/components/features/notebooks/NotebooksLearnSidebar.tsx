'use client'

import { SidebarStatTile, sidebarCalloutClass, sidebarSectionClass, sidebarTipClass } from '@/components/common/SidebarStatTile'
import { getNotebooks } from '@/lib/api/notebooks'
import { useAuth } from '@/lib/auth/useAuth'
import { useMe } from '@/lib/api/dashboard'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BeakerIcon,
  BookOpenIcon,
  CodeBracketSquareIcon,
  LightBulbIcon,
  PlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const NOTEBOOK_TIPS = [
  'Notebook di PSD adalah referensi terbuka — fork di Colab, jalankan sel per sel, dan catat insight di komentar sel.',
  'URL GitHub .ipynb otomatis mendapat tombol Colab — format: github.com/owner/repo/blob/branch/path.ipynb',
  'Setelah eksperimen, bagikan notebook Anda ke katalog agar tim dan komunitas belajar dari workflow Anda.',
  'Gabungkan notebook dengan dataset sintesis untuk latihan pipeline end-to-end tanpa data sensitif.',
]

type Props = {
  className?: string
  onScrollToCatalog?: () => void
}

export function NotebooksLearnSidebar({ className, onScrollToCatalog }: Props) {
  const { isLoggedIn } = useAuth()
  const me = useMe()
  const tip = NOTEBOOK_TIPS[new Date().getDate() % NOTEBOOK_TIPS.length]

  const catalog = useQuery({
    queryKey: ['notebooks', 'sidebar'],
    queryFn: () => getNotebooks(),
    staleTime: 60_000,
  })

  const items = catalog.data?.items ?? []
  const colabReady = items.filter((n) => n.has_colab)
  const tags = new Set(items.flatMap((n) => n.tags))

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile label="Notebook" value={items.length} icon={<BookOpenIcon className="size-4" />} />
        <SidebarStatTile label="Siap Colab" value={colabReady.length} icon={<CodeBracketSquareIcon className="size-4" />} accent="sky" />
        <SidebarStatTile label="Topik" value={tags.size} icon={<BeakerIcon className="size-4" />} accent="indigo" />
        <SidebarStatTile label="Resmi PSD" value={items.filter((n) => n.owner.is_official).length} icon={<SparklesIcon className="size-4" />} />
      </div>

      {colabReady.length > 0 && (
        <section className={sidebarCalloutClass}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <CodeBracketSquareIcon className="size-4 text-sky-600 dark:text-sky-400" />
            Buka di Colab
          </h3>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">Notebook dengan sumber GitHub — latihan langsung di browser.</p>
          <ul className="mt-3 space-y-2">
            {colabReady.slice(0, 2).map((nb) => (
              <li key={nb.id}>
                <Link href={`/notebooks/${nb.id}`} className="line-clamp-2 text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400">
                  {nb.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={sidebarSectionClass}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <AcademicCapIcon className="size-4 text-primary-500" />
          Jalur belajar
        </h3>
        <ol className="mt-3 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">1</span>
            Jelajahi katalog referensi
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">2</span>
            Buka & fork di Colab
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">3</span>
            Modifikasi & eksperimen
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">4</span>
            Bagikan notebook Anda
          </li>
        </ol>
        {onScrollToCatalog && (
          <button
            type="button"
            onClick={onScrollToCatalog}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Lihat katalog
            <ArrowRightIcon className="size-3.5" aria-hidden />
          </button>
        )}
      </section>

      <section className={sidebarSectionClass}>
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Hubungkan praktik</h3>
        <nav className="mt-2 space-y-1">
          <Link href="/learn" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300">
            <AcademicCapIcon className="size-4" />
            Kursus belajar
          </Link>
          <Link href="/synthesis" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300">
            <SparklesIcon className="size-4" />
            Data sintesis
          </Link>
          <Link href="/competitions" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300">
            <BeakerIcon className="size-4" />
            Kompetisi
          </Link>
          <Link href="/idea-rooms" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300">
            <LightBulbIcon className="size-4" />
            Ruang Ide
          </Link>
        </nav>
      </section>

      <section className={sidebarTipClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Tips praktik
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{tip}</p>
      </section>

      {isLoggedIn && me.data?.user ? (
        <Link
          href="/notebooks/new"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <PlusIcon className="size-4" aria-hidden />
          Bagikan notebook
        </Link>
      ) : (
        <Link
          href="/login?next=/notebooks"
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Masuk untuk berbagi
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      )}
    </aside>
  )
}
