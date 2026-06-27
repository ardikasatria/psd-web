import type { SynthJob } from '@/types/api'

export type MockSynthJob = SynthJob & {
  _createdAt: number
  _useLlm: boolean
}

const SAMPLE_SPEC = {
  name: 'Penjualan UMKM Lampung',
  description: 'Dataset sintesis transaksi UMKM di Lampung',
  columns: [
    { name: 'id', dtype: 'id', params: {} },
    { name: 'nama_toko', dtype: 'company', params: {} },
    { name: 'kota', dtype: 'city', params: {} },
    { name: 'kategori', dtype: 'category', params: { categories: ['Makanan', 'Kerajinan', 'Fashion'] } },
    { name: 'omzet', dtype: 'int', params: { min: 500_000, max: 50_000_000 } },
    { name: 'bulan', dtype: 'datetime', params: { start: '2024-01-01', end: '2024-12-31' } },
  ],
}

const SAMPLE_PREVIEW = Array.from({ length: 5 }, (_, i) => ({
  id: String(i + 1),
  nama_toko: `Toko ${['Sari', 'Mitra', 'Lestari'][i % 3]}`,
  kota: ['Bandar Lampung', 'Metro', 'Pringsewu'][i % 3],
  kategori: ['Makanan', 'Kerajinan', 'Fashion'][i % 3],
  omzet: String(1_000_000 + i * 500_000),
  bulan: `2024-0${(i % 9) + 1}-15`,
}))

export const mockSynthJobs: MockSynthJob[] = [
  {
    id: 'syn_demo_done',
    status: 'done',
    prompt: 'Dataset penjualan UMKM di Lampung per bulan',
    spec: SAMPLE_SPEC,
    n_rows: 1000,
    result_url: 'http://localhost:9000/psd-assets/synthesis/syn_demo_done.csv',
    preview: SAMPLE_PREVIEW,
    dataset_slug: null,
    error: null,
    _createdAt: Date.now() - 3600_000,
    _useLlm: true,
  },
  {
    id: 'syn_demo_failed',
    status: 'failed',
    prompt: 'Data ilegal',
    spec: null,
    n_rows: 500,
    result_url: null,
    preview: null,
    dataset_slug: null,
    error: 'Permintaan ditolak: konten tidak diizinkan',
    _createdAt: Date.now() - 7200_000,
    _useLlm: true,
  },
]

export function mockSynthQuota(userId: string) {
  const used = mockSynthJobs.filter((j) => j._useLlm && j.prompt).length
  return {
    plans_per_day: 15,
    plans_used: Math.min(used, 15),
    plans_left: Math.max(15 - used, 0),
    max_rows: 20_000,
  }
}

export function mockJobStatus(job: MockSynthJob): SynthJob {
  const elapsed = Date.now() - job._createdAt
  if (job.status === 'failed' || job.status === 'done') {
    const { _createdAt: _, _useLlm: __, ...rest } = job
    return rest
  }
  if (elapsed < 1500) return { ...job, status: 'queued' }
  if (elapsed < 3000) return { ...job, status: 'planning', spec: job._useLlm ? null : job.spec }
  if (elapsed < 4500) return { ...job, status: 'generating', spec: job.spec ?? SAMPLE_SPEC }
  const { _createdAt: _, _useLlm: __, ...done } = {
    ...job,
    status: 'done' as const,
    spec: job.spec ?? SAMPLE_SPEC,
    result_url: job.result_url ?? `http://localhost:9000/psd-assets/synthesis/${job.id}.csv`,
    preview: job.preview ?? SAMPLE_PREVIEW,
  }
  Object.assign(job, done)
  return done
}

export function createMockJob(body: {
  prompt?: string
  spec?: Record<string, unknown>
  n_rows: number
}): MockSynthJob {
  const job: MockSynthJob = {
    id: `syn_${Date.now()}`,
    status: 'queued',
    prompt: body.prompt ?? null,
    spec: body.spec ?? null,
    n_rows: body.n_rows,
    result_url: null,
    preview: null,
    dataset_slug: null,
    error: null,
    _createdAt: Date.now(),
    _useLlm: !body.spec,
  }
  mockSynthJobs.unshift(job)
  return job
}
