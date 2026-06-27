import { RepoKind } from '@/types/api'

export const catalogSortOptions = [
  { label: 'Terbaru', value: '-updated_at' },
  { label: 'Terpopuler', value: '-downloads' },
  { label: 'Paling disukai', value: '-likes' },
] as const

export const catalogPopularTags = [
  'nlp',
  'umkm',
  'computer-vision',
  'forecasting',
  'sentimen',
  'pertanian',
]

export const catalogMeta: Record<
  RepoKind,
  {
    title: string
    subtitle: string
    createHref: string
    createLabel: string
    basePath: string
    exploreSectionId: string
  }
> = {
  project: {
    title: 'Proyek',
    subtitle: 'Solusi sains data end-to-end dari komunitas dan organisasi lokal.',
    createHref: '/projects/new',
    createLabel: 'Buat proyek',
    basePath: '/projects',
    exploreSectionId: 'projects',
  },
  dataset: {
    title: 'Dataset',
    subtitle: 'Kumpulan data terbuka dengan konteks Indonesia untuk riset dan inovasi.',
    createHref: '/datasets/new',
    createLabel: 'Unggah dataset',
    basePath: '/datasets',
    exploreSectionId: 'datasets',
  },
  model: {
    title: 'Model',
    subtitle: 'Model machine learning siap pakai untuk berbagai kasus penggunaan.',
    createHref: '/models/new',
    createLabel: 'Publikasikan model',
    basePath: '/models',
    exploreSectionId: 'models',
  },
}
