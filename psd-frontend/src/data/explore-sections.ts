import {
  BeakerIcon,
  BuildingOffice2Icon,
  ClockIcon,
  CodeBracketSquareIcon,
  CubeIcon,
  FolderIcon,
  HashtagIcon,
  SparklesIcon,
  Squares2X2Icon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'

export type ExploreSection = {
  id: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  seeAllHref?: string
}

export const exploreSections: ExploreSection[] = [
  { id: 'featured', label: 'Pilihan PSD', icon: SparklesIcon },
  { id: 'recent', label: 'Baru di komunitas', icon: ClockIcon },
  { id: 'projects', label: 'Proyek', icon: FolderIcon, seeAllHref: '/projects' },
  { id: 'datasets', label: 'Dataset', icon: CubeIcon, seeAllHref: '/datasets' },
  { id: 'models', label: 'Model', icon: BeakerIcon, seeAllHref: '/models' },
  { id: 'notebooks', label: 'Notebook', icon: CodeBracketSquareIcon, seeAllHref: '/notebooks' },
  { id: 'workspaces', label: 'Ruang kerja', icon: Squares2X2Icon },
  { id: 'competitions', label: 'Kompetisi', icon: TrophyIcon, seeAllHref: '/competitions' },
  { id: 'orgs', label: 'Organisasi', icon: BuildingOffice2Icon, seeAllHref: '/orgs' },
  { id: 'tags', label: 'Topik populer', icon: HashtagIcon },
]
