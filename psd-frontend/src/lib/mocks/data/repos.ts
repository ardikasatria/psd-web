import type { RepoDetail, RepoSummary, CategoryRef } from '@/types/api'
import { owners } from './users'

const categoryMap = {
  nlp: { slug: 'nlp', name: 'NLP & Bahasa' },
  cv: { slug: 'computer-vision', name: 'Computer Vision' },
  tab: { slug: 'tabular', name: 'Tabular & Forecasting' },
  umkm: { slug: 'umkm', name: 'UMKM & Ekonomi' },
  transformer: { slug: 'transformer', name: 'Transformer' },
} as const

const subMap: Record<string, CategoryRef> = {
  sentimen: { slug: 'sentimen', name: 'Sentimen' },
  chatbot: { slug: 'chatbot', name: 'Chatbot' },
  'deteksi-penyakit': { slug: 'deteksi-penyakit', name: 'Deteksi Penyakit' },
  forecasting: { slug: 'forecasting', name: 'Forecasting' },
  permintaan: { slug: 'permintaan', name: 'Permintaan Produk' },
}

function inferCategory(tags: string[]): { category: CategoryRef | null; subcategory: CategoryRef | null } {
  if (tags.includes('transformer')) {
    return { category: categoryMap.transformer, subcategory: null }
  }
  if (tags.some((t) => ['nlp', 'sentimen', 'chatbot', 'bahasa-indonesia'].includes(t))) {
    return {
      category: categoryMap.nlp,
      subcategory: tags.includes('sentimen') ? subMap.sentimen : tags.includes('chatbot') ? subMap.chatbot : null,
    }
  }
  if (tags.some((t) => ['computer-vision', 'pertanian', 'padi', 'cnn'].includes(t))) {
    return { category: categoryMap.cv, subcategory: tags.includes('pertanian') ? subMap['deteksi-penyakit'] : null }
  }
  if (tags.includes('umkm')) {
    return { category: categoryMap.umkm, subcategory: subMap.permintaan }
  }
  if (tags.some((t) => ['forecasting', 'tabular', 'lstm'].includes(t))) {
    return { category: categoryMap.tab, subcategory: subMap.forecasting }
  }
  return { category: null, subcategory: null }
}

