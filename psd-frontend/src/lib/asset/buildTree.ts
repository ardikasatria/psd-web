export type TreeNode = {
  name: string
  type: 'file' | 'dir'
  path?: string
  children?: TreeNode[]
}

export function buildTree(paths: string[]): TreeNode[] {
  const root: Record<string, { name: string; type: 'file' | 'dir'; children: Record<string, unknown> }> = {}

  for (const p of paths) {
    const parts = p.split('/').filter(Boolean)
    let cur = root
    parts.forEach((part, i) => {
      const last = i === parts.length - 1
      if (!cur[part]) {
        cur[part] = { name: part, type: last ? 'file' : 'dir', children: {} }
      }
      const entry = cur[part]
      if (!last) {
        entry.type = 'dir'
        cur = entry.children as typeof root
      }
    })
  }

  function toList(d: typeof root, prefix = ''): TreeNode[] {
    const items: TreeNode[] = []
    for (const v of Object.values(d)) {
      const path = prefix ? `${prefix}/${v.name}` : v.name
      const node: TreeNode = { name: v.name, type: v.type, path: v.type === 'file' ? path : undefined }
      if (v.type === 'dir') {
        node.children = toList(v.children as typeof root, path)
        node.path = path
      }
      items.push(node)
    }
    items.sort((a, b) => {
      const ad = a.type === 'dir' ? 0 : 1
      const bd = b.type === 'dir' ? 0 : 1
      if (ad !== bd) return ad - bd
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    })
    return items
  }

  return toList(root)
}
