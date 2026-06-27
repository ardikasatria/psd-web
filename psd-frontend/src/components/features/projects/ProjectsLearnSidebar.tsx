'use client'

import { SidebarStatTile, sidebarCalloutClass, sidebarSectionClass, sidebarTipClass } from '@/components/common/SidebarStatTile'
import { getRepos } from '@/lib/api/repos'
import { useAuth } from '@/lib/auth/useAuth'
import { useMe } from '@/lib/api/dashboard'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BeakerIcon,
  CubeIcon,
  FolderIcon,
  LightBulbIcon,
  PlusIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Link from 'next/link'

const PROJECT_TIPS = [
  'Proyek PSD menggabungkan dataset, model, dan notebook — cek jumlah aset terhubung di kartu sebelum fork.',
  'Proyek dengan badge Demo biasanya punya dashboard atau API live — cocok untuk belajar integrasi end-to-end.',
  'Setelah kompetisi atau Ruang Ide, dokumentasikan solusi sebagai proyek agar tim dan komunitas bisa belajar.',
  'Stack teknologi di kartu proyek membantu menemukan referensi dengan tools yang Anda kuasai.',
]

type Props = {
  className?: string
  onScrollToCatalog?: () => void
}

export function ProjectsLearnSidebar({ className, onScrollToCatalog }: Props) {
  const { isLoggedIn } = useAuth()
  const me = useMe()
  const tip = PROJECT_TIPS[new Date().getDate() % PROJECT_TIPS.length]

  const catalog = useQuery({
    queryKey: ['projects', 'sidebar'],
    queryFn: () => getRepos('project'),
    staleTime: 60_000,
  })

  const items = catalog.data?.items ?? []
  const featured = items.filter((p) => p.featured)
  const withDemo = items.filter((p) => p.project_preview?.has_demo)
  const topLikes = [...items].sort((a, b) => b.likes - a.likes).slice(0, 2)

  return (
    <aside className={clsx('space-y-5', className)}>
      <div className="grid grid-cols-2 gap-2">
        <SidebarStatTile label="Proyek" value={items.length} icon={<FolderIcon className="size-4" />} />
        <SidebarStatTile label="Featured" value={featured.length} icon={<SparklesIcon className="size-4" />} accent="emerald" />
        <SidebarStatTile label="Ada demo" value={withDemo.length} icon={<PuzzlePieceIcon className="size-4" />} accent="indigo" />
        <SidebarStatTile label="Resmi PSD" value={items.filter((p) => p.owner.is_official).length} icon={<UsersIcon className="size-4" />} />
      </div>

      {withDemo.length > 0 && (
        <section className={sidebarCalloutClass}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <SparklesIcon className="size-4 text-emerald-600" />
            Proyek dengan demo
          </h3>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">Dashboard atau API live — belajar integrasi langsung.</p>
          <ul className="mt-3 space-y-2">
            {withDemo.slice(0, 2).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.owner.username}/${p.name}`}
                  className="line-clamp-2 text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {topLikes.length > 0 && (
        <section className={sidebarCalloutClass}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            <SparklesIcon className="size-4 text-primary-600 dark:text-primary-400" />
            Paling disukai
          </h3>
          <ul className="mt-3 space-y-2">
            {topLikes.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.owner.username}/${p.name}`}
                  className="line-clamp-2 text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {p.name}
                </Link>
                <p className="text-xs text-neutral-500">{p.likes} suka</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={sidebarSectionClass}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          <AcademicCapIcon className="size-4 text-primary-500" />
          Jalur proyek
        </h3>
        <ol className="mt-3 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
              1
            </span>
            Jelajahi referensi end-to-end
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              2
            </span>
            Fork & hubungkan aset
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
              3
            </span>
            Bangun demo / dashboard
          </li>
          <li className="flex gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              4
            </span>
            Publikasikan proyek Anda
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
            href="/models"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <BeakerIcon className="size-4" />
            Model
          </Link>
          <Link
            href="/idea-rooms"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <LightBulbIcon className="size-4" />
            Ruang Ide
          </Link>
          <Link
            href="/competitions"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <TrophyIcon className="size-4" />
            Kompetisi
          </Link>
          <Link
            href="/teams"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700/80 dark:hover:text-primary-300"
          >
            <UsersIcon className="size-4" />
            Tim
          </Link>
        </nav>
      </section>

      <section className={sidebarTipClass}>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-neutral-100">
          <SparklesIcon className="size-4" aria-hidden />
          Tips proyek
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">{tip}</p>
      </section>

      {isLoggedIn && me.data?.user ? (
        <Link
          href="/projects/new"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <PlusIcon className="size-4" aria-hidden />
          Publikasikan proyek
        </Link>
      ) : (
        <Link
          href="/login?next=/projects"
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Masuk untuk publikasi
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      )}
    </aside>
  )
}
