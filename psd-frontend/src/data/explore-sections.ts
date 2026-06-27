import {
  BeakerIcon,
  CubeIcon,
  FolderIcon,
  HashtagIcon,
  SparklesIcon,
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
  { id: 'projects', label: 'Proyek', icon: FolderIcon, seeAllHref: '/projects' },
  { id: 'datasets', label: 'Dataset', icon: CubeIcon, seeAllHref: '/datasets' },
  { id: 'models', label: 'Model', icon: BeakerIcon, seeAllHref: '/models' },
  { id: 'tags', label: 'Topik populer', icon: HashtagIcon },
]
