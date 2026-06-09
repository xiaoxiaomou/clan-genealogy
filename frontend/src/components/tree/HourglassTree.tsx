import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  Handle,
  Position,
  BaseEdge,
  getBezierPath,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { Card, CardContent, AvatarDisplay } from '@/components/ui'
import { api } from '@/lib/api'
import { useTreeFocus, useAutoFocusNode } from '@/hooks/useTreeFocus'

const NODE_WIDTH = 160
const NODE_HEIGHT = 80

function getGenderColor(gender: string): string {
  switch (gender) {
    case 'male': return '#2563eb'
    case 'female': return '#ec4899'
    default: return '#94a3b8'
  }
}

interface HourglassMember {
  id: number
  name: string
  generation: number
}

interface HourglassMemberNodeData {
  member: HourglassMember
  gender?: string
}

function HourglassNodeComponent({ data }: { data: HourglassMemberNodeData }) {
  const member = data.member as HourglassMember
  return (
    <div style={{ width: NODE_WIDTH, height: NODE_HEIGHT }} className="relative">
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" style={{ borderColor: getGenderColor('male'), borderWidth: 1 }}>
        <CardContent className="p-2 flex items-center gap-2">
          <AvatarDisplay name={member.name} size={32} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs truncate">{member.name}</p>
            <p className="text-[10px] text-muted-foreground">第{member.generation}世</p>
          </div>
        </CardContent>
      </Card>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  )
}

const nodeTypes = { hourglassMember: HourglassNodeComponent }

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
  const [ancestors, setAncestors] = useState<HourglassMember[]>([])
  const [descendants, setDescendants] = useState<HourglassMember[]>([])
  const [siblings, setSiblings] = useState<HourglassMember[]>([])
  const [spouses, setSpouses] = useState<HourglassMember[]>([])
  const [ancestorEdgeKeys, setAncestorEdgeKeys] = useState<string[]>([])
  const [descendantEdgeKeys, setDescendantEdgeKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState<HourglassMember | null>(null)

  const reactFlowInstance = useRef<ReturnType<typeof useReactFlow> | null>(null)
  const { focusMemberId, generateFocusUrl, clearFocus } = useTreeFocus()

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

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    const member = node.data?.member as HourglassMember | undefined
    if (member) {
      setSelectedMember(member)
      onMemberClick?.(member)
    }
  }, [onMemberClick])

  const { nodes, edges, dagrePositions } = useMemo(() => {
    if (!centerMember) return { nodes: [] as Node[], edges: [] as Edge[], dagrePositions: new Map<number, { x: number; y: number }>() }

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

    const reactflowNodes: Node[] = allNodes.map((n) => ({
      id: String(n.id),
      type: 'hourglassMember',
      position: { x: 0, y: 0 },
      data: { member: n },
    }))

    // Build edges from ancestor_edge_keys and descendant_edge_keys
    const edgeSet = new Set(ancestorEdgeKeys)
    for (const k of descendantEdgeKeys) edgeSet.add(k)

    const reactflowEdges: Edge[] = []
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
    <div className="relative h-[600px] w-full border rounded-lg overflow-hidden">
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
      </ReactFlow>
    </div>
  )
}
