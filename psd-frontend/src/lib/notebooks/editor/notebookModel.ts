// Model notebook murni — logika teruji, tanpa dependensi UI.

export type CellType = 'code' | 'markdown'

export type NbCell = {
  id: string
  type: CellType
  source: string
  outputs: NbOutput[]
  execution_count: number | null
}

export type NbOutput = {
  output_type: string
  name?: string
  text?: string | string[]
  data?: Record<string, string>
  traceback?: string[]
  ename?: string
  evalue?: string
  metadata?: Record<string, unknown>
  execution_count?: number | null
}

export type Notebook = {
  cells: NbCell[]
  metadata: Record<string, unknown>
  nbformat: number
  nbformat_minor: number
}

let _seq = 0
export function genId() {
  return 'c' + Date.now().toString(36) + (_seq++).toString(36)
}

export function newCell(type: CellType = 'code', source = ''): NbCell {
  return { id: genId(), type, source, outputs: [], execution_count: null }
}

export function createNotebook(): Notebook {
  return {
    cells: [newCell('code', '')],
    metadata: {
      kernelspec: { display_name: 'Python (Pyodide)', language: 'python', name: 'python3' },
      language_info: { name: 'python' },
    },
    nbformat: 4,
    nbformat_minor: 5,
  }
}

export function addCell(nb: Notebook, { type = 'code', index = null, source = '' }: { type?: CellType; index?: number | null; source?: string } = {}) {
  const cells = [...nb.cells]
  const at = index == null ? cells.length : Math.max(0, Math.min(index, cells.length))
  cells.splice(at, 0, newCell(type, source))
  return { ...nb, cells }
}

export function deleteCell(nb: Notebook, id: string) {
  const cells = nb.cells.filter((c) => c.id !== id)
  return { ...nb, cells: cells.length ? cells : [newCell('code', '')] }
}

export function moveCell(nb: Notebook, id: string, dir: 'up' | 'down') {
  const i = nb.cells.findIndex((c) => c.id === id)
  if (i < 0) return nb
  const j = dir === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= nb.cells.length) return nb
  const cells = [...nb.cells]
  ;[cells[i], cells[j]] = [cells[j], cells[i]]
  return { ...nb, cells }
}

export function changeCellType(nb: Notebook, id: string, type: CellType) {
  return {
    ...nb,
    cells: nb.cells.map((c) =>
      c.id === id ? { ...c, type, outputs: type === 'markdown' ? [] : c.outputs } : c,
    ),
  }
}

export function setCellSource(nb: Notebook, id: string, source: string) {
  return { ...nb, cells: nb.cells.map((c) => (c.id === id ? { ...c, source } : c)) }
}

export function setCellResult(
  nb: Notebook,
  id: string,
  { outputs = [], execution_count = null }: { outputs?: NbOutput[]; execution_count?: number | null } = {},
) {
  return {
    ...nb,
    cells: nb.cells.map((c) => (c.id === id ? { ...c, outputs, execution_count } : c)),
  }
}

export function toSource(s: string) {
  return s && s.length ? (s.match(/[^\n]*\n|[^\n]+$/g) ?? []) : []
}

export function fromSource(src: string | string[]) {
  return Array.isArray(src) ? src.join('') : src || ''
}

export function toIpynb(nb: Notebook) {
  return {
    cells: nb.cells.map((c) => {
      const base: Record<string, unknown> = {
        cell_type: c.type,
        id: c.id,
        metadata: {},
        source: toSource(c.source),
      }
      if (c.type === 'code') {
        base.execution_count = c.execution_count ?? null
        base.outputs = c.outputs ?? []
      }
      return base
    }),
    metadata: nb.metadata ?? {},
    nbformat: 4,
    nbformat_minor: 5,
  }
}

export function fromIpynb(ip: {
  cells?: Array<{
    id?: string
    cell_type?: string
    source?: string | string[]
    outputs?: NbOutput[]
    execution_count?: number | null
  }>
  metadata?: Record<string, unknown>
  nbformat?: number
  nbformat_minor?: number
}) {
  return {
    cells: (ip.cells || []).map((c) => ({
      id: c.id || genId(),
      type: (c.cell_type === 'markdown' ? 'markdown' : 'code') as CellType,
      source: fromSource(c.source ?? ''),
      outputs: c.outputs || [],
      execution_count: c.execution_count ?? null,
    })),
    metadata: ip.metadata || {},
    nbformat: ip.nbformat || 4,
    nbformat_minor: ip.nbformat_minor || 5,
  }
}
