import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useReactFlow,
  useViewport,
} from '@xyflow/react'
import type { TreeNode, FamilyTree } from '@/types'
import { api } from '@/lib/api'
import { useTreeFocus, useAutoFocusNode } from '@/hooks/useTreeFocus'
import { useTreeSearch } from '@/hooks/useTreeSearch'
import { GenerationRuler } from '@/components/tree/GenerationRuler'
import { LineageToolbar } from '@/components/tree/LineageToolbar'
import { TreeSearchPalette } from '@/components/tree/TreeSearchPalette'
import { PersonNode, type PersonNodeData } from './nodes/PersonNode'
import { CoupleNode, type CoupleNodeData } from './nodes/CoupleNode'
import { FamilyEdge, type FamilyEdgeData } from './edges/FamilyEdge'
import { useTreeLayout, NODE_HEIGHT } from './hooks/useTreeLayout'
import './FamilyTreeEngine.css'

export type LayoutMode = 'tree'

const HIGHLIGHT_COLORS = {
  up: '#b08d57',
  down: '#7ba17b',
  path: '#c08494',
  pulse: '#c9a84c',
}

const nodeTypes = { person: PersonNode, couple: CoupleNode }
const edgeTypes = { family: FamilyEdge }

interface FlowNode {
  id: string
  type?: string
  position: { x: number; y: number }
  hidden?: boolean
  data: Record<string, unknown>
}

interface FlowEdge {
  id: string
  source: string
  target: string
  type?: string
  markerEnd?: string
  animated?: boolean
  data?: Record<string, unknown>
}

export interface FamilyTreeEngineProps {
  treeData: FamilyTree | null
  canEdit?: boolean
  onMemberClick?: (member: TreeNode) => void
  highlightedMemberId?: number | null
  familyId?: number
}

function FlowInit({ onInit }: { onInit: (instance: ReturnType<typeof useReactFlow>) => void }) {
  const instance = useReactFlow()
  useEffect(() => { onInit(instance) }, [instance, onInit])
  return null
}

