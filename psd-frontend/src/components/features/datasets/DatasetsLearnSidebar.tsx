'use client'

import { SidebarStatTile, sidebarCalloutClass, sidebarSectionClass, sidebarTipClass } from '@/components/common/SidebarStatTile'
import { getRepos } from '@/lib/api/repos'
import { useAuth } from '@/lib/auth/useAuth'
import { useMe } from '@/lib/api/dashboard'
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
  BeakerIcon,
  CubeIcon,
  LightBulbIcon,
  PlusIcon,
  SparklesIcon,
  TableCellsIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const DATASET_TIPS = [
  'Sebelum unduh, periksa preview baris/kolom dan format di kartu — hemat waktu saat memilih dataset yang cocok.',
  'Dataset sintesis dari Ruang Ide aman untuk kompetisi — tidak mengandung data sensitif asli UMKM.',
  'Gabungkan dataset dengan notebook referensi PSD untuk melihat pipeline EDA lengkap sebelum training.',
  'Dataset featured biasanya sudah divalidasi komunitas — cocok sebagai starting point proyek atau kompetisi.',
]

type Props = {
  className?: string
  onScrollToCatalog?: () => void
}

export function DatasetsLearnSidebar({ className, onScrollToCatalog }: Props) {
  const { isLoggedIn } = useAuth()
  const me = useMe()
  const tip = DATASET_TIPS[new Date().getDate() % DATASET_TIPS.length]

  const catalog = useQuery({
    queryKey: ['datasets', 'sidebar'],
    queryFn: () => getRepos('dataset'),
    staleTime: 60_000,
  })

  const items = catalog.data?.items ?? []
  const synthetic = items.filter((d) => d.synthetic)
  const featured = items.filter((d) => d.featured)
  const topDownloads = [...items].sort((a, b) => b.downloads - a.downloads).slice(0, 2)

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile label="Dataset" value={items.length} icon={<CubeIcon className="size-4" />} accent="sky" />
        <SidebarStatTile label="Featured" value={featured.length} icon={<SparklesIcon className="size-4" />} />
        <SidebarStatTile label="Sintesis" value={synthetic.length} icon={<BeakerIcon className="size-4" />} accent="indigo" />
        <SidebarStatTile label="Resmi PSD" value={items.filter((d) => d.owner.is_official).length} icon={<TableCellsIcon className="size-4" />} />
      </div>

      {synthetic.length > 0 && (
        <section className={sidebarCalloutClass}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <SparklesIcon className="size-4 text-amber-600 dark:text-amber-400" />
            Data sintesis
          </h3>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">Aman untuk kompetisi & latihan tanpa PII.</p>
          <ul className="mt-3 space-y-2">
            {synthetic.slice(0, 2).map((d) => (
              <li key={d.id}>
                <Link
                  href={`/datasets/${d.owner.username}/${d.name}`}
                  className="line-clamp-2 text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {topDownloads.length > 0 && (
        <section className={sidebarCalloutClass}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <ArrowDownTrayIcon className="size-4 text-sky-600 dark:text-sky-400" />
            Paling banyak diunduh
          </h3>
          <ul className="mt-3 space-y-2">
            {topDownloads.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/datasets/${d.owner.username}/${d.name}`}
                  className="line-clamp-2 text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {d.name}
                </Link>
                <p className="text-xs text-neutral-500">{d.downloads.toLocaleString('id-ID')} unduhan</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={sidebarSectionClass}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <AcademicCapIcon className="size-4 text-primary-500" />
          Jalur dataset
        </h3>
        <ol className="mt-3 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              1
            </span>
            Jelajahi katalog data
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              2
            </span>
            Unduh & eksplorasi (EDA)
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
              3
            </span>
            Latih model & kompetisi
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              4
            </span>
            Publikasikan dataset Anda
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
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Hubungkan ekosistem</h3>
        <nav className="mt-2 space-y-1">
          <Link
            href="/models"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <BeakerIcon className="size-4" />
            Model
          </Link>
          <Link
            href="/competitions"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <TrophyIcon className="size-4" />
            Kompetisi
          </Link>
          <Link
            href="/notebooks"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <SparklesIcon className="size-4" />
            Notebook
          </Link>
          <Link
            href="/synthesis"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <BeakerIcon className="size-4" />
            Data sintesis
          </Link>
          <Link
            href="/idea-rooms"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <LightBulbIcon className="size-4" />
            Ruang Ide
          </Link>
        </nav>
      </section>

      <section className={sidebarTipClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Tips dataset
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{tip}</p>
      </section>

      {isLoggedIn && me.data?.user ? (
        <Link
          href="/datasets/new"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <PlusIcon className="size-4" aria-hidden />
          Publikasikan dataset
        </Link>
      ) : (
        <Link
          href="/login?next=/datasets"
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Masuk untuk publikasi
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      )}
    </aside>
  )
}
