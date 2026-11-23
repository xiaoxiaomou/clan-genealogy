import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useReactFlow,
  useViewport,
  applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { TreeNode, FamilyTree } from '@/types'
import { useTreeSearch } from '@/hooks/useTreeSearch'
import { GenerationRuler } from '@/components/tree/GenerationRuler'
import { LineageToolbar } from '@/components/tree/LineageToolbar'
import { TreeSearchPalette } from '@/components/tree/TreeSearchPalette'
import { PersonNode, type PersonNodeData } from './nodes/PersonNode'
import { CoupleNode, type CoupleNodeData } from './nodes/CoupleNode'
import { FamilyEdge, type FamilyEdgeData } from './edges/FamilyEdge'
import { MemberTooltip } from './nodes/MemberTooltip'
import { useTreeLayout, NODE_HEIGHT } from './hooks/useTreeLayout'
import './FamilyTreeEngine.css'

export type LayoutMode = 'tree'

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
  /** 右键成员节点（管理员上下文菜单） */
  onNodeContextMenu?: (member: TreeNode, x: number, y: number) => void
  /** 双击画布空白处（快捷添加成员） */
  onCanvasDoubleClick?: () => void
  /** 单击画布空白处（关闭菜单等） */
  onPaneClick?: () => void
  /** 拖拽连线：source=拖拽起点成员（长辈侧），target=落点成员 */
  onCreateRelationship?: (sourceMemberId: number, targetMemberId: number) => void
  /** 右键连线（管理员删除关系） */
  onEdgeContextMenu?: (edge: { id: number; type: string; sourceName: string; targetName: string }, x: number, y: number) => void
}

function FlowInit({ onInit }: { onInit: (instance: ReturnType<typeof useReactFlow>) => void }) {
  const instance = useReactFlow()
  useEffect(() => { onInit(instance) }, [instance, onInit])
  return null
}