export function FamilyTreeEngine({
  treeData,
  canEdit = false,
  onMemberClick,
  highlightedMemberId: externalHighlight,
  familyId,
}: FamilyTreeEngineProps) {
  const [hoveredMember, setHoveredMember] = useState<TreeNode | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<number>>(new Set())
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(() => new Set())
  const [batchLoading, setBatchLoading] = useState(false)

  const reactFlowInstance = useRef<ReturnType<typeof useReactFlow> | null>(null)
  const reactFlowViewport = useViewport()
  const { dagrePositions, dagreNodeWidthMap, coupleInfo } = useTreeLayout(treeData)
  const { focusMemberId, generateFocusUrl } = useTreeFocus()

  const parentEdges = useMemo(
    () => (treeData?.edges ?? []).filter(e => e.type === 'parent'),
    [treeData],
  )

  const toggleCollapse = useCallback((id: number) => {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // 构建 React Flow 节点和边
  const { nodes, edges } = useMemo<{ nodes: FlowNode[]; edges: FlowEdge[] }>(() => {
    if (!treeData || treeData.nodes.length === 0) return { nodes: [], edges: [] }

    const hiddenDescendants = new Set<number>()
    const hiddenIds = new Set<number>([...collapsedIds, ...hiddenDescendants])
    const hiddenCountByRoot = new Map<number, number>()
    const hasChildren = new Set<number>()

    for (const e of parentEdges) {
      hasChildren.add(e.source)
      if (collapsedIds.has(e.source)) {
        const descs = new Set<number>()
        const stack = [e.target]
        while (stack.length) {
          const cid = stack.pop()!
          if (!descs.has(cid)) {
            descs.add(cid)
            hiddenDescendants.add(cid)
            for (const ee of parentEdges) {
              if (ee.source === cid) stack.push(ee.target)
            }
          }
        }
      }
    }

    const flowNodes: FlowNode[] = []
    const seen = new Set<number>()

    // person 节点（不在夫妻中的成员）
    for (const node of treeData.nodes) {
      if (coupleInfo.inCouple.has(node.id)) continue
      if (seen.has(node.id)) continue
      seen.add(node.id)
      const pos = dagrePositions.get(node.id)
      const nw = dagreNodeWidthMap.get(node.id) ?? 140
      flowNodes.push({
        id: String(node.id),
        type: 'person',
        hidden: hiddenIds.has(node.id),
        position: pos ? { x: pos.x - nw / 2, y: pos.y - NODE_HEIGHT / 2 } : { x: 0, y: 0 },
        data: {
          member: node,
          isHighlighted: false,
          isDimmed: false,
          highlightRole: 'normal',
          isCollapsed: collapsedIds.has(node.id),
          hiddenDescendantCount: hiddenCountByRoot.get(node.id) ?? 0,
          canCollapse: hasChildren.has(node.id),
          isSelectedNode: selectedNodeIds.has(node.id),
          nodeWidth: nw,
          onToggleCollapse: toggleCollapse,
          onHover: setHoveredMember,
        } satisfies PersonNodeData,
      })
    }

    // couple 节点
    for (const [repId, c] of coupleInfo.byRep) {
      if (seen.has(repId)) continue
      seen.add(repId)
      const pos = dagrePositions.get(repId)
      const nw = dagreNodeWidthMap.get(repId) ?? 280
      flowNodes.push({
        id: String(repId),
        type: 'couple',
        hidden: hiddenIds.has(repId),
        position: pos ? { x: pos.x - nw / 2, y: pos.y - (NODE_HEIGHT + 16) / 2 } : { x: 0, y: 0 },
        data: {
          husband: c.husband,
          wife: c.wife,
          isHighlighted: false,
          isDimmed: false,
          highlightRole: 'normal',
          isCollapsed: collapsedIds.has(repId),
          hiddenDescendantCount: hiddenCountByRoot.get(repId) ?? 0,
          canCollapse: hasChildren.has(repId),
          isSelectedNode: selectedNodeIds.has(repId),
          nodeWidth: nw,
          onToggleCollapse: toggleCollapse,
        } satisfies CoupleNodeData,
      })
    }

    const flowEdges: FlowEdge[] = parentEdges
      .filter(e => !hiddenIds.has(e.source) && !hiddenIds.has(e.target))
      .map(e => ({
        id: `e-${e.source}-${e.target}`,
        source: String(e.source),
        target: String(e.target),
        type: 'family',
        markerEnd: 'url(#edge-arrow)',
        data: {
          sourceName: treeData.nodes.find(n => n.id === e.source)?.name ?? '',
          targetName: treeData.nodes.find(n => n.id === e.target)?.name ?? '',
          isSelected: false,
          isHighlighted: false,
        } satisfies FamilyEdgeData,
      }))

    return { nodes: flowNodes, edges: flowEdges }
  }, [treeData, dagrePositions, dagreNodeWidthMap, coupleInfo, collapsedIds, selectedNodeIds, toggleCollapse, parentEdges])

  // 屏幕坐标（世代表尺用）
  const nodeScreenPositions = useMemo(() => {
    const map = new Map<number, { x: number; y: number; width: number; height: number }>()
    const { x: vx, y: vy, zoom } = reactFlowViewport
    dagrePositions.forEach((flowPos, id) => {
      const nw = dagreNodeWidthMap.get(id) ?? 140
      map.set(id, {
        x: flowPos.x * zoom + vx - (nw * zoom) / 2,
        y: flowPos.y * zoom + vy - (NODE_HEIGHT * zoom) / 2,
        width: nw * zoom,
        height: NODE_HEIGHT * zoom,
      })
    })
    return map
  }, [dagrePositions, dagreNodeWidthMap, reactFlowViewport])

  const search = useTreeSearch({ familyId, onLocate: useCallback(() => {}, []) })
  const lineage = { mode: 'none' as const, highlight: null, setMode: () => {}, clear: () => {}, loading: false, error: null }

  const handleFlowInit = useCallback((instance: ReturnType<typeof useReactFlow>) => {
    reactFlowInstance.current = instance
  }, [])

  return (
    <div className="relative h-64 md:h-[600px] w-full border rounded-lg overflow-hidden">
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <marker id="edge-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>

      {treeData && treeData.nodes.length > 0 && familyId && (
        <LineageToolbar
          mode={lineage.mode}
          onChange={(m: string) => lineage.setMode(m)}
          onClear={() => lineage.clear()}
          onOpenSearch={() => search.toggle()}
          loading={lineage.loading}
          label={null}
          error={lineage.error}
        />
      )}

      <TreeSearchPalette
        open={search.open}
        query={search.query}
        onQueryChange={search.setQuery}
        results={search.results}
        loading={search.loading}
        onPick={(hit: any) => search.pick(hit)}
        onClose={() => search.setOpen(false)}
      />

      {treeData && treeData.nodes.length > 0 && (
        <GenerationRuler
          nodes={treeData.nodes}
          nodeScreenPositions={nodeScreenPositions}
        />
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={2.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        nodesDraggable={canEdit}
        nodesConnectable={false}
        panActivationKeyCode="Space"
      >
        <FlowInit onInit={handleFlowInit} />
        <Controls showZoom showFitView showInteractive={canEdit} className="!bg-background/80 !backdrop-blur !border" />
        <Background className="!bg-background" gap={20} />
      </ReactFlow>
    </div>
  )
}
