'use client'

import { psdNodeTypes } from '@/components/features/factory/nodes/PsdNode'
import { defaultNodeData, flowToSpec, newNodeId, specToFlow, type PsdNodeData } from '@/lib/factory/specFlow'
import type { PipelineNode, PipelineSpec } from '@/types/api'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'

type Props = {
  pipelineSlug: string
  initialSpec: PipelineSpec
  liveSpec: PipelineSpec
  onSpecChange: (spec: PipelineSpec) => void
  selectedId: string | null
  onSelect: (id: string | null) => void
  nodeErrors: Record<string, string>
  highlightEdges?: Set<string>
  registerAddNode?: (fn: (kind: PipelineNode['type'], op?: PipelineNode['op']) => string) => void
  registerDeleteNode?: (fn: (nodeId: string) => void) => void
  className?: string
}

function useColorMode(): 'light' | 'dark' {
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setMode(root.classList.contains('dark') ? 'dark' : 'light')
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return mode
}

function applyErrors(nodes: Node<PsdNodeData>[], nodeErrors: Record<string, string>) {
  return nodes.map((n) => ({ ...n, data: { ...n.data, error: nodeErrors[n.id] } }))
}

function applyEdgeHighlight(edges: Edge[], highlightEdges?: Set<string>) {
  return edges.map((e) => ({
    ...e,
    animated: highlightEdges?.has(`${e.source}->${e.target}`),
    style: highlightEdges?.has(`${e.source}->${e.target}`)
      ? { stroke: '#6366f1', strokeWidth: 2.5 }
      : undefined,
  }))
}

function nodeDataFromSpec(sn: PipelineNode, error?: string): PsdNodeData {
  return {
    kind: sn.type,
    op: sn.op,
    layer: sn.layer,
    params: (sn.params ?? {}) as Record<string, unknown>,
    error,
  }
}

function nodeDataChanged(a: PsdNodeData, b: PsdNodeData) {
  return (
    a.kind !== b.kind ||
    a.op !== b.op ||
    a.layer !== b.layer ||
    a.error !== b.error ||
    JSON.stringify(a.params) !== JSON.stringify(b.params)
  )
}

function CanvasInner({
  pipelineSlug,
  initialSpec,
  liveSpec,
  onSpecChange,
  selectedId,
  onSelect,
  nodeErrors,
  highlightEdges,
  registerAddNode,
  registerDeleteNode,
  className,
}: Props) {
  const colorMode = useColorMode()
  const { fitView } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<PsdNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const syncOut = useCallback(
    (n: Node<PsdNodeData>[], e: Edge[]) => {
      onSpecChange(flowToSpec(n, e))
    },
    [onSpecChange],
  )

  useEffect(() => {
    const { nodes: n, edges: e } = specToFlow(initialSpec)
    setNodes(applyErrors(n, nodeErrors))
    setEdges(applyEdgeHighlight(e, highlightEdges))
    requestAnimationFrame(() => fitView({ padding: 0.15, duration: 200 }))
    // Reset kanvas hanya saat pindah pipeline, bukan tiap refetch API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineSlug, setNodes, setEdges, fitView])

  useEffect(() => {
    setNodes((nds) => {
      let changed = false
      const next = nds.map((n) => {
        const sn = liveSpec.nodes.find((x) => x.id === n.id)
        if (!sn) return n
        const data = nodeDataFromSpec(sn, nodeErrors[n.id])
        if (!nodeDataChanged(n.data, data)) return n
        changed = true
        return { ...n, data }
      })
      return changed ? next : nds
    })
  }, [liveSpec, nodeErrors, setNodes])

  useEffect(() => {
    setNodes((nds) => {
      const needs = nds.some((n) => Boolean(n.selected) !== (n.id === selectedId))
      if (!needs) return nds
      return nds.map((n) => ({ ...n, selected: n.id === selectedId }))
    })
  }, [selectedId, setNodes])

  useEffect(() => {
    setEdges((eds) => applyEdgeHighlight(eds, highlightEdges))
  }, [highlightEdges, setEdges])

  const addNode = useCallback(
    (kind: PipelineNode['type'], op?: PipelineNode['op']) => {
      const id = newNodeId(kind === 'transform' ? 't' : kind.slice(0, 3))
      const newNode: Node<PsdNodeData> = {
        id,
        type: 'psdNode',
        position: { x: 80 + nodes.length * 40, y: 80 + (nodes.length % 3) * 100 },
        data: defaultNodeData(kind, op),
      }
      const nextNodes = [...nodes, newNode]
      setNodes(nextNodes)
      syncOut(nextNodes, edges)
      onSelect(id)
      return id
    },
    [nodes, edges, setNodes, syncOut, onSelect],
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      const nextNodes = nodes.filter((n) => n.id !== nodeId)
      const nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
      setNodes(nextNodes)
      setEdges(nextEdges)
      syncOut(nextNodes, nextEdges)
      if (selectedId === nodeId) onSelect(null)
    },
    [nodes, edges, setNodes, setEdges, syncOut, selectedId, onSelect],
  )

  useEffect(() => {
    registerAddNode?.(addNode)
  }, [addNode, registerAddNode])

  useEffect(() => {
    registerDeleteNode?.(deleteNode)
  }, [deleteNode, registerDeleteNode])

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((eds) => {
        const next = addEdge(conn, eds)
        syncOut(nodes, next)
        return next
      })
    },
    [nodes, syncOut, setEdges],
  )

  const onNodeDragStop = useCallback(() => {
    syncOut(nodes, edges)
  }, [nodes, edges, syncOut])

  return (
    <div
      className={clsx(
        'h-[min(420px,calc(100dvh-15rem))] min-w-0 flex-1 overflow-hidden rounded-2xl border border-neutral-200/80 sm:h-[min(480px,calc(100dvh-13rem))] xl:h-[520px] dark:border-neutral-700',
        className,
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={({ nodes: sel }) => {
          const next = sel[0]?.id ?? null
          if (next !== selectedId) onSelect(next)
        }}
        nodesDeletable
        onNodesDelete={(deleted) => {
          const ids = new Set(deleted.map((d) => d.id))
          const nextNodes = nodes.filter((n) => !ids.has(n.id))
          const nextEdges = edges.filter((e) => !ids.has(e.source) && !ids.has(e.target))
          setNodes(nextNodes)
          setEdges(nextEdges)
          syncOut(nextNodes, nextEdges)
          if (deleted.some((d) => d.id === selectedId)) onSelect(null)
        }}
        onEdgesDelete={(deleted) => {
          const ids = new Set(deleted.map((d) => d.id))
          const nextEdges = edges.filter((e) => !ids.has(e.id))
          setEdges(nextEdges)
          syncOut(nodes, nextEdges)
        }}
        nodeTypes={psdNodeTypes}
        colorMode={colorMode}
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-neutral-50 dark:bg-neutral-900/80"
      >
        <Background gap={16} />
        <Controls className="!border-neutral-200 !bg-white dark:!border-neutral-600 dark:!bg-neutral-800 [&>button]:!min-h-9 [&>button]:!min-w-9" />
        <MiniMap
          className="!hidden !border-neutral-200 sm:!block dark:!border-neutral-600 dark:!bg-neutral-800"
          nodeColor={(n) => {
            const layer = (n.data as PsdNodeData)?.layer
            if (layer === 'gold') return '#eab308'
            if (layer === 'silver') return '#94a3b8'
            if (layer === 'bronze') return '#f59e0b'
            return '#6366f1'
          }}
        />
      </ReactFlow>
    </div>
  )
}

export function PipelineCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}
