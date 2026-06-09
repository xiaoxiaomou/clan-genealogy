import type { TreeEdge } from '@/types'

/**
 * 计算指定节点的所有后代节点 ID（不含自身）
 * 通过沿 parent 边（source=父, target=子）递归遍历实现。
 *
 * @param rootId 起始节点 ID
 * @param edges  全部边集合（应只包含 parent 类型）
 * @returns 后代 ID 数组（不保证顺序）
 */
export function getDescendantIds(rootId: number, edges: TreeEdge[]): number[] {
  const result: number[] = []
  const visited = new Set<number>()

  // 邻接表：parentId -> childIds
  const childrenByParent = new Map<number, number[]>()
  for (const e of edges) {
    if (e.type !== 'parent') continue
    const list = childrenByParent.get(e.source) ?? []
    list.push(e.target)
    childrenByParent.set(e.source, list)
  }

  const stack: number[] = [rootId]
  while (stack.length) {
    const cur = stack.pop()!
    if (visited.has(cur)) continue
    visited.add(cur)
    // 不要把根节点自己加进去
    if (cur !== rootId) result.push(cur)
    const children = childrenByParent.get(cur)
    if (children && children.length) {
      for (const c of children) stack.push(c)
    }
  }
  return result
}

/**
 * 给定一组已折叠的根 ID 集合，计算所有应隐藏的 ID（所有折叠根节点的后代）。
 * 使用并查集风格：BFS 收集后代即可，天然无环（族谱树是 DAG）。
 */
export function getHiddenDescendantIds(
  collapsedRootIds: Set<number>,
  edges: TreeEdge[],
): Set<number> {
  const hidden = new Set<number>()
  if (collapsedRootIds.size === 0) return hidden

  // 构建 parent -> children 邻接表（parent edges only）
  const childrenByParent = new Map<number, number[]>()
  for (const e of edges) {
    if (e.type !== 'parent') continue
    const list = childrenByParent.get(e.source) ?? []
    list.push(e.target)
    childrenByParent.set(e.source, list)
  }

  for (const rootId of collapsedRootIds) {
    const stack: number[] = [rootId]
    while (stack.length) {
      const cur = stack.pop()!
      const children = childrenByParent.get(cur)
      if (!children) continue
      for (const c of children) {
        if (!hidden.has(c)) {
          hidden.add(c)
          stack.push(c)
        }
      }
    }
  }
  return hidden
}
