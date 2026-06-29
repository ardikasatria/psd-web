const CARD_HIGHLIGHT = [
  'license',
  'tags',
  'language',
  'datasets',
  'metrics',
  'library_name',
  'pipeline_tag',
  'task_categories',
] as const

function parseSimpleYaml(block: string): Record<string, unknown> {
  const meta: Record<string, unknown> = {}
  let currentKey: string | null = null
  let list: string[] | null = null

  for (const raw of block.split('\n')) {
    const line = raw.trimEnd()
    if (line.trim().startsWith('- ') && currentKey && list) {
      list.push(line.trim().slice(2).trim())
      continue
    }
    const m = line.match(/^([\w_-]+):\s*(.*)$/)
    if (!m) continue
    if (list && currentKey) meta[currentKey] = list
    currentKey = m[1]
    const val = m[2].trim()
    if (val === '') {
      list = []
      continue
    }
    list = null
    meta[currentKey] = val.replace(/^["']|["']$/g, '')
  }
  if (list && currentKey) meta[currentKey] = list
  return meta
}

export function parseFrontMatter(text: string): { meta: Record<string, unknown>; body: string } {
  if (!text?.trimStart().startsWith('---')) return { meta: {}, body: text || '' }
  const stripped = text.trimStart()
  const lines = stripped.split('\n')
  if (lines[0].trim() !== '---') return { meta: {}, body: text }
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (end === -1) return { meta: {}, body: text }
  const meta = parseSimpleYaml(lines.slice(1, end).join('\n'))
  const body = lines
    .slice(end + 1)
    .join('\n')
    .replace(/^\n+/, '')
  return { meta, body }
}

export function cardSummary(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of CARD_HIGHLIGHT) {
    if (k in meta) out[k] = meta[k]
  }
  return out
}
