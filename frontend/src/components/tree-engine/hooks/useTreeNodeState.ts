import { useState, useCallback, useMemo } from 'react'
import { getHiddenDescendantIds, getDescendantIds } from '@/lib/treeCollapse'
import type { TreeNode, TreeEdge } from '@/types'
import { useLineageHighlight } from '@/hooks/useLineageHighlight'

export interface TreeNodeState {
  collapsedIds: Set<number>
  selectedNodeIds: Set<number>
  highlightedMemberId: number | null
  toggleCollapse: (id: number) => void
  setSelectedNodeIds: (ids: Set<number>) => void
  setHighlightedMemberId: (id: number | null) => void
  hiddenIds: Set<number>
  hiddenCountByRoot: Map<number, number>
  parentEdges: TreeEdge[]
  lineage: ReturnType<typeof useLineageHighlight>
}

export function useTreeNodeState(
  treeData: { nodes: TreeNode[]; edges: TreeEdge[] } | null,
  highlightedMemberId: number | null,
  setHighlightedMemberId: (id: number | null) => void,
): TreeNodeState {
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(() => new Set())
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<number>>(new Set())

  const toggleCollapse = useCallback((memberId: number) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }, [])

  const parentEdges = useMemo(
    () => (treeData?.edges ?? []).filter(e => e.type === 'parent'),
    [treeData],
  )

  const hiddenDescendants = useMemo(
    () => getHiddenDescendantIds(collapsedIds, parentEdges),
    [collapsedIds, parentEdges],
  )

  const hiddenIds = useMemo(
    () => new Set<number>([...collapsedIds, ...hiddenDescendants]),
    [collapsedIds, hiddenDescendants],
  )

  const hiddenCountByRoot = useMemo(() => {
    const map = new Map<number, number>()
    for (const rootId of collapsedIds) {
      map.set(rootId, getDescendantIds(rootId, parentEdges).length)
    }
    return map
  }, [collapsedIds, parentEdges])

  const hasChildren = useMemo(() => {
    const s = new Set<number>()
    for (const e of parentEdges) s.add(e.source)
    return s
  }, [parentEdges])

  return {
    collapsedIds,
    selectedNodeIds,
    highlightedMemberId,
    toggleCollapse,
    setSelectedNodeIds,
    setHighlightedMemberId,
    hiddenIds,
    hiddenCountByRoot,
    parentEdges,
    lineage: null as any,
  }
}
