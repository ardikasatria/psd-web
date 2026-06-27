import type { Dashboard, DashboardSummary, DashboardWidget, WidgetKind } from '@/types/api'
import { mockPipelines } from './factory'
import { mockPipelineRuns } from './factory-runs'

export type MockDashboard = Dashboard & { id: string; owner_id: string }

export const mockDashboards: MockDashboard[] = [
  {
    id: 'dsh_ulasan_gold',
    slug: 'dashboard-ulasan-gold',
    title: 'Dashboard Ulasan Gold',
    description_md: 'Visualisasi lapisan gold pipeline ETL ulasan — rating & distribusi sentimen.',
    visibility: 'private',
    pipeline_id: 'pl_etl_ulasan',
    owner_id: 'usr_01',
    layout: [],
    widgets: [
      {
        id: 'wdg_kpi_rating',
        kind: 'kpi',
        title: 'Total rating',
        query: { node: 'sink1', y: 'rating', agg: 'sum' },
      },
      {
        id: 'wdg_bar_sentimen',
        kind: 'bar',
        title: 'Rating per kategori',
        query: { node: 'sink1', x: 'kategori', y: 'rating', agg: 'avg' },
      },
      {
        id: 'wdg_table_sample',
        kind: 'table',
        title: 'Sampel baris',
        query: { node: 'sink1', columns: ['rating', 'text', 'kategori'], limit: 5 },
      },
      {
        id: 'wdg_pie_kategori',
        kind: 'pie',
        title: 'Distribusi kategori',
        query: { node: 'sink1', label: 'kategori', value: 'rating', agg: 'count' },
      },
    ],
  },
  {
    id: 'dsh_publik_demo',
    slug: 'dashboard-publik-demo',
    title: 'Demo Publik PSD',
    description_md: 'Contoh dashboard publik untuk komunitas — data ilustrasi dari gold terbaru.',
    visibility: 'public',
    pipeline_id: 'pl_etl_ulasan',
    owner_id: 'usr_01',
    layout: [],
    widgets: [
      {
        id: 'wdg_line_trend',
        kind: 'line',
        title: 'Tren rating',
        query: { node: 'sink1', x: 'bulan', y: 'rating', agg: 'avg' },
      },
    ],
  },
]

export function dashboardsForUser(userId: string | undefined): MockDashboard[] {
  if (!userId) return mockDashboards.filter((d) => d.visibility === 'public')
  return mockDashboards.filter((d) => d.owner_id === userId || d.visibility === 'public')
}

export function findMockDashboard(slug: string): MockDashboard | undefined {
  return mockDashboards.find((d) => d.slug === slug)
}

export function dashboardSummaryOf(d: MockDashboard): DashboardSummary {
  return {
    slug: d.slug,
    title: d.title,
    visibility: d.visibility,
    pipeline_id: d.pipeline_id ?? null,
  }
}

function goldNodeReady(node: string, pipelineId: string | null | undefined): boolean {
  if (!pipelineId || !node) return false
  const pl = mockPipelines.find((p) => p.id === pipelineId)
  if (!pl) return false
  const run = mockPipelineRuns.find((r) => r.pipeline_slug === pl.slug && r.status === 'done')
  return Boolean(run?.layers.gold?.some((g) => g.node === node))
}

export function mockWidgetData(
  widget: DashboardWidget,
  pipelineId: string | null | undefined,
): Record<string, unknown> {
  const node = String((widget.query as { node?: string }).node ?? '')
  if (!goldNodeReady(node, pipelineId)) {
    return { empty: true, reason: 'Belum ada run gold untuk node ini' }
  }

  const kind = widget.kind as WidgetKind
  if (kind === 'kpi') return { value: 4287 }
  if (kind === 'table') {
    return {
      rows: [
        { rating: 5, text: 'Produk bagus', kategori: 'elektronik' },
        { rating: 4, text: 'Pengiriman cepat', kategori: 'fashion' },
        { rating: 3, text: 'Cukup memuaskan', kategori: 'makanan' },
        { rating: 5, text: 'Sangat recommended', kategori: 'elektronik' },
        { rating: 2, text: 'Kemasan rusak', kategori: 'rumah tangga' },
      ],
    }
  }
  if (kind === 'bar' || kind === 'line') {
    return {
      points: [
        { x: 'elektronik', y: 4.6 },
        { x: 'fashion', y: 4.1 },
        { x: 'makanan', y: 3.8 },
        { x: 'rumah tangga', y: 3.5 },
      ],
    }
  }
  if (kind === 'pie') {
    return {
      slices: [
        { label: 'elektronik', value: 420 },
        { label: 'fashion', value: 310 },
        { label: 'makanan', value: 180 },
        { label: 'rumah tangga', value: 95 },
      ],
    }
  }
  if (kind === 'scatter') {
    return {
      points: [
        { x: 1, y: 2.1 },
        { x: 2, y: 3.4 },
        { x: 3, y: 3.9 },
        { x: 4, y: 4.2 },
        { x: 5, y: 4.8 },
      ],
    }
  }
  return { empty: true, reason: 'Jenis widget tidak dikenal' }
}