export function FamilyTreeEngine({
  treeData,
  canEdit = false,
  familyId,
  onMemberClick,
  onNodeContextMenu,
  onCanvasDoubleClick,
  onPaneClick,
  onCreateRelationship,
  onEdgeContextMenu,
}: FamilyTreeEngineProps) {
  const [hoveredMember, setHoveredMember] = useState<{ member: TreeNode; x: number; y: number } | null>(null)
  const engineRef = useRef<HTMLDivElement>(null)
  /* 手动拖拽后的节点位置（受控模式：不记录会被 dagre 位置弹回） */
  const [dragPos, setDragPos] = useState<Map<string, { x: number; y: number }>>(new Map)

  useEffect(() => { setDragPos(new Map()) }, [treeData])

  const handleNodeHover = useCallback((m: TreeNode | null, x?: number, y?: number) => {
    if (m && x !== undefined && y !== undefined) setHoveredMember({ member: m, x, y })
    else setHoveredMember(null)
  }, [])
  const [selectedNodeIds] = useState<Set<number>>(new Set())
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(() => new Set())
  const reactFlowInstance = useRef<ReturnType<typeof useReactFlow> | null>(null)
  const flowApi = useReactFlow()
  const reactFlowViewport = useViewport()
  const { dagrePositions, dagreNodeWidthMap, coupleInfo } = useTreeLayout(treeData)

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
  const { nodes: layoutNodes, edges } = useMemo<{ nodes: FlowNode[]; edges: FlowEdge[] }>(() => {
    if (!treeData || treeData.nodes.length === 0) return { nodes: [], edges: [] }

    const hiddenDescendants = new Set<number>()
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

    const hiddenIds = new Set<number>([...collapsedIds, ...hiddenDescendants])

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
        position: dragPos.get(String(node.id)) ?? (pos ? { x: pos.x - nw / 2, y: pos.y - NODE_HEIGHT / 2 } : { x: 0, y: 0 }),
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
          onHover: handleNodeHover,
          onNodeContextMenu,
          interactive: canEdit,
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
        position: dragPos.get(String(repId)) ?? (pos ? { x: pos.x - nw / 2, y: pos.y - NODE_HEIGHT / 2 } : { x: 0, y: 0 }),
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
          onHover: handleNodeHover,
          onNodeContextMenu,
          interactive: canEdit,
        } satisfies CoupleNodeData,
      })
    }

    // O(1) 查找表：成员 id → 夫妻代表 id、成员 id → 节点，避免每条边线性扫描
    const repByMember = coupleInfo.repByMember
    const nodeById = new Map(treeData.nodes.map(n => [n.id, n]))

    const flowEdges: FlowEdge[] = parentEdges
      .filter(e => !hiddenIds.has(e.source) && !hiddenIds.has(e.target))
      .map(e => ({
        id: `e-${e.source}-${e.target}`,
        source: String(coupleInfo.inCouple.has(e.source) ? (repByMember.get(e.source) ?? e.source) : e.source),
        target: String(e.target),
        type: 'family',
        markerEnd: 'url(#edge-arrow)',
        data: {
          sourceName: nodeById.get(e.source)?.name ?? '',
          targetName: nodeById.get(e.target)?.name ?? '',
          isSelected: false,
          isHighlighted: false,
          relationshipId: e.id,
          relationshipType: e.type,
        } satisfies FamilyEdgeData,
      }))

    return { nodes: flowNodes, edges: flowEdges }
  }, [treeData, dagrePositions, dagreNodeWidthMap, coupleInfo, collapsedIds, selectedNodeIds, toggleCollapse, parentEdges, dragPos])

  // 受控节点：React Flow 拖拽需要 onNodesChange 才能实时移动节点。
  // layoutNodes 的 position 已优先取 dragPos，故重算时不会丢失拖动结果。
  const [nodes, setNodes] = useState<FlowNode[]>(layoutNodes)
  useEffect(() => { setNodes(layoutNodes) }, [layoutNodes])
  const onNodesChange = useCallback((changes: any[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as FlowNode[])
  }, [])

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
  const lineage = { mode: 'none' as const, highlight: null, setMode: (_mode?: string) => {}, clear: () => {}, loading: false, error: null }

  const handleFlowInit = useCallback((instance: ReturnType<typeof useReactFlow>) => {
    reactFlowInstance.current = instance
  }, [])

  /* 数据异步到达/变更后重新 fitView（mount 时的 fitView 常跑在数据到达之前） */
  const nodeCount = treeData?.nodes.length ?? 0
  useEffect(() => {
    if (!nodeCount) return
    const doFit = () => flowApi.current?.fitView({ padding: 0.15 })
    const raf = requestAnimationFrame(doFit)
    const t = setTimeout(doFit, 350)
    return () => { cancelAnimationFrame(raf); clearTimeout(t) }
  }, [nodeCount])

  return (
    <div
      ref={engineRef}
      className="relative h-64 md:h-[600px] w-full border rounded-lg overflow-hidden"
      onDoubleClick={(e) => {
        const t = e.target as Element
        if (!t.closest('.react-flow__node') && !t.closest('.react-flow__edge') && !t.closest('.react-flow__controls')) {
          onCanvasDoubleClick?.()
        }
      }}
    >
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
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={2.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        nodesDraggable={canEdit}
        nodesConnectable={canEdit}
        onConnect={(c: { source?: string | null; target?: string | null }) => {
          if (!c.source || !c.target || c.source === c.target) return
          onCreateRelationship?.(Number(c.source), Number(c.target))
        }}
        panActivationKeyCode="Space"
        onPaneClick={() => onPaneClick?.()}
        onEdgeContextMenu={(e: React.MouseEvent, edge: { data?: { relationshipId?: number; relationshipType?: string; sourceName?: string; targetName?: string } }) => {
          e.preventDefault()
          const d = edge.data
          if (d?.relationshipId && onEdgeContextMenu) {
            onEdgeContextMenu({
              id: d.relationshipId,
              type: d.relationshipType ?? '',
              sourceName: d.sourceName ?? '',
              targetName: d.targetName ?? '',
            }, e.clientX, e.clientY)
          }
        }}
        onNodeDrag={(_e: unknown, node: { id: string; position: { x: number; y: number } }) => setDragPos(prev => new Map(prev).set(String(node.id), { x: node.position.x, y: node.position.y }))}
        onNodeDragStop={(_e: unknown, node: { id: string; position: { x: number; y: number } }) => setDragPos(prev => new Map(prev).set(String(node.id), { x: node.position.x, y: node.position.y }))}
        onNodeClick={(_: unknown, node: { data: unknown }) => {
          const d = node.data as PersonNodeData | CoupleNodeData
          const m = 'member' in d ? d.member : d.husband
          if (m) onMemberClick?.(m)
        }}
      >
        <FlowInit onInit={handleFlowInit} />
        <Controls showZoom showFitView showInteractive={canEdit} className="!bg-background/80 !backdrop-blur !border" />
        <Background className="!bg-background" gap={20} />
      </ReactFlow>

      {hoveredMember && (
        <MemberTooltip
          member={hoveredMember.member}
          mouseX={hoveredMember.x}
          mouseY={hoveredMember.y}
          containerRect={engineRef.current?.getBoundingClientRect() ?? null}
        />
      )}
    </div>
  )
}
