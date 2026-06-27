import type { PipelineNode, PipelineSpec } from '@/types/api'
import type { Edge, Node } from '@xyflow/react'

export type PsdNodeData = {
  kind: PipelineNode['type']
  op?: PipelineNode['op']
  layer?: PipelineNode['layer']
  params: Record<string, unknown>
  error?: string
}

const TRANSFORM_OPS: PipelineNode['op'][] = ['select', 'filter', 'join', 'aggregate', 'cast', 'derive', 'dedupe']

export function specToFlow(spec: PipelineSpec): { nodes: Node<PsdNodeData>[]; edges: Edge[] } {
  const nodes = (spec.nodes ?? []).map((n, i) => ({
    id: n.id,
    type: 'psdNode',
    position: n.position ?? { x: 80 + (i % 4) * 180, y: 60 + Math.floor(i / 4) * 130 },
    data: {
      kind: n.type,
      op: n.op,
      layer: n.layer,
      params: (n.params ?? {}) as Record<string, unknown>,
    },
  }))
  const edges = (spec.edges ?? []).map((e, i) => ({
    id: `e-${e.source}-${e.target}-${i}`,
    source: e.source,
    target: e.target,
  }))
  return { nodes, edges }
}

export function flowToSpec(nodes: Node<PsdNodeData>[], edges: Edge[]): PipelineSpec {
  return {
    nodes: nodes.map((n) => {
      const base: PipelineNode = {
        id: n.id,
        type: n.data.kind,
        params: n.data.params ?? {},
        position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      }
      if (n.data.kind === 'transform' && n.data.op) base.op = n.data.op
      if (n.data.layer !== undefined) base.layer = n.data.layer
      return base
    }),
    edges: edges.map((e) => ({ source: e.source, target: e.target })),
  }
}

export function errorsByNodeId(errors: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const err of errors) {
    const m = err.match(/'([^']+)'/)
    if (m) map[m[1]] = err
  }
  return map
}

export function newNodeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

export function defaultNodeData(kind: PipelineNode['type'], op?: PipelineNode['op']): PsdNodeData {
  if (kind === 'source') {
    return { kind, layer: 'bronze', params: {} }
  }
  if (kind === 'sink') {
    return { kind, layer: 'gold', params: { format: 'parquet' } }
  }
  const transformOp = op ?? 'select'
  const params: Record<string, unknown> = {}
  if (transformOp === 'select') params.columns = []
  if (transformOp === 'filter') params.col = ''
  if (transformOp === 'join') params.how = 'inner'
  if (transformOp === 'aggregate') {
    params.group_by = []
    params.aggs = []
  }
  if (transformOp === 'cast') params.casts = []
  if (transformOp === 'derive') {
    params.name = ''
    params.expr = ''
  }
  return { kind: 'transform', op: transformOp, layer: 'silver', params }
}

export { TRANSFORM_OPS }
