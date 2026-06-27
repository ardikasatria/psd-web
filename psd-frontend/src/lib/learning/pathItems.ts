import type { PathItem, PathItemType, PathPhase } from '@/types/api'

export const PATH_PHASES: {
  key: PathPhase
  label: string
  subtitle: string
  hint: string
}[] = [
  {
    key: 'belajar',
    label: 'Belajar',
    subtitle: 'Fondasi keahlian',
    hint: 'Kursus, notebook, materi terstruktur',
  },
  {
    key: 'buktikan',
    label: 'Buktikan',
    subtitle: 'Portofolio & praktik',
    hint: 'Dataset, model, proyek, Ruang Ide',
  },
  {
    key: 'berpeluang',
    label: 'Berpeluang',
    subtitle: 'Kompetisi & jaringan',
    hint: 'Kompetisi, event, peluang karier',
  },
]

export const PATH_ITEM_TYPES: { type: PathItemType; label: string; phase: PathPhase }[] = [
  { type: 'course', label: 'Kursus', phase: 'belajar' },
  { type: 'notebook', label: 'Notebook', phase: 'belajar' },
  { type: 'dataset', label: 'Dataset', phase: 'buktikan' },
  { type: 'model', label: 'Model', phase: 'buktikan' },
  { type: 'project', label: 'Proyek', phase: 'buktikan' },
  { type: 'idea_room', label: 'Ruang Ide', phase: 'buktikan' },
  { type: 'competition', label: 'Kompetisi', phase: 'berpeluang' },
  { type: 'event', label: 'Event', phase: 'berpeluang' },
]

export function defaultPhaseForType(type: PathItemType): PathPhase {
  return PATH_ITEM_TYPES.find((t) => t.type === type)?.phase ?? 'belajar'
}

export function pathItemTypeLabel(type: PathItemType): string {
  return PATH_ITEM_TYPES.find((t) => t.type === type)?.label ?? type
}

export function pathItemHref(item: PathItem): string {
  switch (item.type) {
    case 'course':
      return `/learn/${item.ref}`
    case 'dataset':
      return `/datasets/${item.ref}`
    case 'model':
      return `/models/${item.ref}`
    case 'project':
      return `/projects/${item.ref}`
    case 'notebook':
      return `/notebooks/${item.ref}`
    case 'idea_room':
      return `/idea-rooms/${item.ref}`
    case 'competition':
      return `/competitions/${item.ref}`
    case 'event':
      return `/events/${item.ref}`
    default:
      return '/'
  }
}

export function normalizePathItems(
  items: PathItem[] | undefined,
  courseSlugs: string[] | undefined,
): PathItem[] {
  if (items?.length) return items
  return (courseSlugs ?? []).map((ref) => ({ phase: 'belajar' as const, type: 'course' as const, ref }))
}

export function emptyPhaseCounts() {
  return { belajar: 0, buktikan: 0, berpeluang: 0 }
}

export function countPhases(items: PathItem[]) {
  const counts = emptyPhaseCounts()
  for (const item of items) {
    if (item.phase in counts) counts[item.phase] += 1
  }
  return counts
}
