/** Mirror backend validate.py for MSW & client preview */
import type { PipelineSpec } from '@/types/api'

const NODE_TYPES = new Set(['source', 'transform', 'sink'])
const TRANSFORM_OPS = new Set([
  'select',
  'filter',
  'join',
  'aggregate',
  'cast',
  'derive',
  'dedupe',
  'sql',
  'pyspark',
])
const LAYERS = new Set<string | null | undefined>([undefined, null, 'bronze', 'silver', 'gold'])

export function validatePipelineSpec(spec: PipelineSpec, maxNodes: number): string[] {
  const errors: string[] = []
  const nodes = spec.nodes ?? []
  const edges = spec.edges ?? []
  const ids = nodes.map((n) => n.id)

  if (nodes.length > maxNodes) {
    errors.push(`Jumlah node (${nodes.length}) melebihi batas tier (${maxNodes})`)
  }
  if (ids.length !== new Set(ids).size) {
    errors.push('Terdapat ID node duplikat')
  }
  const idset = new Set(ids)

  for (const n of nodes) {
    const nid = n.id
    const t = n.type
    if (!NODE_TYPES.has(t)) errors.push(`Tipe node tidak dikenal pada '${nid}'`)
    if (t === 'transform' && n.op && !TRANSFORM_OPS.has(n.op)) {
      errors.push(`Operasi transform tidak dikenal pada '${nid}'`)
    }
    if (!LAYERS.has(n.layer ?? null)) errors.push(`Lapisan tidak valid pada '${nid}'`)
    if (t === 'transform' && n.op === 'sql' && !(n.params?.query as string | undefined)?.trim()) {
      errors.push(`Node SQL kosong pada '${nid}'`)
    }
    if (t === 'transform' && n.op === 'pyspark' && !(n.params?.code as string | undefined)?.trim()) {
      errors.push(`Node PySpark kosong pada '${nid}'`)
    }
    if (t === 'source' && !(n.params?.source_id)) {
      errors.push(`Node source tanpa source_id pada '${nid}'`)
    }
  }

  const indeg: Record<string, number> = Object.fromEntries(ids.map((i) => [i, 0]))
  const adj: Record<string, string[]> = Object.fromEntries(ids.map((i) => [i, []]))
  for (const e of edges) {
    const s = e.source
    const t = e.target
    if (!idset.has(s) || !idset.has(t)) {
      errors.push('Edge menunjuk node yang tidak ada')
      continue
    }
    adj[s].push(t)
    indeg[t] += 1
  }

  for (const n of nodes) {
    const nid = n.id
    const t = n.type
    if (t === 'source' && (indeg[nid] ?? 0) > 0) {
      errors.push(`Node source tidak boleh memiliki input: '${nid}'`)
    }
    if (t !== 'source' && nodes.length > 1 && (indeg[nid] ?? 0) === 0) {
      errors.push(`Node tanpa input: '${nid}'`)
    }
    if (n.op === 'join' && (indeg[nid] ?? 0) < 2) {
      errors.push(`Operasi join membutuhkan 2 input: '${nid}'`)
    }
  }

  const ind = { ...indeg }
  const queue = ids.filter((i) => ind[i] === 0)
  let seen = 0
  while (queue.length) {
    const x = queue.shift()!
    seen += 1
    for (const y of adj[x]) {
      ind[y] -= 1
      if (ind[y] === 0) queue.push(y)
    }
  }
  if (seen !== ids.length) {
    errors.push('Graf memiliki siklus — pipeline harus DAG (asiklik)')
  }
  return errors
}

export const DEFAULT_MAX_NODES = 15

export function summarizeSpec(spec: PipelineSpec) {
  const byType: Record<string, number> = {}
  const byLayer: Record<string, number> = {}
  for (const n of spec.nodes ?? []) {
    byType[n.type] = (byType[n.type] ?? 0) + 1
    const layer = n.layer ?? '—'
    byLayer[layer] = (byLayer[layer] ?? 0) + 1
  }
  return { byType, byLayer, total: spec.nodes?.length ?? 0 }
}
