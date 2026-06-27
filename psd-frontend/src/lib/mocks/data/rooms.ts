import type { IdeaRoom, ProblemComponent, RoomProblem, RoomStatus, RoomSubmission, SolutionTemplate } from '@/types/api'
import { demoUser, users } from './users'

export type MockRoomRecord = IdeaRoom & {
  _teamId: string
  _visibility: 'public' | 'private'
  _founderId: string
}

const now = Date.now()
const framingDeadline = new Date(now + 48 * 3600_000).toISOString()

export const mockRoomComponents: Record<string, ProblemComponent[]> = {
  'umkm-demand-framing': [
    {
      id: 'pcm_01',
      kind: 'context',
      content_md: 'UMKM di Lampung mengalami fluktuasi permintaan musiman yang sulit diprediksi tanpa data historis terstruktur.',
      author: { username: demoUser.username, avatar_url: demoUser.avatar_url },
    },
    {
      id: 'pcm_02',
      kind: 'goal',
      content_md: 'Membangun model forecasting permintaan produk dengan akurasi MAPE di bawah 15% untuk 30 hari ke depan.',
      author: { username: users[1]?.username ?? demoUser.username, avatar_url: null },
    },
    {
      id: 'pcm_03',
      kind: 'data_need',
      content_md: 'Transaksi harian per SKU, data cuaca lokal, kalender libur nasional.',
      author: { username: demoUser.username, avatar_url: demoUser.avatar_url },
    },
  ],
}

export const mockRoomProblems: Record<string, RoomProblem> = {
  'umkm-demand-closed': {
    statement_md:
      '**Masalah:** UMKM di Lampung perlu memprediksi permintaan produk 30 hari ke depan.\n\nTim akan membangun model forecasting dengan target MAPE < 15%.',
    suggested_metric: 'MAPE < 15% pada horizon 30 hari',
    data_kind: 'structured',
    data_spec: {
      name: 'transaksi-umkm-lampung',
      description: 'Transaksi harian per SKU UMKM dengan fitur cuaca dan kalender libur.',
      columns: [
        { name: 'tanggal', dtype: 'datetime', params: {} },
        { name: 'sku', dtype: 'category', params: { values: ['A1', 'B2', 'C3'] } },
        { name: 'qty', dtype: 'int', params: { min: 0, max: 500 } },
        { name: 'kota', dtype: 'city', params: {} },
      ],
    },
    unstructured_guidance_md: null,
    generated_by: 'ai',
  },
  'nlp-sentimen-solving': {
    statement_md:
      'Klasifikasikan ulasan marketplace ke label sentimen (positif/netral/negatif) dengan F1 macro ≥ 0.82.',
    suggested_metric: 'F1 macro ≥ 0.82',
    data_kind: 'unstructured',
    data_spec: null,
    unstructured_guidance_md:
      '1. Kumpulkan ≥ 5.000 ulasan Bahasa Indonesia dari marketplace lokal.\n2. Simpan sebagai CSV: id, teks, tanggal, rating.\n3. Label manual 500 sampel awal (stratified per rating).\n4. Pisahkan train/val/test 70/15/15.',
    generated_by: 'ai',
  },
}

export const mockRoomAssets: Record<
  string,
  { type: string; slug: string; name: string; visibility: string; synthetic: boolean }[]
> = {
  'umkm-demand-finished': [
    {
      type: 'dataset',
      slug: 'umkm-demand-finished/transaksi-umkm',
      name: 'transaksi-umkm',
      visibility: 'private',
      synthetic: true,
    },
  ],
  'umkm-demand-challenged': [
    {
      type: 'dataset',
      slug: 'umkm-demand-challenged/transaksi-umkm',
      name: 'transaksi-umkm',
      visibility: 'public',
      synthetic: true,
    },
  ],
}

export const DEFAULT_SOLUTION_TEMPLATE: SolutionTemplate = {
  sections: [
    { key: 'eksplorasi', title: 'Eksplorasi Data' },
    { key: 'pemrosesan', title: 'Pemrosesan & Fitur' },
    { key: 'pemodelan', title: 'Pemodelan' },
    { key: 'evaluasi', title: 'Evaluasi & Hasil' },
  ],
}

export const mockRoomTemplates: Record<string, SolutionTemplate> = {}

