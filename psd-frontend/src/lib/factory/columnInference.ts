import type { PipelineSpec } from '@/types/api'

export type ColumnDef = { name: string; type?: string }

function upstreamIds(spec: PipelineSpec, nodeId: string): string[] {
  return (spec.edges ?? []).filter((e) => e.target === nodeId).map((e) => e.source)
}

function inferOne(
  nodeId: string,
  spec: PipelineSpec,
  schemaBySourceId: Record<string, ColumnDef[]>,
  cache: Record<string, string[]>,
): string[] {
  if (cache[nodeId]) return cache[nodeId]
  const node = (spec.nodes ?? []).find((n) => n.id === nodeId)
  if (!node) return []

  if (node.type === 'source') {
    const sid = String(node.params?.source_id ?? '')
    const cols = (schemaBySourceId[sid] ?? []).map((c) => c.name)
    cache[nodeId] = cols
    return cols
  }

  const preds = upstreamIds(spec, nodeId)

  if (node.type === 'sink') {
    const cols = preds[0] ? inferOne(preds[0], spec, schemaBySourceId, cache) : []
    cache[nodeId] = cols
    return cols
  }

  let upstream: string[] = []
  if (node.op === 'join' && preds.length >= 2) {
    const left = inferOne(preds[0], spec, schemaBySourceId, cache)
    const right = inferOne(preds[1], spec, schemaBySourceId, cache)
    upstream = [...new Set([...left, ...right])]
  } else if (preds.length === 1) {
    upstream = inferOne(preds[0], spec, schemaBySourceId, cache)
  } else {
    upstream = [...new Set(preds.flatMap((p) => inferOne(p, spec, schemaBySourceId, cache)))]
  }

  let out = upstream
  const p = node.params ?? {}

  switch (node.op) {
    case 'select':
      out = (p.columns as string[] | undefined)?.length ? (p.columns as string[]) : upstream
      break
    case 'filter':
    case 'dedupe':
    case 'cast':
      out = upstream
      break
    case 'derive': {
      const name = String(p.name ?? '').trim()
      out = name ? [...upstream, name] : upstream
      break
    }
    case 'aggregate': {
      const gb = (p.group_by as string[] | undefined) ?? []
      const aggs = ((p.aggs as { col?: string; fn?: string; as?: string }[] | undefined) ?? []).map(
        (a) => a.as || `${a.fn ?? 'agg'}_${a.col ?? 'col'}`,
      )
      out = [...gb, ...aggs]
      break
    }
    default:
      out = upstream
  }

  cache[nodeId] = out
  return out
}

export function inferNodeColumns(
  nodeId: string,
  spec: PipelineSpec,
  schemaBySourceId: Record<string, ColumnDef[]>,
): string[] {
  return inferOne(nodeId, spec, schemaBySourceId, {})
}

export function buildColumnsByNode(
  spec: PipelineSpec,
  schemaBySourceId: Record<string, ColumnDef[]>,
): Record<string, string[]> {
  const cache: Record<string, string[]> = {}
  for (const n of spec.nodes ?? []) {
    inferOne(n.id, spec, schemaBySourceId, cache)
  }
  return cache
}

export function validateDeriveExpr(expr: string, allowedCols: string[]): string | null {
  const trimmed = expr.trim()
  if (!trimmed) return 'Ekspresi kosong'
  if (!/^[0-9a-zA-Z_+\-*/().\s]+$/.test(trimmed)) return 'Karakter tidak diizinkan'
  const tokens = trimmed.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? []
  for (const t of tokens) {
    if (allowedCols.length && !allowedCols.includes(t) && !['true', 'false', 'null'].includes(t)) {
      return `Kolom '${t}' tidak dikenal`
    }
  }
  return null
}

export function upstreamColumnOptions(nodeId: string, spec: PipelineSpec, columnsByNode: Record<string, string[]>) {
  const preds = upstreamIds(spec, nodeId)
  const node = (spec.nodes ?? []).find((n) => n.id === nodeId)
  if (node?.op === 'join' && preds.length >= 2) {
    return {
      single: [] as string[],
      left: columnsByNode[preds[0]] ?? [],
      right: columnsByNode[preds[1]] ?? [],
    }
  }
  return {
    single: preds[0] ? (columnsByNode[preds[0]] ?? []) : [],
    left: [] as string[],
    right: [] as string[],
  }
}
