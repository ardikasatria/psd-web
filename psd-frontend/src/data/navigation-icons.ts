import {
  AcademicCapIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleBottomCenterTextIcon,
  CircleStackIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  FolderIcon,
  MegaphoneIcon,
  RectangleStackIcon,
  SparklesIcon,
  TagIcon,
  TrophyIcon,
  LightBulbIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'

export const NAV_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  '/explore': SparklesIcon,
  '/projects': FolderIcon,
  '/datasets': CircleStackIcon,
  '/synthesis': SparklesIcon,
  '/factory/pipelines': Cog6ToothIcon,
  '/analytics': ChartBarSquareIcon,
  '/ml': RectangleStackIcon,
  '/assistant': ChatBubbleBottomCenterTextIcon,
  '/models': BeakerIcon,
  '/notebooks': CodeBracketSquareIcon,
  '/competitions': TrophyIcon,
  '/idea-rooms': LightBulbIcon,
  '/transformer': CpuChipIcon,
  '/quests': SparklesIcon,
  '/categories': TagIcon,
  '/events': CalendarDaysIcon,
  '/learn': AcademicCapIcon,
  '/community': MegaphoneIcon,
  '/forum': ChatBubbleLeftRightIcon,
  '/teams': UserGroupIcon,
  '/leaderboard': TrophyIcon,
}

export function getNavIcon(href?: string) {
  if (!href) return null
  return NAV_ICONS[href] ?? null
}

export function getNavItemIcon(item: { href?: string; iconHref?: string }) {
  return getNavIcon(item.iconHref ?? item.href)
}