export const mockRoomSubmissions: Record<string, RoomSubmission> = {
  'umkm-demand-submitted': {
    result_summary_md:
      'Model XGBoost dengan fitur lag 7/14 hari dan kalender libur mencapai MAPE 12.4% pada validasi.',
    notebook_id: 'nb_demo_01',
    asset_refs: [{ type: 'dataset', slug: 'umkm-demand-submitted/transaksi-umkm' }],
    metrics: { MAPE: '12.4%', RMSE: '18.2' },
    submitted_by: demoUser.id,
  },
  'umkm-demand-finished': {
    result_summary_md:
      'Model XGBoost dengan fitur lag 7/14 hari dan kalender libur mencapai MAPE 12.4% pada validasi.',
    notebook_id: 'nb_demo_01',
    asset_refs: [{ type: 'dataset', slug: 'umkm-demand-finished/transaksi-umkm' }],
    metrics: { MAPE: '12.4%', RMSE: '18.2' },
    submitted_by: demoUser.id,
  },
  'umkm-demand-challenged': {
    result_summary_md:
      'Model XGBoost dengan fitur lag 7/14 hari dan kalender libur mencapai MAPE 12.4% pada validasi.',
    notebook_id: 'nb_demo_01',
    asset_refs: [{ type: 'dataset', slug: 'umkm-demand-challenged/transaksi-umkm' }],
    metrics: { MAPE: '12.4%', RMSE: '18.2' },
    submitted_by: demoUser.id,
  },
}

