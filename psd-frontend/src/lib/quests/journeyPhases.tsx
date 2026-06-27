import type { ComponentType, SVGProps } from 'react'
import {
  AcademicCapIcon,
  RocketLaunchIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'

export type JourneyPhase = {
  key: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  color: string
}

export const JOURNEY_PHASES: JourneyPhase[] = [
  { key: 'learn', label: 'Belajar', Icon: AcademicCapIcon, color: 'from-primary-400 to-primary-500' },
  { key: 'prove', label: 'Buktikan', Icon: TrophyIcon, color: 'from-amber-400 to-orange-500' },
  { key: 'contribute', label: 'Berkontribusi', Icon: RocketLaunchIcon, color: 'from-blue-500 to-indigo-600' },
  { key: 'portfolio', label: 'Portofolio', Icon: SparklesIcon, color: 'from-violet-500 to-purple-600' },
]
