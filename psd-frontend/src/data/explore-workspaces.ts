import type { QuickNavItem } from '@/components/features/layout'
import {
  AcademicCapIcon,
  BeakerIcon,
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  CubeIcon,
  FolderIcon,
  LightBulbIcon,
  SparklesIcon,
  Squares2X2Icon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { CodeBracketSquareIcon } from '@heroicons/react/24/outline'

/** Aset inti — repo & notebook */
export const exploreAssetNav: QuickNavItem[] = [
  {
    label: 'Proyek',
    description: 'Solusi sains data end-to-end',
    href: '/projects',
    icon: FolderIcon,
    gradient: 'from-rose-400 to-primary-600',
  },
  {
    label: 'Dataset',
    description: 'Data terbuka berkonteks Indonesia',
    href: '/datasets',
    icon: CubeIcon,
    gradient: 'from-blue-400 to-indigo-600',
  },
  {
    label: 'Model',
    description: 'Model ML siap pakai',
    href: '/models',
    icon: BeakerIcon,
    gradient: 'from-violet-400 to-purple-600',
  },
  {
    label: 'Notebook',
    description: 'Analisis interaktif & berbagi',
    href: '/notebooks',
    icon: CodeBracketSquareIcon,
    gradient: 'from-sky-400 to-indigo-600',
  },
  {
    label: 'Data Sintesis',
    description: 'Generator dataset latihan',
    href: '/synthesis',
    icon: SparklesIcon,
    gradient: 'from-primary-400 to-violet-600',
  },
  {
    label: 'Koleksi',
    description: 'Kurasi aset tematik',
    href: '/collections',
    icon: Squares2X2Icon,
    gradient: 'from-fuchsia-400 to-pink-600',
  },
]

/** Ruang kerja & komunitas */
export const exploreWorkspaceNav: QuickNavItem[] = [
  {
    label: 'Pabrik Data',
    description: 'Pipeline ETL visual',
    href: '/factory/pipelines',
    icon: Cog6ToothIcon,
    gradient: 'from-amber-400 to-orange-600',
  },
  {
    label: 'Ruang Panen',
    description: 'Ekstraksi & enrichment data',
    href: '/harvest',
    icon: CubeIcon,
    gradient: 'from-lime-500 to-emerald-600',
  },
  {
    label: 'Ruang Analitik',
    description: 'Dashboard & insight',
    href: '/analytics',
    icon: ChartBarSquareIcon,
    gradient: 'from-rose-400 to-red-600',
  },
  {
    label: 'Ruang Ide',
    description: 'Framing masalah kolaboratif',
    href: '/idea-rooms',
    icon: LightBulbIcon,
    gradient: 'from-yellow-400 to-amber-600',
  },
  {
    label: 'Ruang Transformer',
    description: 'Koleksi & transformasi aset',
    href: '/transformer',
    icon: Squares2X2Icon,
    gradient: 'from-indigo-400 to-blue-600',
  },
  {
    label: 'Kompetisi',
    description: 'Tantangan & leaderboard',
    href: '/competitions',
    icon: TrophyIcon,
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    label: 'Organisasi',
    description: 'UMKM, akademik, komunitas',
    href: '/orgs',
    icon: BuildingOffice2Icon,
    gradient: 'from-emerald-400 to-teal-600',
  },
  {
    label: 'Belajar',
    description: 'Kursus & learning path',
    href: '/learn',
    icon: AcademicCapIcon,
    gradient: 'from-emerald-400 to-cyan-600',
  },
]
