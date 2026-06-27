import { getRun, listPipelines, listRuns } from '@/lib/api/factory'
import type { DataSource, PipelineSpec } from '@/types/api'

export type GoldNode = { node: string; rows: number }

/** Resolve pipeline slug from internal id. */
export async function pipelineSlugFromId(pipelineId: string): Promise<string | null> {
  const res = await listPipelines({ page: 1 })
  const match = res.items.find((p) => p.id === pipelineId)
  return match?.slug ?? null
}

/** Gold sink nodes from the latest successful run. */
export async function fetchGoldNodes(pipelineId: string | null | undefined): Promise<GoldNode[]> {
  if (!pipelineId) return []
  const slug = await pipelineSlugFromId(pipelineId)
  if (!slug) return []
  const runs = await listRuns(slug)
  const done = runs.items.find((r) => r.status === 'done')
  if (!done) return []
  const detail = await getRun(slug, done.id)
  return (detail.layers?.gold ?? []).map((g) => ({ node: g.node, rows: g.rows }))
}

export function pipelineUsesSynthesis(spec: PipelineSpec | undefined, sources: DataSource[]): boolean {
  if (!spec) return false
  const ids = spec.nodes
    .filter((n) => n.type === 'source')
    .map((n) => n.params?.source_id as string | undefined)
    .filter(Boolean) as string[]
  return ids.some((id) => {
    const s = sources.find((x) => x.id === id)
    return Boolean(s?.uri?.includes('synthesis') || s?.kind === 'synthesis')
  })
}

/** Demo / mock column hints when schema metadata is unavailable. */
export const GOLD_COLUMN_HINTS = ['rating', 'text', 'kategori', 'bulan', 'sentimen', 'jumlah'] as const