const baseRepos: RepoSummary[] = [
  {
    id: 'ds_01',
    slug: 'psd/ulasan-marketplace-id',
    kind: 'dataset',
    owner: owners.psd,
    name: 'ulasan-marketplace-id',
    description: '200rb ulasan produk berbahasa Indonesia berlabel sentimen.',
    tags: ['nlp', 'sentimen', 'bahasa-indonesia'],
    likes: 42,
    downloads: 1310,
    visibility: 'public',
    updated_at: '2026-06-20T10:00:00Z',
    featured: true,
  },
  {
    id: 'mdl_01',
    slug: 'psd/indobert-sentimen',
    kind: 'model',
    owner: owners.psd,
    name: 'indobert-sentimen',
    description: 'Model klasifikasi sentimen berbasis IndoBERT untuk teks Indonesia.',
    tags: ['nlp', 'sentimen', 'transformer'],
    likes: 87,
    downloads: 2340,
    visibility: 'public',
    updated_at: '2026-06-18T14:30:00Z',
    featured: true,
  },
  {
    id: 'prj_01',
    slug: 'budi-santoso/analisis-umkm-lampung',
    kind: 'project',
    owner: owners.budi,
    name: 'analisis-umkm-lampung',
    description: 'Pipeline analisis data penjualan UMKM binaan Dinas Koperasi Lampung.',
    tags: ['umkm', 'forecasting', 'tabular'],
    likes: 23,
    downloads: 156,
    visibility: 'private',
    updated_at: '2026-06-15T09:00:00Z',
  },
  {
    id: 'ds_02',
    slug: 'itera-ds/citra-padi-sumsel',
    kind: 'dataset',
    owner: owners.itera,
    name: 'citra-padi-sumsel',
    description: '5.000 citra daun padi Sumatera Selatan untuk deteksi penyakit.',
    tags: ['computer-vision', 'pertanian', 'padi'],
    likes: 31,
    downloads: 890,
    visibility: 'public',
    updated_at: '2026-06-12T11:00:00Z',
  },
  {
    id: 'mdl_02',
    slug: 'siti-rahayu/klasifikasi-penyakit-padi',
    kind: 'model',
    owner: owners.siti,
    name: 'klasifikasi-penyakit-padi',
    description: 'Model CNN ringan untuk klasifikasi 4 jenis penyakit padi.',
    tags: ['computer-vision', 'pertanian', 'cnn'],
    likes: 19,
    downloads: 412,
    visibility: 'public',
    updated_at: '2026-06-10T16:00:00Z',
  },
  {
    id: 'prj_02',
    slug: 'psd/dashboard-umkm-nasional',
    kind: 'project',
    owner: owners.psd,
    name: 'dashboard-umkm-nasional',
    description: 'Dashboard interaktif visualisasi kinerja UMKM di 10 provinsi.',
    tags: ['visualisasi', 'umkm', 'dashboard'],
    likes: 56,
    downloads: 278,
    visibility: 'public',
    updated_at: '2026-06-08T08:00:00Z',
    featured: true,
  },
  {
    id: 'ds_03',
    slug: 'umkm-lampung/penjualan-harian-2024',
    kind: 'dataset',
    owner: owners.lampung,
    name: 'penjualan-harian-2024',
    description: 'Data penjualan harian 200 UMKM binaan, 18 bulan historis.',
    tags: ['umkm', 'forecasting', 'tabular'],
    likes: 15,
    downloads: 620,
    visibility: 'public',
    updated_at: '2026-06-05T12:00:00Z',
  },
  {
    id: 'mdl_03',
    slug: 'budi-santoso/forecast-umkm-lstm',
    kind: 'model',
    owner: owners.budi,
    name: 'forecast-umkm-lstm',
    description: 'Model LSTM untuk peramalan permintaan mingguan produk UMKM.',
    tags: ['forecasting', 'lstm', 'umkm'],
    likes: 28,
    downloads: 345,
    visibility: 'public',
    updated_at: '2026-06-03T10:00:00Z',
  },
  {
    id: 'mdl_04',
    slug: 'itera-ds/xgb-tabular-baseline',
    kind: 'model',
    owner: owners.itera,
    name: 'xgb-tabular-baseline',
    description: 'Baseline XGBoost untuk kompetisi tabular — feature engineering minimal, siap fine-tune.',
    tags: ['tabular', 'umkm', 'forecasting'],
    likes: 41,
    downloads: 890,
    visibility: 'public',
    updated_at: '2026-06-22T08:00:00Z',
    featured: true,
  },
  {
    id: 'mdl_05',
    slug: 'psd/fasttext-sentimen-lite',
    kind: 'model',
    owner: owners.psd,
    name: 'fasttext-sentimen-lite',
    description: 'Model FastText ringan untuk sentimen Bahasa Indonesia — cocok edge & latihan cepat.',
    tags: ['nlp', 'sentimen', 'fasttext'],
    likes: 52,
    downloads: 1120,
    visibility: 'public',
    updated_at: '2026-06-21T15:00:00Z',
  },
  {
    id: 'prj_03',
    slug: 'itera-ds/chatbot-bahasa-lampung',
    kind: 'project',
    owner: owners.itera,
    name: 'chatbot-bahasa-lampung',
    description: 'Chatbot edukasi sains data dengan dukungan dialek Lampung.',
    tags: ['nlp', 'chatbot', 'bahasa-daerah'],
    likes: 44,
    downloads: 198,
    visibility: 'public',
    updated_at: '2026-05-28T14:00:00Z',
  },
  {
    id: 'prj_04',
    slug: 'psd/pipeline-sentimen-marketplace',
    kind: 'project',
    owner: owners.psd,
    name: 'pipeline-sentimen-marketplace',
    description: 'Proyek end-to-end: ETL ulasan marketplace, fine-tune IndoBERT, dan API inferensi.',
    tags: ['nlp', 'sentimen', 'pipeline'],
    likes: 72,
    downloads: 340,
    visibility: 'public',
    updated_at: '2026-06-23T10:00:00Z',
    featured: true,
  },
  {
    id: 'prj_05',
    slug: 'siti-rahayu/iot-monitoring-padi',
    kind: 'project',
    owner: owners.siti,
    name: 'iot-monitoring-padi',
    description: 'Dashboard IoT + model CV untuk monitoring kesehatan tanaman padi di lapangan.',
    tags: ['computer-vision', 'pertanian', 'dashboard'],
    likes: 31,
    downloads: 125,
    visibility: 'public',
    updated_at: '2026-06-17T14:00:00Z',
  },
  {
    id: 'prj_06',
    slug: 'budi-santoso/forecast-dashboard-umkm',
    kind: 'project',
    owner: owners.budi,
    name: 'forecast-dashboard-umkm',
    description: 'Dashboard peramalan permintaan UMKM dengan model LSTM dan visualisasi mingguan.',
    tags: ['umkm', 'forecasting', 'visualisasi'],
    likes: 38,
    downloads: 210,
    visibility: 'public',
    updated_at: '2026-06-14T09:00:00Z',
  },
  {
    id: 'ds_04',
    slug: 'psd/survei-digital-umkm-2025',
    kind: 'dataset',
    owner: owners.psd,
    name: 'survei-digital-umkm-2025',
    description: 'Hasil survei adopsi teknologi digital pada 1.500 UMKM Indonesia.',
    tags: ['umkm', 'survei', 'digitalisasi'],
    likes: 37,
    downloads: 720,
    visibility: 'public',
    updated_at: '2026-05-25T09:00:00Z',
  },
  {
    id: 'ds_room_challenged',
    slug: 'umkm-demand-challenged/transaksi-umkm',
    kind: 'dataset',
    owner: owners.roomChallenged,
    name: 'transaksi-umkm',
    description: 'Data sintesis transaksi harian UMKM dari Ruang Ide — untuk tantangan kompetisi.',
    tags: ['umkm', 'forecasting', 'tabular'],
    likes: 8,
    downloads: 42,
    visibility: 'public',
    updated_at: '2026-06-26T10:00:00Z',
    synthetic: true,
  },
  {
    id: 'ds_05',
    slug: 'psd/corpus-bahasa-daerah',
    kind: 'dataset',
    owner: owners.psd,
    name: 'corpus-bahasa-daerah',
    description: 'Korpus teks 12 bahasa daerah Indonesia untuk NLP dan chatbot edukasi.',
    tags: ['nlp', 'bahasa-daerah', 'chatbot'],
    likes: 64,
    downloads: 1580,
    visibility: 'public',
    updated_at: '2026-06-24T11:00:00Z',
    featured: true,
  },
  {
    id: 'ds_06',
    slug: 'budi-santoso/logistik-kompetisi-tabular',
    kind: 'dataset',
    owner: owners.budi,
    name: 'logistik-kompetisi-tabular',
    description: 'Dataset tabular logistik UMKM untuk latihan feature engineering kompetisi.',
    tags: ['tabular', 'umkm', 'forecasting'],
    likes: 22,
    downloads: 510,
    visibility: 'public',
    updated_at: '2026-06-19T09:00:00Z',
  },
]

