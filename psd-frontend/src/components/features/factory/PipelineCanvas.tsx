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
import { useCallback, useEffect, useRef, useState } from 'react'
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

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const onSpecChangeRef = useRef(onSpecChange)
  const onSelectRef = useRef(onSelect)
  const selectedIdRef = useRef(selectedId)
  const liveSpecRef = useRef(liveSpec)
  const nodeErrorsRef = useRef(nodeErrors)

  nodesRef.current = nodes
  edgesRef.current = edges
  onSpecChangeRef.current = onSpecChange
  onSelectRef.current = onSelect
  selectedIdRef.current = selectedId
  liveSpecRef.current = liveSpec
  nodeErrorsRef.current = nodeErrors

  const syncOut = useCallback((n: Node<PsdNodeData>[], e: Edge[]) => {
    onSpecChangeRef.current(flowToSpec(n, e))
  }, [])

  useEffect(() => {
    const { nodes: n, edges: e } = specToFlow(initialSpec)
    setNodes(applyErrors(n, nodeErrorsRef.current))
    setEdges(e)
    requestAnimationFrame(() => fitView({ padding: 0.15, duration: 200 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineSlug, setNodes, setEdges, fitView])

  // Sinkronkan properti node dari liveSpec (panel properti) tanpa loop seleksi.
  useEffect(() => {
    const spec = liveSpecRef.current
    const errors = nodeErrorsRef.current
    setNodes((nds) => {
      const existingIds = new Set(nds.map((n) => n.id))
      let changed = false
      let result = [...nds]

      for (const sn of spec.nodes) {
        if (!existingIds.has(sn.id)) {
          const { nodes: added } = specToFlow({ nodes: [sn], edges: [] })
          const node = added[0]
          if (node) {
            result.push({
              ...node,
              data: { ...node.data, error: errors[sn.id] },
            })
            existingIds.add(sn.id)
            changed = true
          }
        }
      }

      result = result.map((n) => {
        const sn = spec.nodes.find((x) => x.id === n.id)
        if (!sn) return n
        const data = nodeDataFromSpec(sn, errors[n.id])
        if (!nodeDataChanged(n.data, data)) return n
        changed = true
        return { ...n, data }
      })

      return changed ? result : nds
    })
  }, [liveSpec, nodeErrors, setNodes])

  useEffect(() => {
    setEdges((eds) => {
      let changed = false
      const next = eds.map((e) => {
        const highlighted = highlightEdges?.has(`${e.source}->${e.target}`) ?? false
        if (!highlighted && !e.animated && e.style === undefined) return e
        if (highlighted === Boolean(e.animated) && !highlighted) return e
        changed = true
        return highlighted
          ? { ...e, animated: true, style: { stroke: '#6366f1', strokeWidth: 2.5 } }
          : { ...e, animated: false, style: undefined }
      })
      return changed ? next : eds
    })
  }, [highlightEdges, setEdges])

  const addNode = useCallback(
    (kind: PipelineNode['type'], op?: PipelineNode['op']) => {
      const id = newNodeId(kind === 'transform' ? 't' : kind.slice(0, 3))
      const count = nodesRef.current.length
      const newNode: Node<PsdNodeData> = {
        id,
        type: 'psdNode',
        position: { x: 80 + count * 40, y: 80 + (count % 3) * 100 },
        data: defaultNodeData(kind, op),
        selected: true,
      }
      const nextNodes = [...nodesRef.current.map((n) => ({ ...n, selected: false })), newNode]
      setNodes(nextNodes)
      syncOut(nextNodes, edgesRef.current)
      onSelectRef.current(id)
      return id
    },
    [setNodes, syncOut],
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      const nextNodes = nodesRef.current.filter((n) => n.id !== nodeId)
      const nextEdges = edgesRef.current.filter((e) => e.source !== nodeId && e.target !== nodeId)
      setNodes(nextNodes)
      setEdges(nextEdges)
      syncOut(nextNodes, nextEdges)
      if (selectedIdRef.current === nodeId) onSelectRef.current(null)
    },
    [setNodes, setEdges, syncOut],
  )

  const addNodeRef = useRef(addNode)
  const deleteNodeRef = useRef(deleteNode)
  addNodeRef.current = addNode
  deleteNodeRef.current = deleteNode

  useEffect(() => {
    registerAddNode?.((kind, op) => addNodeRef.current(kind, op))
  }, [registerAddNode])

  useEffect(() => {
    registerDeleteNode?.((nodeId) => deleteNodeRef.current(nodeId))
  }, [registerDeleteNode])

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((eds) => {
        const next = addEdge(conn, eds)
        syncOut(nodesRef.current, next)
        return next
      })
    },
    [setEdges, syncOut],
  )

  const onNodeDragStop = useCallback(() => {
    syncOut(nodesRef.current, edgesRef.current)
  }, [syncOut])

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    const next = sel[0]?.id ?? null
    if (next === selectedIdRef.current) return
    onSelectRef.current(next)
  }, [])

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
        onSelectionChange={onSelectionChange}
        onNodesDelete={(deleted) => {
          const ids = new Set(deleted.map((d) => d.id))
          setNodes((nds) => {
            const nextNodes = nds.filter((n) => !ids.has(n.id))
            setEdges((eds) => {
              const nextEdges = eds.filter((e) => !ids.has(e.source) && !ids.has(e.target))
              syncOut(nextNodes, nextEdges)
              return nextEdges
            })
            return nextNodes
          })
          if (deleted.some((d) => d.id === selectedIdRef.current)) onSelectRef.current(null)
        }}
        onEdgesDelete={(deleted) => {
          const ids = new Set(deleted.map((d) => d.id))
          setEdges((eds) => {
            const nextEdges = eds.filter((e) => !ids.has(e.id))
            syncOut(nodesRef.current, nextEdges)
            return nextEdges
          })
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
