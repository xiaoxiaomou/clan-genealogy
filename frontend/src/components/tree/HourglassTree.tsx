import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  Handle,
  Position,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { AvatarDisplay } from '@/components/ui'
import { MemberTooltip } from '@/components/tree-engine/nodes/MemberTooltip'
import type { TreeNode } from '@/types'
import { api } from '@/lib/api'
import { useTreeFocus, useAutoFocusNode } from '@/hooks/useTreeFocus'

const NODE_WIDTH = 160
const NODE_HEIGHT = 80

interface HourglassMember {
  id: number
  name: string
  generation: number
}

interface HourglassMemberNodeData {
  member: HourglassMember
  gender?: string
  onHover?: (member: TreeNode | null, x?: number, y?: number) => void
}

// src/env.d.ts 中对 '@xyflow/react' 的 ambient 声明覆盖了包内类型，
// 这里以结构等价的局部类型替代 Node/Edge（仅类型层面，无运行时影响）。
interface HourglassFlowNode {
  id: string
  type?: string
  position: { x: number; y: number }
  data: HourglassMemberNodeData
}

interface HourglassFlowEdge {
  id: string
  source: string
  target: string
  type?: string
  animated?: boolean
}

function HourglassNodeComponent({ data }: { data: HourglassMemberNodeData }) {
  const member = data.member as HourglassMember
  return (
    <div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      className="relative touch-manipulation"
      onMouseEnter={(e) => data.onHover?.(toTreeNode(member, data.gender), e.clientX, e.clientY)}
      onMouseLeave={() => data.onHover?.(null)}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <div
        className="relative h-full w-full cursor-pointer overflow-hidden rounded-[4px] border transition-shadow hover:shadow-lg"
        style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}
      >
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'hsl(160, 24%, ' + Math.min(30 + (member.generation || 1) * 6, 70) + '%)' }} aria-hidden="true" />
        <div className="flex h-full flex-col items-center justify-center gap-0.5 px-2 text-center">
          <div className="flex w-full items-center justify-center gap-1.5">
            <AvatarDisplay avatar={null} name={member.name} size={24} className="flex-shrink-0" />
            <span className="truncate font-serif text-[14px] font-semibold tracking-wide">{member.name}</span>
          </div>
          <p className="w-full truncate text-[10px] leading-none text-muted-foreground">第{member.generation}世</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  )
}

const nodeTypes = { hourglassMember: HourglassNodeComponent }

/** 沙漏图数据只有 名讳/世代/性别，映射为 TreeNode 供名帖浮层使用 */
function toTreeNode(m: HourglassMember, gender?: string): TreeNode {
  return {
    id: m.id,
    name: m.name,
    gender: gender ?? 'unknown',
    generation: m.generation,
    is_alive: true,
    generation_name: null,
    birth_date: null,
    death_date: null,
    avatar: null,
    bio: null,
  } as TreeNode
}

function FlowInit({ onInit }: { onInit: (instance: ReturnType<typeof useReactFlow>) => void }) {
  const instance = useReactFlow()
  useEffect(() => { onInit(instance) }, [instance, onInit])
  return null
}

interface HourglassTreeProps {
  familyId: number
  initialMemberId?: number | null
  onMemberClick?: (member: HourglassMember) => void
}

