/** Max nesting depth: top-level comment + one level of replies (Facebook-style). */
export const NESTED_REPLY_MAX_DEPTH = 2

export type Nestable = {
  id: string
  parent_id?: string | null
}

export type NestedItem<T extends Nestable> = T & { children: NestedItem<T>[] }

export function buildNestedTree<T extends Nestable>(items: T[]): NestedItem<T>[] {
  const map = new Map<string, NestedItem<T>>()
  for (const item of items) {
    map.set(item.id, { ...item, children: [] })
  }
  const roots: NestedItem<T>[] = []
  for (const item of items) {
    const node = map.get(item.id)!
    const parentId = item.parent_id
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export function countAllNested<T extends Nestable>(items: T[]): number {
  return items.length
}
