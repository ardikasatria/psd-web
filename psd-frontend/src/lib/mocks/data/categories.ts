import type { Category, CategoryDetail } from '@/types/api'

export const mockCategories: Category[] = [
  {
    slug: 'nlp',
    name: 'NLP & Bahasa',
    description: 'Pemrosesan bahasa alami, sentimen, dan chatbot berbahasa Indonesia.',
    subcategory_count: 3,
  },
  {
    slug: 'computer-vision',
    name: 'Computer Vision',
    description: 'Deteksi objek, klasifikasi citra, dan aplikasi pertanian.',
    subcategory_count: 2,
  },
  {
    slug: 'tabular',
    name: 'Tabular & Forecasting',
    description: 'Data tabular, peramalan, dan optimasi.',
    subcategory_count: 2,
  },
  {
    slug: 'umkm',
    name: 'UMKM & Ekonomi',
    description: 'Aplikasi sains data untuk UMKM dan ekonomi lokal.',
    subcategory_count: 2,
  },
  {
    slug: 'transformer',
    name: 'Transformer',
    description: 'Model, dataset, dan notebook bertema Transformer dengan konteks Indonesia.',
    subcategory_count: 0,
  },
]

const subcategoriesByMain: Record<string, { slug: string; name: string }[]> = {
  nlp: [
    { slug: 'sentimen', name: 'Sentimen' },
    { slug: 'chatbot', name: 'Chatbot' },
    { slug: 'klasifikasi-teks', name: 'Klasifikasi Teks' },
  ],
  'computer-vision': [
    { slug: 'deteksi-penyakit', name: 'Deteksi Penyakit' },
    { slug: 'drone', name: 'Citra Drone' },
  ],
  tabular: [
    { slug: 'forecasting', name: 'Forecasting' },
    { slug: 'optimasi', name: 'Optimasi' },
  ],
  umkm: [
    { slug: 'permintaan', name: 'Permintaan Produk' },
    { slug: 'logistik', name: 'Logistik' },
  ],
}

export function mockCategoryDetail(slug: string): CategoryDetail | null {
  const main = mockCategories.find((c) => c.slug === slug)
  if (!main) return null
  return {
    ...main,
    subcategories: subcategoriesByMain[slug] ?? [],
  }
}

export function slugifyCategoryName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'kategori'
  )
}