export default function HourglassTree({ familyId, initialMemberId, onMemberClick }: HourglassTreeProps) {
  const [centerMember, setCenterMember] = useState<HourglassMember | null>(null)
  const [hovered, setHovered] = useState<{ member: TreeNode; x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const handleNodeHover = useCallback((m: TreeNode | null, x?: number, y?: number) => {
    if (m && x !== undefined && y !== undefined) setHovered({ member: m, x, y })
    else setHovered(null)
  }, [])
  const [ancestors, setAncestors] = useState<HourglassMember[]>([])
  const [descendants, setDescendants] = useState<HourglassMember[]>([])
  const [siblings, setSiblings] = useState<HourglassMember[]>([])
  const [spouses, setSpouses] = useState<HourglassMember[]>([])
  const [ancestorEdgeKeys, setAncestorEdgeKeys] = useState<string[]>([])
  const [descendantEdgeKeys, setDescendantEdgeKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [, setSelectedMember] = useState<HourglassMember | null>(null)

  const reactFlowInstance = useRef<ReturnType<typeof useReactFlow> | null>(null)
  const { focusMemberId } = useTreeFocus()

  const loadHourglass = useCallback(async (memberId: number) => {
    setLoading(true)
    try {
      const data = await api.getHourglassView(familyId, memberId)
      setCenterMember(data.member)
      setAncestors(data.ancestors)
      setDescendants(data.descendants)
      setSiblings(data.siblings)
      setSpouses(data.spouses)
      setAncestorEdgeKeys(data.ancestor_edge_keys)
      setDescendantEdgeKeys(data.descendant_edge_keys)
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    if (initialMemberId && initialMemberId > 0) {
      void loadHourglass(initialMemberId)
    }
  }, [initialMemberId, loadHourglass])

  const handleNodeClick = useCallback((_: unknown, node: HourglassFlowNode) => {
    const member = node.data?.member as HourglassMember | undefined
    if (member) {
      setSelectedMember(member)
      onMemberClick?.(member)
    }
  }, [onMemberClick])

  const { nodes, edges, dagrePositions } = useMemo(() => {
    if (!centerMember) return { nodes: [] as HourglassFlowNode[], edges: [] as HourglassFlowEdge[], dagrePositions: new Map<number, { x: number; y: number }>() }

    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 })

    const allNodes: Array<{ id: number; name: string; generation: number }> = []
    const idSet = new Set<number>()

    // Add ancestors sorted by generation (highest first = top of graph)
    const sortedAncestors = [...ancestors].sort((a, b) => a.generation - b.generation)
    for (const a of sortedAncestors) {
      if (!idSet.has(a.id)) { allNodes.push(a); idSet.add(a.id) }
    }

    // Add center member
    if (!idSet.has(centerMember.id)) { allNodes.push(centerMember); idSet.add(centerMember.id) }

    // Add siblings on same row
    for (const s of siblings) {
      if (!idSet.has(s.id)) { allNodes.push(s); idSet.add(s.id) }
    }

    // Add spouses on same row
    for (const s of spouses) {
      if (!idSet.has(s.id)) { allNodes.push(s); idSet.add(s.id) }
    }

    // Add descendants sorted by generation (lowest first = bottom of graph)
    const sortedDescendants = [...descendants].sort((a, b) => a.generation - b.generation)
    for (const d of sortedDescendants) {
      if (!idSet.has(d.id)) { allNodes.push(d); idSet.add(d.id) }
    }

    const reactflowNodes: HourglassFlowNode[] = allNodes.map((n) => ({
      id: String(n.id),
      type: 'hourglassMember',
      position: { x: 0, y: 0 },
      data: { member: n, onHover: handleNodeHover },
    }))

    // Build edges from ancestor_edge_keys and descendant_edge_keys
    const edgeSet = new Set(ancestorEdgeKeys)
    for (const k of descendantEdgeKeys) edgeSet.add(k)

    const reactflowEdges: HourglassFlowEdge[] = []
    for (const ek of edgeSet) {
      const [a, b] = ek.split('-').map(Number)
      if (idSet.has(a) && idSet.has(b)) {
        reactflowEdges.push({
          id: `edge-${ek}`,
          source: String(a),
          target: String(b),
          type: 'smoothstep',
          animated: true,
        })
      }
    }

    // Dagre layout
    for (const n of reactflowNodes) {
      dagreGraph.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
    }
    for (const e of reactflowEdges) {
      dagreGraph.setEdge(e.source, e.target)
    }
    dagre.layout(dagreGraph)

    const positions = new Map<number, { x: number; y: number }>()
    for (const n of reactflowNodes) {
      const pos = dagreGraph.node(n.id) as { x: number; y: number } | undefined
      if (pos) {
        n.position = { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 }
        positions.set(Number(n.id), { x: pos.x, y: pos.y })
      }
    }

    return { nodes: reactflowNodes, edges: reactflowEdges, dagrePositions: positions }
  }, [centerMember, ancestors, descendants, siblings, spouses, ancestorEdgeKeys, descendantEdgeKeys])

  useAutoFocusNode({ focusMemberId, dagrePositions, reactFlowInstance, duration: 800, zoom: 0.8 })

  const handleFlowInit = useCallback((instance: ReturnType<typeof useReactFlow>) => {
    reactFlowInstance.current = instance
  }, [])

  if (!centerMember) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {loading ? '加载中...' : '请选择一个成员'}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative h-[600px] w-full border rounded-lg overflow-hidden">
      <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded-md border shadow-sm text-sm flex items-center gap-3">
        <span className="font-medium">{centerMember.name}</span>
        <span className="text-muted-foreground">第{centerMember.generation}世</span>
        <span className="text-xs text-muted-foreground">
          上{ancestors.length}代 · 下{descendants.length}代
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <FlowInit onInit={handleFlowInit} />
        <Controls showZoom showFitView className="!bg-background/80 !backdrop-blur !border" />
        <Background className="!bg-background" gap={20} />
        {hovered && (
          <MemberTooltip
            member={hovered.member}
            mouseX={hovered.x}
            mouseY={hovered.y}
            containerRect={containerRef.current?.getBoundingClientRect() ?? null}
          />
        )}
      </ReactFlow>
    </div>
  )
}
