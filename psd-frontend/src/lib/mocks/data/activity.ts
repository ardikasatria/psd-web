import type { ActivitySummary } from '@/types/api'

export const mockActivitySummary: ActivitySummary = {
  top_categories: [
    { slug: 'sains-data', name: 'Sains Data', count: 24 },
    { slug: 'machine-learning', name: 'Machine Learning', count: 18 },
    { slug: 'visualisasi', name: 'Visualisasi', count: 11 },
  ],
  top_tags: [
    { tag: 'python', count: 15 },
    { tag: 'pandas', count: 12 },
    { tag: 'forecasting', count: 8 },
    { tag: 'umkm', count: 6 },
  ],
  actions: {
    view: 42,
    search: 9,
    click: 28,
  },
  window_days: 30,
}
