'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  BeakerIcon,
  BookOpenIcon,
  CubeIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'

const ASSET_LINKS = [
  { href: (id: string) => `/projects/new?team_id=${id}`, label: 'Proyek', icon: FolderIcon },
  { href: (id: string) => `/datasets/new?team_id=${id}`, label: 'Dataset', icon: CubeIcon },
  { href: (id: string) => `/models/new?team_id=${id}`, label: 'Model', icon: BeakerIcon },
  { href: (id: string) => `/notebooks/new?team_id=${id}`, label: 'Notebook', icon: BookOpenIcon },
] as const

export function TeamCreateAssetsPanel({
  teamId,
  teamName,
}: {
  teamId: string
  teamName: string
}) {
  if (!teamId) return null

  return (
    <section className="rounded-2xl border border-primary-200/80 bg-gradient-to-br from-primary-50/80 via-white to-white p-5 dark:border-primary-800/50 dark:from-primary-950/30 dark:via-neutral-900 dark:to-neutral-900">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Tambah aset untuk {teamName}
      </h3>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Semua anggota tim dapat mengedit aset yang dibuat di bawah tim ini.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {ASSET_LINKS.map(({ href, label, icon: Icon }) => (
          <ButtonPrimary key={label} href={href(teamId)} outline className="!gap-2">
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </ButtonPrimary>
        ))}
      </div>
    </section>
  )
}
