export type IpyNbOutput = {
  output_type: string
  name?: string
  text?: string | string[]
  data?: Record<string, string>
  traceback?: string[]
  ename?: string
  evalue?: string
}

export type IpyNbCell = {
  cell_type: 'code' | 'markdown' | 'raw'
  source: string | string[]
  outputs?: IpyNbOutput[]
  metadata?: Record<string, unknown>
  execution_count?: number | null
}

export type IpyNb = {
  cells: IpyNbCell[]
  metadata: Record<string, unknown>
  nbformat: number
  nbformat_minor: number
}

export function cellSource(cell: IpyNbCell): string {
  return Array.isArray(cell.source) ? cell.source.join('') : cell.source
}

export function setCellSource(cell: IpyNbCell, text: string): IpyNbCell {
  return { ...cell, source: text }
}

export function outputText(outputs: IpyNbOutput[] | undefined): string {
  if (!outputs?.length) return ''
  return outputs
    .map((o) => {
      if (o.output_type === 'stream') {
        const t = o.text
        return Array.isArray(t) ? t.join('') : (t ?? '')
      }
      if (o.output_type === 'error') {
        return (o.traceback ?? []).join('\n')
      }
      if (o.output_type === 'execute_result' || o.output_type === 'display_data') {
        const plain = o.data?.['text/plain']
        return plain ?? ''
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
}
