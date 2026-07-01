import type { SearchKind } from '@/types/api'
import {
  BeakerIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CircleStackIcon,
  CpuChipIcon,
  CubeIcon,
  CalendarDaysIcon,
  TrophyIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'

export type KindMeta = {
  /** Label kategori (untuk header seksi & tab). */
  label: string
  /** Nilai `type=` yang dikirim ke backend. */
  typeParam: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Kelas warna badge — aman untuk mode gelap & terang. */
  badge: string
  /** Kelas warna wadah ikon. */
  iconWrap: string
}

export const KIND_META: Record<SearchKind, KindMeta> = {
  user: {
    label: 'Akun',
    typeParam: 'user',
    icon: UserCircleIcon,
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    iconWrap: 'bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300',
  },
  org: {
    label: 'Organisasi',
    typeParam: 'org',
    icon: BuildingOffice2Icon,
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    iconWrap: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  competition: {
    label: 'Kompetisi',
    typeParam: 'competition',
    icon: TrophyIcon,
    badge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
    iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200',
  },
  project: {
    label: 'Proyek',
    typeParam: 'project',
    icon: CubeIcon,
    badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
    iconWrap: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300',
  },
  model: {
    label: 'Model',
    typeParam: 'model',
    icon: CpuChipIcon,
    badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    iconWrap: 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300',
  },
  dataset: {
    label: 'Dataset',
    typeParam: 'dataset',
    icon: CircleStackIcon,
    badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
    iconWrap: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-300',
  },
  notebook: {
    label: 'Notebook',
    typeParam: 'notebook',
    icon: BeakerIcon,
    badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
    iconWrap: 'bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-300',
  },
  event: {
    label: 'Event',
    typeParam: 'event',
    icon: CalendarDaysIcon,
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    iconWrap: 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300',
  },
  team: {
    label: 'Tim',
    typeParam: 'team',
    icon: UserGroupIcon,
    badge: 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300',
    iconWrap: 'bg-primary-100 text-primary-600 dark:bg-primary-950/60 dark:text-primary-300',
  },
  forum: {
    label: 'Forum',
    typeParam: 'forum',
    icon: ChatBubbleLeftRightIcon,
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    iconWrap: 'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300',
  },
  post: {
    label: 'Postingan',
    typeParam: 'post',
    icon: ChatBubbleOvalLeftEllipsisIcon,
    badge: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    iconWrap: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  },
}

/** Urutan saran untuk dropdown & tab, sesuai brief. */
export const KIND_ORDER: SearchKind[] = [
  'user',
  'org',
  'competition',
  'project',
  'model',
  'dataset',
  'notebook',
  'event',
  'team',
  'forum',
  'post',
]

export function kindMeta(kind: SearchKind): KindMeta {
  return KIND_META[kind] ?? KIND_META.post
}