export const mockRooms: MockRoomRecord[] = [
  {
    slug: 'umkm-demand-framing',
    title: 'Prediksi Permintaan UMKM Lampung',
    pitch_md:
      'Banyak UMKM di Lampung kesulitan merencanakan stok karena permintaan tidak stabil. Kita akan merumuskan masalah, mengumpulkan kebutuhan data, dan menyiapkan fondasi solusi bersama.',
    cover_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=450&fit=crop',
    status: 'framing' as RoomStatus,
    member_count: 3,
    max_members: 8,
    framing_deadline: framingDeadline,
    category: { slug: 'umkm', name: 'UMKM & Ekonomi' },
    subcategory: { slug: 'permintaan', name: 'Permintaan Produk' },
    team_slug: 'umkm-demand-framing',
    my_role: null,
    components_count: 3,
    members: [
      { username: demoUser.username, name: demoUser.name, avatar_url: demoUser.avatar_url, role: 'owner' },
      { username: users[1]?.username ?? 'siti', name: 'Siti', avatar_url: null, role: 'admin' },
      { username: users[2]?.username ?? 'budi', name: 'Budi', avatar_url: null, role: 'member' },
    ],
    _teamId: 'team_room_framing',
    _visibility: 'public',
    _founderId: demoUser.id,
  },
  {
    slug: 'umkm-demand-closed',
    title: 'Prediksi Permintaan UMKM (Tertutup)',
    pitch_md: 'Ruang telah ditutup — master sedang meramu masalah dan menyiapkan data sintesis.',
    status: 'closed' as RoomStatus,
    member_count: 3,
    max_members: 8,
    framing_deadline: null,
    category: { slug: 'umkm', name: 'UMKM & Ekonomi' },
    subcategory: { slug: 'permintaan', name: 'Permintaan Produk' },
    team_slug: 'umkm-demand-closed',
    my_role: null,
    components_count: 3,
    data_mode: null,
    dataset_repo_slug: null,
    generation_error: null,
    members: [
      { username: demoUser.username, name: demoUser.name, avatar_url: demoUser.avatar_url, role: 'owner' },
      { username: users[1]?.username ?? 'siti', name: 'Siti', avatar_url: null, role: 'admin' },
      { username: users[2]?.username ?? 'budi', name: 'Budi', avatar_url: null, role: 'member' },
    ],
    _teamId: 'team_room_closed',
    _visibility: 'public',
    _founderId: demoUser.id,
  },
  {
    slug: 'umkm-demand-solving',
    title: 'Prediksi UMKM (Fase Solusi — Sintesis)',
    pitch_md: 'Data sintesis sudah siap — tim sedang membangun solusi.',
    cover_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop',
    status: 'solving' as RoomStatus,
    member_count: 3,
    max_members: 8,
    framing_deadline: null,
    category: { slug: 'umkm', name: 'UMKM & Ekonomi' },
    subcategory: { slug: 'permintaan', name: 'Permintaan Produk' },
    team_slug: 'umkm-demand-solving',
    my_role: null,
    components_count: 3,
    data_mode: 'synthetic',
    dataset_repo_slug: 'umkm-demand-solving/transaksi-umkm-lampung',
    generation_error: null,
    members: [
      { username: demoUser.username, name: demoUser.name, avatar_url: demoUser.avatar_url, role: 'owner' },
      { username: users[1]?.username ?? 'siti', name: 'Siti', avatar_url: null, role: 'member' },
    ],
    _teamId: 'team_room_solving_syn',
    _visibility: 'public',
    _founderId: demoUser.id,
  },
  {
    slug: 'umkm-demand-submitted',
    title: 'Prediksi UMKM (Menunggu Finish)',
    pitch_md: 'Solusi sudah disubmit — menunggu master menyelesaikan ruang.',
    status: 'submitted' as RoomStatus,
    member_count: 2,
    max_members: 8,
    framing_deadline: null,
    category: { slug: 'umkm', name: 'UMKM & Ekonomi' },
    subcategory: null,
    team_slug: 'umkm-demand-submitted',
    my_role: null,
    components_count: 3,
    data_mode: 'synthetic',
    dataset_repo_slug: 'umkm-demand-submitted/transaksi-umkm',
    generation_error: null,
    members: [
      { username: demoUser.username, name: demoUser.name, avatar_url: demoUser.avatar_url, role: 'owner' },
      { username: users[1]?.username ?? 'siti', name: 'Siti', avatar_url: null, role: 'member' },
    ],
    _teamId: 'team_room_submitted',
    _visibility: 'public',
    _founderId: demoUser.id,
  },
  {
    slug: 'umkm-demand-finished',
    title: 'Prediksi UMKM (Selesai)',
    pitch_md: 'Ruang selesai — siap dipublikasikan atau dijadikan tantangan kompetisi.',
    cover_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop',
    status: 'finished' as RoomStatus,
    member_count: 2,
    max_members: 8,
    framing_deadline: null,
    category: { slug: 'umkm', name: 'UMKM & Ekonomi' },
    subcategory: { slug: 'permintaan', name: 'Permintaan Produk' },
    team_slug: 'umkm-demand-finished',
    my_role: null,
    components_count: 3,
    data_mode: 'synthetic',
    dataset_repo_slug: 'umkm-demand-finished/transaksi-umkm',
    generation_error: null,
    competition_slug: null,
    members: [
      { username: demoUser.username, name: demoUser.name, avatar_url: demoUser.avatar_url, role: 'owner' },
      { username: users[1]?.username ?? 'siti', name: 'Siti', avatar_url: null, role: 'member' },
    ],
    _teamId: 'team_room_finished',
    _visibility: 'public',
    _founderId: demoUser.id,
  },
  {
    slug: 'umkm-demand-challenged',
    title: 'Prediksi UMKM (Ditantangkan)',
    pitch_md: 'Ruang telah dijadikan kompetisi penantang untuk komunitas.',
    cover_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
    status: 'challenged' as RoomStatus,
    member_count: 2,
    max_members: 8,
    framing_deadline: null,
    category: { slug: 'umkm', name: 'UMKM & Ekonomi' },
    subcategory: { slug: 'permintaan', name: 'Permintaan Produk' },
    team_slug: 'umkm-demand-challenged',
    my_role: null,
    components_count: 3,
    data_mode: 'synthetic',
    dataset_repo_slug: 'umkm-demand-challenged/transaksi-umkm',
    generation_error: null,
    competition_slug: 'tantangan-umkm-demand',
    members: [
      { username: demoUser.username, name: demoUser.name, avatar_url: demoUser.avatar_url, role: 'owner' },
      { username: users[1]?.username ?? 'siti', name: 'Siti', avatar_url: null, role: 'member' },
    ],
    _teamId: 'team_room_challenged',
    _visibility: 'public',
    _founderId: demoUser.id,
  },
  {
    slug: 'nlp-sentimen-solving',
    title: 'Sentimen Ulasan (Menyelesaikan)',
    pitch_md: 'Fase penyelesaian — masalah dan panduan data sudah siap.',
    cover_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
    status: 'solving' as RoomStatus,
    member_count: 2,
    max_members: 5,
    framing_deadline: null,
    category: { slug: 'nlp', name: 'NLP & Bahasa' },
    subcategory: { slug: 'sentimen', name: 'Sentimen' },
    team_slug: 'nlp-sentimen-solving',
    my_role: null,
    components_count: 0,
    data_mode: 'collect',
    dataset_repo_slug: null,
    generation_error: null,
    members: [
      { username: demoUser.username, name: demoUser.name, avatar_url: demoUser.avatar_url, role: 'owner' },
      { username: users[1]?.username ?? 'siti', name: 'Siti', avatar_url: null, role: 'member' },
    ],
    _teamId: 'team_room_solving',
    _visibility: 'public',
    _founderId: demoUser.id,
  },
  {
    slug: 'nlp-sentimen-terbuka',
    title: 'Klasifikasi Sentimen Ulasan Marketplace',
    pitch_md: 'Proyek kolaboratif untuk membangun pipeline NLP sentimen Bahasa Indonesia pada ulasan e-commerce lokal.',
    status: 'open' as RoomStatus,
    member_count: 2,
    max_members: 5,
    framing_deadline: null,
    category: { slug: 'nlp', name: 'NLP & Bahasa' },
    subcategory: { slug: 'sentimen', name: 'Sentimen' },
    team_slug: 'nlp-sentimen-terbuka',
    my_role: null,
    components_count: 0,
    members: [
      { username: demoUser.username, name: demoUser.name, avatar_url: demoUser.avatar_url, role: 'owner' },
      { username: users[1]?.username ?? 'siti', name: 'Siti', avatar_url: null, role: 'member' },
    ],
    _teamId: 'team_room_open',
    _visibility: 'public',
    _founderId: demoUser.id,
  },
  {
    slug: 'privat-draft',
    title: 'Ruang Privat (Draft)',
    pitch_md: 'Contoh ruang privat masih dalam tahap draft.',
    status: 'draft' as RoomStatus,
    member_count: 1,
    max_members: null,
    framing_deadline: null,
    category: null,
    subcategory: null,
    team_slug: 'privat-draft',
    my_role: null,
    components_count: 0,
    members: [{ username: demoUser.username, name: demoUser.name, avatar_url: demoUser.avatar_url, role: 'owner' }],
    _teamId: 'team_room_private',
    _visibility: 'private',
    _founderId: demoUser.id,
  },
]

