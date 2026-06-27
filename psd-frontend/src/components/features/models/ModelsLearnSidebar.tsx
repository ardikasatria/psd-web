'use client'

import { SidebarStatTile, sidebarCalloutClass, sidebarSectionClass, sidebarTipClass } from '@/components/common/SidebarStatTile'
import { getRepos } from '@/lib/api/repos'
import { useAuth } from '@/lib/auth/useAuth'
import { useMe } from '@/lib/api/dashboard'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BeakerIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  CubeIcon,
  LightBulbIcon,
  PlusIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const MODEL_TIPS = [
  'Sebelum fork model, bandingkan metrik pada dataset yang sama — PSD menampilkan preview akurasi/F1/MAPE di kartu.',
  'Model featured biasanya sudah divalidasi komunitas — cocok sebagai baseline kompetisi atau Ruang Ide.',
  'Gabungkan model dengan notebook referensi untuk melihat pipeline training lengkap dari data ke artefak.',
  'Untuk deploy produksi, periksa ukuran file dan framework di tag — FastText & CNN ringan lebih cocok edge.',
]

type Props = {
  className?: string
  onScrollToCatalog?: () => void
}

export function ModelsLearnSidebar({ className, onScrollToCatalog }: Props) {
  const { isLoggedIn } = useAuth()
  const me = useMe()
  const tip = MODEL_TIPS[new Date().getDate() % MODEL_TIPS.length]

  const catalog = useQuery({
    queryKey: ['models', 'sidebar'],
    queryFn: () => getRepos('model'),
    staleTime: 60_000,
  })

  const items = catalog.data?.items ?? []
  const featured = items.filter((m) => m.featured)
  const withMetrics = items.filter((m) => m.metrics_preview && Object.keys(m.metrics_preview).length > 0)
  const topDownloads = [...items].sort((a, b) => b.downloads - a.downloads).slice(0, 2)

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile label="Model" value={items.length} icon={<BeakerIcon className="size-4" />} accent="violet" />
        <SidebarStatTile label="Featured" value={featured.length} icon={<SparklesIcon className="size-4" />} />
        <SidebarStatTile label="Dengan metrik" value={withMetrics.length} icon={<ChartBarIcon className="size-4" />} accent="indigo" />
        <SidebarStatTile label="Resmi PSD" value={items.filter((m) => m.owner.is_official).length} icon={<CloudArrowUpIcon className="size-4" />} accent="sky" />
      </div>

      {topDownloads.length > 0 && (
        <section className={sidebarCalloutClass}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <ChartBarIcon className="size-4 text-violet-600 dark:text-violet-400" />
            Paling banyak diunduh
          </h3>
          <ul className="mt-3 space-y-2">
            {topDownloads.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/models/${m.owner.username}/${m.name}`}
                  className="line-clamp-2 text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {m.name}
                </Link>
                <p className="text-xs text-neutral-500">{m.downloads.toLocaleString('id-ID')} unduhan</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={sidebarSectionClass}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <AcademicCapIcon className="size-4 text-primary-500" />
          Jalur model
        </h3>
        <ol className="mt-3 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
              1
            </span>
            Jelajahi katalog baseline
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              2
            </span>
            Bandingkan metrik evaluasi
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              3
            </span>
            Fork, fine-tune, deploy
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
              4
            </span>
            Publikasikan model Anda
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
            href="/datasets"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <CubeIcon className="size-4" />
            Dataset
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
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Tips model
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">{tip}</p>
      </section>

      {isLoggedIn && me.data?.user ? (
        <Link
          href="/models/new"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <PlusIcon className="size-4" aria-hidden />
          Publikasikan model
        </Link>
      ) : (
        <Link
          href="/login?next=/models"
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Masuk untuk publikasi
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      )}
    </aside>
  )
}
