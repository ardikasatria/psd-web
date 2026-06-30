'use client'

import ButtonPrimary from '@/shared/ButtonPrimary'
import {
  BeakerIcon,
  BookOpenIcon,
  ChartBarIcon,
  CloudArrowUpIcon,
  CubeIcon,
  CpuChipIcon,
  FolderIcon,
  LightBulbIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { TEAM_ASSET_KINDS } from '@/lib/teams/permissions'

const ASSET_LINKS: {
  kind: (typeof TEAM_ASSET_KINDS)[number]
  href: (id: string) => string
  label: string
  icon: typeof FolderIcon
}[] = [
  { kind: 'project', href: (id) => `/projects/new?team_id=${id}`, label: 'Proyek', icon: FolderIcon },
  { kind: 'dataset', href: (id) => `/datasets/new?team_id=${id}`, label: 'Dataset', icon: CubeIcon },
  { kind: 'model', href: (id) => `/models/new?team_id=${id}`, label: 'Model', icon: BeakerIcon },
  { kind: 'notebook', href: (id) => `/notebooks/new?team_id=${id}`, label: 'Notebook', icon: BookOpenIcon },
  { kind: 'idea_space', href: (id) => `/rooms/new?team_id=${id}`, label: 'Ruang ide', icon: LightBulbIcon },
  { kind: 'data_factory', href: (id) => `/factory/sources/new?team_id=${id}`, label: 'Pabrik data', icon: CloudArrowUpIcon },
  { kind: 'transformer_space', href: (id) => `/factory/pipelines/new?team_id=${id}`, label: 'Ruang transformer', icon: WrenchScrewdriverIcon },
  { kind: 'model_registry', href: (id) => `/mlops/registry/new?team_id=${id}`, label: 'Registry model', icon: CpuChipIcon },
  { kind: 'synthetic_data', href: (id) => `/synthesis/new?team_id=${id}`, label: 'Data sintesis', icon: SparklesIcon },
  { kind: 'analytics_space', href: (id) => `/dashboards/new?team_id=${id}`, label: 'Ruang analitik', icon: ChartBarIcon },
]

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
