import { useMemo } from 'react'
import dagre from '@dagrejs/dagre'
import type { TreeNode, FamilyTree } from '@/types'

export const NODE_HEIGHT = 90
export const NODE_WIDTH_MIN = 140

function measureTextWidth(text: string, fontSize = '13px'): number {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return text.length * 8
  ctx.font = `${fontSize} sans-serif`
  return ctx.measureText(text).width
}

function getNodeWidth(member: TreeNode): number {
  const texts = [member.name, member.courtesy_name, member.art_name, member.posthumous_name].filter(Boolean) as string[]
  const maxW = texts.length > 0 ? Math.max(...texts.map(t => measureTextWidth(t))) : 40
  return Math.max(NODE_WIDTH_MIN, maxW + 48)
}

export function getGenerationColor(generation: number | null): string {
  const gen = generation || 1
  const step = 6
  const lightness = Math.min(30 + gen * step, 85)
  return `hsl(145, 45%, ${lightness}%)`
}

function getCoupleNodeWidth(husband: TreeNode, wife: TreeNode | null): number {
  return getNodeWidth(husband) + (wife ? getNodeWidth(wife) : 80) + 32
}

export interface CoupleInfo {
  byRep: Map<number, { husband: TreeNode; wife: TreeNode | null; childrenIds: number[] }>
  inCouple: Set<number>
}

export type LayoutMode = 'tree' | 'fan' | 'hanging'

export interface DagreLayoutResult {
  dagrePositions: Map<number, { x: number; y: number }>
  dagreNodeWidthMap: Map<number, number>
  coupleInfo: CoupleInfo
}

function findCoupleRep(memberId: number, byRep: CoupleInfo['byRep']): number {
  for (const [repId, c] of byRep) {
    if (c.husband.id === memberId) return repId
    if (c.wife?.id === memberId) return repId
  }
  return memberId
}

export function useTreeLayout(treeData: FamilyTree | null, layoutMode: LayoutMode = 'tree'): DagreLayoutResult {
  const coupleInfo = useMemo<CoupleInfo>(() => {
    const byRep = new Map<number, { husband: TreeNode; wife: TreeNode | null; childrenIds: number[] }>()
    const inCouple = new Set<number>()
    if (treeData?.couples && treeData.nodes) {
      for (const c of treeData.couples) {
        const husband = treeData.nodes.find(n => n.id === c.husband_id)
        if (!husband) continue
        const wife = c.wife_id ? treeData.nodes.find(n => n.id === c.wife_id) ?? null : null
        byRep.set(c.husband_id, { husband, wife, childrenIds: c.children })
        inCouple.add(c.husband_id)
        if (c.wife_id) inCouple.add(c.wife_id)
      }
    }
    return { byRep, inCouple }
  }, [treeData])

  const dagreNodeWidthMap = useMemo<Map<number, number>>(() => {
    const map = new Map<number, number>()
    if (!treeData?.nodes) return map
    for (const node of treeData.nodes) {
      if (coupleInfo.inCouple.has(node.id)) continue
      map.set(node.id, getNodeWidth(node))
    }
    for (const [repId, c] of coupleInfo.byRep) {
      map.set(repId, getCoupleNodeWidth(c.husband, c.wife))
    }
    return map
  }, [treeData, coupleInfo])

  const dagrePositions = useMemo<Map<number, { x: number; y: number }>>(() => {
    if (!treeData || treeData.nodes.length === 0) return new Map()
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 120 })

    const parentEdges = treeData.edges.filter(e => e.type === 'parent')
    for (const node of treeData.nodes) {
      if (coupleInfo.inCouple.has(node.id)) continue
      g.setNode(String(node.id), {
        width: dagreNodeWidthMap.get(node.id) ?? NODE_WIDTH_MIN,
        height: NODE_HEIGHT,
        rank: node.generation || 999,
      })
    }
    for (const repId of coupleInfo.byRep.keys()) {
      const first = treeData.nodes.find(n => n.id === repId)
      g.setNode(String(repId), {
        width: dagreNodeWidthMap.get(repId) ?? NODE_WIDTH_MIN * 2,
        height: NODE_HEIGHT + 16,
        rank: first?.generation || 999,
      })
    }
    for (const edge of parentEdges) {
      const source = coupleInfo.inCouple.has(edge.source)
        ? (coupleInfo.byRep.has(edge.source) ? edge.source : findCoupleRep(edge.source, coupleInfo.byRep))
        : edge.source
      g.setEdge(String(source), String(edge.target))
    }

    dagre.layout(g)
    const positions = new Map<number, { x: number; y: number }>()
    for (const node of treeData.nodes) {
      if (coupleInfo.inCouple.has(node.id)) continue
      const p = g.node(String(node.id)) as { x: number; y: number } | undefined
      if (p) positions.set(node.id, { x: p.x, y: p.y })
    }
    for (const repId of coupleInfo.byRep.keys()) {
      const p = g.node(String(repId)) as { x: number; y: number } | undefined
      if (p) positions.set(repId, { x: p.x, y: p.y })
    }
    return positions
  }, [treeData, coupleInfo, dagreNodeWidthMap])

  return { dagrePositions, dagreNodeWidthMap, coupleInfo }
}
