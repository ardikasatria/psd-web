'use client'

import { teamAssetHref } from '@/lib/teams/assetLinks'
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
  TrophyIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'

const ASSET_LINKS = [
  { kind: 'project', label: 'Proyek', icon: FolderIcon },
  { kind: 'dataset', label: 'Dataset', icon: CubeIcon },
  { kind: 'model', label: 'Model', icon: BeakerIcon },
  { kind: 'notebook', label: 'Notebook', icon: BookOpenIcon },
  { kind: 'competition', label: 'Kompetisi', icon: TrophyIcon },
  { kind: 'idea_space', label: 'Ruang ide', icon: LightBulbIcon },
  { kind: 'data_factory', label: 'Pabrik data', icon: CloudArrowUpIcon },
  { kind: 'transformer_space', label: 'Ruang transformer', icon: WrenchScrewdriverIcon },
  { kind: 'model_registry', label: 'Registry model', icon: CpuChipIcon },
  { kind: 'synthetic_data', label: 'Data sintesis', icon: SparklesIcon },
  { kind: 'analytics_space', label: 'Ruang analitik', icon: ChartBarIcon },
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
        {ASSET_LINKS.map(({ kind, label, icon: Icon }) => (
          <ButtonPrimary key={kind} href={teamAssetHref(kind, teamId)} outline className="!gap-2">
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </ButtonPrimary>
        ))}
      </div>
    </section>
  )
}
