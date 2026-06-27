import type { Collection, CollectionItem, TransformerHub } from '@/types/api'
import { repos } from './repos'
import { notebookRecords } from './notebooks'

export type MockCollectionRecord = Collection & {
  category_slug?: string | null
  raw_items: { type: string; slug?: string; id?: string }[]
}

function resolveItems(raw: MockCollectionRecord['raw_items']): CollectionItem[] {
  const out: CollectionItem[] = []
  for (const it of raw) {
    if (it.type === 'notebook' && it.id) {
      const nb = notebookRecords.find((n) => n.id === it.id)
      if (nb) out.push({ type: 'notebook', id: nb.id, title: nb.title })
      continue
    }
    if (it.slug) {
      const repo = repos.find((r) => r.slug === it.slug)
      if (repo) {
        out.push({
          type: repo.kind as 'model' | 'dataset' | 'project',
          slug: repo.slug,
          name: repo.name,
          owner: repo.owner.username,
          likes: repo.likes,
          downloads: repo.downloads,
        })
      }
    }
  }
  return out
}

export const mockCollections: MockCollectionRecord[] = [
  {
    slug: 'model-bahasa-indonesia',
    title: 'Model Bahasa Indonesia',
    cover_url: null,
    is_featured: true,
    count: 1,
    description_md:
      'Koleksi kurasi model Transformer untuk teks berbahasa Indonesia — sentimen, klasifikasi, dan embedding.',
    category_slug: 'transformer',
    raw_items: [{ type: 'model', slug: 'psd/indobert-sentimen' }],
  },
  {
    slug: 'notebook-fine-tuning-hemat',
    title: 'Notebook Fine-tuning Hemat',
    cover_url: null,
    is_featured: true,
    count: 2,
    description_md:
      'Notebook referensi fine-tuning model bahasa dengan resource terbatas — cocok untuk pemula dan UMKM.',
    category_slug: 'transformer',
    raw_items: [
      { type: 'model', slug: 'psd/indobert-sentimen' },
      { type: 'dataset', slug: 'psd/ulasan-marketplace-id' },
      { type: 'notebook', id: 'nb_transformer_01' },
    ],
  },
  {
    slug: 'dataset-nlp-indonesia',
    title: 'Dataset NLP Indonesia',
    cover_url: null,
    is_featured: false,
    count: 1,
    description_md: 'Dataset teks berbahasa Indonesia untuk eksperimen model Transformer.',
    category_slug: 'transformer',
    raw_items: [{ type: 'dataset', slug: 'psd/ulasan-marketplace-id' }],
  },
]

export function findMockCollection(slug: string): MockCollectionRecord | undefined {
  return mockCollections.find((c) => c.slug === slug)
}

export function mockCollectionDetail(slug: string): Collection | null {
  const c = findMockCollection(slug)
  if (!c) return null
  const items = resolveItems(c.raw_items)
  return {
    slug: c.slug,
    title: c.title,
    cover_url: c.cover_url,
    is_featured: c.is_featured,
    count: items.length,
    description_md: c.description_md,
    items,
  }
}

const transformerCategory = {
  slug: 'transformer',
  name: 'Transformer',
  description: 'Model, dataset, dan notebook bertema Transformer dengan konteks Indonesia.',
}

function transformerRepos(kind: 'model' | 'dataset') {
  return repos
    .filter((r) => r.kind === kind && r.tags.includes('transformer'))
    .sort((a, b) => b.downloads - a.downloads)
}

export function mockTransformerHub(): TransformerHub {
  const featured = mockCollections.filter((c) => c.is_featured)
  const transformerNotebooks = notebookRecords.filter((n) => n.tags.includes('transformer'))

  return {
    category: transformerCategory,
    collections: featured.map((c) => ({
      slug: c.slug,
      title: c.title,
      cover_url: c.cover_url,
      is_featured: c.is_featured,
      count: resolveItems(c.raw_items).length,
    })),
    models: transformerRepos('model'),
    datasets: transformerRepos('dataset'),
    notebooks: transformerNotebooks.map((n) => ({ id: n.id, title: n.title })),
  }
}

export function mockTransformerHubEmpty(): TransformerHub {
  return { category: null, collections: [], models: [], datasets: [], notebooks: [] }
}

export { resolveItems as resolveMockCollectionItems }