mockRoomComponents['umkm-demand-closed'] = mockRoomComponents['umkm-demand-framing'] ?? []
mockRoomComponents['umkm-demand-solving'] = mockRoomComponents['umkm-demand-framing'] ?? []
mockRoomProblems['umkm-demand-solving'] = mockRoomProblems['umkm-demand-closed']!
mockRoomProblems['umkm-demand-finished'] = mockRoomProblems['umkm-demand-closed']!
mockRoomProblems['umkm-demand-challenged'] = mockRoomProblems['umkm-demand-closed']!

/** Waktu mulai generasi mock (ms) — untuk simulasi polling */
export const mockRoomGeneratingAt: Record<string, number> = {}

export function findMockRoom(slug: string) {
  const r = mockRooms.find((room) => room.slug === slug)
  if (!r) return undefined
  if (r.status === 'generating') {
    const started = mockRoomGeneratingAt[slug]
    if (started && Date.now() - started > 3000) {
      r.status = 'solving'
      r.data_mode = 'synthetic'
      r.dataset_repo_slug = `${r.team_slug}/data-sintesis-mock`
      r.generation_error = null
      delete mockRoomGeneratingAt[slug]
    }
  }
  return r
}

export function roomSummaryOf(r: MockRoomRecord) {
  const pitch = r.pitch_md?.replace(/\s+/g, ' ').trim() ?? ''
  return {
    slug: r.slug,
    title: r.title,
    status: r.status,
    member_count: r.member_count,
    max_members: r.max_members,
    framing_deadline: r.framing_deadline,
    cover_url: r.cover_url ?? null,
    category: r.category,
    subcategory: r.subcategory,
    pitch_preview: pitch.length > 120 ? `${pitch.slice(0, 117)}…` : pitch || undefined,
    components_count: r.components_count,
  }
}

export function roomDetailForViewer(r: MockRoomRecord, userId?: string) {
  const viewer = userId ? users.find((u) => u.id === userId) : undefined
  const myRole = viewer ? r.members?.find((m) => m.username === viewer.username)?.role ?? null : null
  if (r._visibility === 'private' && !myRole) return null
  const { _teamId, _visibility, _founderId, ...rest } = r
  return { ...rest, my_role: myRole, team_id: _teamId, competition_slug: r.competition_slug ?? null }
}