const modelMetricsPreview: Record<string, Record<string, number>> = {
  'psd/indobert-sentimen': { accuracy: 0.912, f1: 0.89 },
  'siti-rahayu/klasifikasi-penyakit-padi': { accuracy: 0.884, f1: 0.86 },
  'budi-santoso/forecast-umkm-lstm': { mape: 0.124 },
  'itera-ds/xgb-tabular-baseline': { accuracy: 0.901, f1: 0.87 },
  'psd/fasttext-sentimen-lite': { accuracy: 0.856, f1: 0.84 },
}

const datasetPreviewMap: Record<
  string,
  { rows?: number; columns?: number; format?: string; size_mb?: number }
> = {
  'psd/ulasan-marketplace-id': { rows: 200_000, columns: 4, format: 'CSV', size_mb: 48 },
  'itera-ds/citra-padi-sumsel': { rows: 5_000, format: 'Images', size_mb: 420 },
  'umkm-lampung/penjualan-harian-2024': { rows: 108_000, columns: 12, format: 'CSV', size_mb: 8.2 },
  'psd/survei-digital-umkm-2025': { rows: 1_500, columns: 28, format: 'CSV', size_mb: 1.4 },
  'umkm-demand-challenged/transaksi-umkm': { rows: 50_000, columns: 8, format: 'CSV', size_mb: 3.1 },
  'psd/corpus-bahasa-daerah': { rows: 85_000, columns: 3, format: 'JSONL', size_mb: 22 },
  'budi-santoso/logistik-kompetisi-tabular': { rows: 32_000, columns: 18, format: 'CSV', size_mb: 5.6 },
}

const projectPreviewMap: Record<
  string,
  { stack?: string[]; assets_count?: number; has_demo?: boolean }
> = {
  'budi-santoso/analisis-umkm-lampung': { stack: ['Python', 'Pandas', 'Streamlit'], assets_count: 4, has_demo: true },
  'psd/dashboard-umkm-nasional': { stack: ['React', 'D3', 'FastAPI'], assets_count: 6, has_demo: true },
  'itera-ds/chatbot-bahasa-lampung': { stack: ['Python', 'Rasa', 'HuggingFace'], assets_count: 3 },
  'psd/pipeline-sentimen-marketplace': { stack: ['Python', 'PyTorch', 'FastAPI'], assets_count: 5, has_demo: true },
  'siti-rahayu/iot-monitoring-padi': { stack: ['Python', 'TensorFlow', 'Grafana'], assets_count: 4, has_demo: true },
  'budi-santoso/forecast-dashboard-umkm': { stack: ['Python', 'LSTM', 'Plotly'], assets_count: 3, has_demo: true },
}

export const repos: RepoSummary[] = baseRepos.map((repo) => {
  const { category, subcategory } = inferCategory(repo.tags)
  const metrics_preview =
    repo.kind === 'model' ? modelMetricsPreview[repo.slug] : undefined
  const dataset_preview =
    repo.kind === 'dataset' ? datasetPreviewMap[repo.slug] : undefined
  const project_preview =
    repo.kind === 'project' ? projectPreviewMap[repo.slug] : undefined
  return { ...repo, category, subcategory, metrics_preview, dataset_preview, project_preview }
})

export function detailOf(repo: RepoSummary): RepoDetail {
  const readmeMap: Record<string, string> = {
    'psd/ulasan-marketplace-id': `# Ulasan Marketplace Indonesia

Dataset berisi 200.000 ulasan produk dari marketplace lokal dengan label sentimen (positif, negatif, netral).

## Struktur data
- \`text\`: teks ulasan
- \`label\`: 0=negatif, 1=netral, 2=positif
- \`category\`: kategori produk

## Lisensi
CC BY-SA 4.0`,
    'psd/indobert-sentimen': `# IndoBERT Sentimen

Model fine-tuned IndoBERT untuk klasifikasi sentimen teks Indonesia.

## Metrik
- Akurasi: 91.2%
- F1 macro: 0.89`,
    'budi-santoso/analisis-umkm-lampung': `# Analisis UMKM Lampung

Proyek end-to-end dari ETL hingga visualisasi dashboard penjualan UMKM.`,
  }

  return {
    ...repo,
    readme_md: readmeMap[repo.slug] ?? `# ${repo.name}\n\n${repo.description}`,
    from_room:
      repo.slug === 'umkm-demand-challenged/transaksi-umkm'
        ? { slug: 'umkm-demand-challenged', title: 'Prediksi UMKM (Ditantangkan)' }
        : undefined,
    files: [
      {
        path: 'README.md',
        size_bytes: 2048,
        type: 'markdown',
        url: `https://example.com/mock/${repo.slug}/README.md`,
      },
      {
        path: 'data/train.csv',
        size_bytes: 15_000_000,
        type: 'csv',
        url: `https://example.com/mock/${repo.slug}/data/train.csv`,
      },
      {
        path: 'data/test.csv',
        size_bytes: 3_000_000,
        type: 'csv',
        url: `https://example.com/mock/${repo.slug}/data/test.csv`,
      },
    ],
    license: 'CC BY-SA 4.0',
    metrics: repo.metrics_preview ?? (repo.kind === 'model' ? { accuracy: 0.912, f1: 0.89 } : undefined),
    liked: false,
  }
}

export function findRepo(kind: string, owner: string, name: string) {
  const slug = `${owner}/${name}`
  const kindNorm = kind.replace(/s$/, '')
  return repos.find((r) => r.slug === slug && (r.kind === kindNorm || r.kind === kind))
}
