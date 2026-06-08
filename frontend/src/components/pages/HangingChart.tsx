import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, AvatarDisplay } from '@/components/ui'
import { ZoomIn, ZoomOut } from 'lucide-react'
import type { TreeNode, FamilyTree, Member, TreeEdge } from '@/types'

interface HangingChartProps {
  treeData: FamilyTree | null
  members: Member[]
  canEdit: boolean
  familyId: number
  isLoading: boolean
  onEditMember: (member: Member) => void
  onDeleteMember: (memberId: number) => void
}

interface LayoutNode {
  id: number
  x: number
  y: number
  node: TreeNode
  generation: number
}

function getGenderColor(gender: string): string {
  switch (gender) {
    case 'male': return 'var(--primary)'
    case 'female': return '#E91E8C'
    default: return 'hsl(var(--muted-foreground))'
  }
}

function getGenderLabel(gender: string): string {
  switch (gender) {
    case 'male': return '男'
    case 'female': return '女'
    default: return '未知'
  }
}

// ============ 布局算法：按辈分从上到下排列 ============
interface LayoutResult {
  layoutNodes: LayoutNode[]
  svgWidth: number
  svgHeight: number
}

function computeHangingLayout(
  nodes: TreeNode[],
  edges: TreeEdge[]
): LayoutResult {
  if (nodes.length === 0) {
    return { layoutNodes: [], svgWidth: 1000, svgHeight: 800 }
  }

  const NODE_WIDTH = 100
  const NODE_HEIGHT = 50
  const H_GAP = 30
  const V_GAP = 80

  // 构建关系映射
  const parentToChildren = new Map<number, number[]>()
  const spouses = new Map<number, number[]>()

  edges.forEach((edge) => {
    if (edge.type === 'parent') {
      const children = parentToChildren.get(edge.source) || []
      if (!children.includes(edge.target)) children.push(edge.target)
      parentToChildren.set(edge.source, children)
    } else if (edge.type === 'spouse') {
      const s1 = spouses.get(edge.source) || []
      if (!s1.includes(edge.target)) s1.push(edge.target)
      spouses.set(edge.source, s1)
      const s2 = spouses.get(edge.target) || []
      if (!s2.includes(edge.source)) s2.push(edge.source)
      spouses.set(edge.target, s2)
    }
  })

  // 按辈分分组
  const genToNodes = new Map<number, TreeNode[]>()
  nodes.forEach((n) => {
    const gen = n.generation || 999
    const group = genToNodes.get(gen) || []
    group.push(n)
    genToNodes.set(gen, group)
  })

  // 按辈分排序（小的在上）
  const sortedGens = Array.from(genToNodes.keys()).sort((a, b) => a - b)

  const positions = new Map<number, { x: number; y: number }>()
  let currentX = 50

  // 为每一代布局
  for (const gen of sortedGens) {
    const genNodes = genToNodes.get(gen) || []
    if (genNodes.length === 0) continue

    // 收集所有需要显示的节点（包括配偶）
    const processed = new Set<number>()
    const rowNodes: number[] = []

    genNodes.forEach((node) => {
      if (processed.has(node.id)) return
      const nodeSpouses = spouses.get(node.id) || []

      rowNodes.push(node.id)
      processed.add(node.id)

      nodeSpouses.forEach((sid) => {
        const spouseNode = nodes.find((n) => n.id === sid)
        if (spouseNode && genToNodes.get(gen)?.some((n) => n.id === sid)) {
          if (!processed.has(sid)) {
            rowNodes.push(sid)
            processed.add(sid)
          }
        }
      })
    })

    genNodes.forEach((node) => {
      if (!processed.has(node.id)) {
        rowNodes.push(node.id)
        processed.add(node.id)
      }
    })

    // 计算位置
    let x = currentX
    rowNodes.forEach((nodeId) => {
      const y = 50 + sortedGens.indexOf(gen) * (NODE_HEIGHT + V_GAP)
      positions.set(nodeId, { x, y })
      x += NODE_WIDTH + H_GAP
    })

    currentX = x + H_GAP * 2
  }

  // 构建布局节点
  const layoutNodes: LayoutNode[] = nodes.map((node) => ({
    id: node.id,
    x: positions.get(node.id)?.x || 50,
    y: positions.get(node.id)?.y || 50,
    node,
    generation: node.generation || 1,
  }))

  // 计算SVG尺寸
  let maxX = 0, maxY = 0
  layoutNodes.forEach((ln) => {
    maxX = Math.max(maxX, ln.x + NODE_WIDTH)
    maxY = Math.max(maxY, ln.y + NODE_HEIGHT)
  })

  return {
    layoutNodes,
    svgWidth: Math.max(maxX + 100, 1000),
    svgHeight: Math.max(maxY + 100, 800),
  }
}

export default function HangingChart({
  treeData,
  canEdit,
  familyId,
  isLoading,
  onEditMember,
  onDeleteMember,
}: HangingChartProps) {
  const navigate = useNavigate()
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })

  const { layoutNodes, svgWidth, svgHeight } = useMemo(() => {
    if (!treeData || treeData.nodes.length === 0) {
      return { layoutNodes: [], svgWidth: 1000, svgHeight: 800 }
    }

    return computeHangingLayout(treeData.nodes, treeData.edges)
  }, [treeData])

  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">加载族谱数据...</p>
        </div>
      </div>
    )
  }

  if (!treeData || treeData.nodes.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">暂无族谱数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-md border bg-card shadow-sm">
      {!canEdit && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px] pointer-events-none">
          <p className="text-sm text-muted-foreground bg-background/80 px-4 py-2 rounded-md border shadow-sm">
            仅管理员可进行拖动与连线操作
          </p>
        </div>
      )}
      <div
        className="absolute left-4 top-4 z-10 flex items-center gap-2"
        role="toolbar"
        aria-label="吊线图缩放控制"
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
          className="h-8 w-8 rounded-lg bg-card/80 backdrop-blur-sm"
          aria-label="放大"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
          className="h-8 w-8 rounded-lg bg-card/80 backdrop-blur-sm"
          aria-label="缩小"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="ml-2 text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <div className="h-[600px] overflow-auto bg-background/50">
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          <defs>
            <filter id="hang-shadow" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
            </filter>
          </defs>

          {treeData.edges.map((edge) => {
            const sourceNode = layoutNodes.find((n) => n.id === edge.source)
            const targetNode = layoutNodes.find((n) => n.id === edge.target)
            if (!sourceNode || !targetNode) return null

            const sx = sourceNode.x + 50
            const sy = sourceNode.y + 50
            const tx = targetNode.x + 50
            const ty = targetNode.y

            if (edge.type === 'parent') {
              const midY = (sy + ty) / 2
              return (
                <path
                  key={`edge-${edge.id}`}
                  d={`M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`}
                  fill="none"
                  stroke="hsl(var(--ink, 220 15% 15%))"
                  strokeWidth="1.5"
                  strokeOpacity="0.6"
                />
              )
            } else if (edge.type === 'spouse') {
              return (
                <line
                  key={`edge-${edge.id}`}
                  x1={sx}
                  y1={sourceNode.y + 25}
                  x2={tx}
                  y2={targetNode.y + 25}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />
              )
            }
            return null
          })}

          {layoutNodes.map((ln) => {
            const isSelected = selectedNode?.id === ln.id
            const isHovered = hoveredNode?.id === ln.id
            return (
              <g
                key={ln.id}
                onClick={() => setSelectedNode(ln.node)}
                onDoubleClick={() => navigate(`/family/${familyId}/member/${ln.node.id}`)}
                onMouseEnter={(e) => {
                  setHoveredNode(ln.node)
                  setHoverPosition({ x: e.clientX, y: e.clientY })
                }}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                <rect
                  x={ln.x}
                  y={ln.y}
                  width={100}
                  height={50}
                  rx={4}
                  fill={isHovered ? 'hsl(var(--primary) / 0.15)' : isSelected ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--card))'}
                  stroke={isHovered ? 'hsl(var(--primary))' : isSelected ? 'hsl(var(--primary))' : getGenderColor(ln.node.gender)}
                  strokeWidth={isHovered || isSelected ? 2.5 : 1}
                  filter="url(#hang-shadow)"
                />
                <rect
                  x={ln.x}
                  y={ln.y}
                  width={3}
                  height={50}
                  rx={1.5}
                  fill={getGenderColor(ln.node.gender)}
                />
                <text
                  x={ln.x + 50}
                  y={ln.y + 22}
                  textAnchor="middle"
                  className="text-sm font-semibold"
                  fill="hsl(var(--foreground))"
                >
                  {ln.node.name}
                </text>
                <text
                  x={ln.x + 50}
                  y={ln.y + 38}
                  textAnchor="middle"
                  className="text-xs"
                  fill="hsl(var(--muted-foreground))"
                >
                  {ln.node.generation_name ? `${ln.node.generation_name}字` : getGenderLabel(ln.node.gender)}
                </text>
                {!ln.node.is_alive && (
                  <text
                    x={ln.x + 85}
                    y={ln.y + 15}
                    fill="hsl(var(--muted-foreground))"
                    fontSize="10"
                  >
                    †
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {selectedNode && (
        <div className="absolute right-4 top-4 w-64 rounded-md border bg-card p-4 shadow-lg animate-fade-in">
          <div className="mb-3 flex items-start justify-between">
            <AvatarDisplay
              avatar={selectedNode.avatar}
              name={selectedNode.name}
              gender={selectedNode.gender}
              size={40}
            />
            <button
              onClick={() => setSelectedNode(null)}
              className="text-muted-foreground hover:text-foreground text-xl leading-none"
            >
              ×
            </button>
          </div>
          <h3 className="mb-1 font-semibold">{selectedNode.name}</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {getGenderLabel(selectedNode.gender)}
            {selectedNode.generation_name && ` · ${selectedNode.generation_name}字辈`}
            {selectedNode.is_alive ? '' : ' · 已故'}
          </p>
          {selectedNode.birth_date && (
            <p className="mb-1 text-xs text-muted-foreground">出生：{selectedNode.birth_date}</p>
          )}
          {selectedNode.death_date && (
            <p className="mb-3 text-xs text-muted-foreground">逝世：{selectedNode.death_date}</p>
          )}
          {canEdit && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  const member = treeData?.nodes.find(n => n.id === selectedNode.id)
                  if (member) {
                    onEditMember(member as unknown as Member)
                    setSelectedNode(null)
                  }
                }}
              >
                编辑
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => { onDeleteMember(selectedNode.id); setSelectedNode(null) }}
              >
                删除
              </Button>
            </div>
          )}
        </div>
      )}

      {hoveredNode && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border bg-card p-3 shadow-lg animate-fade-in"
          style={{
            left: hoverPosition.x + 15,
            top: hoverPosition.y + 15,
            maxWidth: 280,
          }}
        >
          <div className="flex items-center gap-3">
            <AvatarDisplay
              avatar={hoveredNode.avatar}
              name={hoveredNode.name}
              gender={hoveredNode.gender}
              size={36}
            />
            <div>
              <h4 className="font-semibold">{hoveredNode.name}</h4>
              <p className="text-xs text-muted-foreground">
                {getGenderLabel(hoveredNode.gender)}
                {hoveredNode.generation_name && ` · ${hoveredNode.generation_name}字辈`}
                {!hoveredNode.is_alive && ' · 已故'}
              </p>
            </div>
          </div>
          {hoveredNode.birth_date && (
            <p className="mt-2 text-xs text-muted-foreground">
              出生：{hoveredNode.birth_date}
            </p>
          )}
          {hoveredNode.death_date && (
            <p className="text-xs text-muted-foreground">
              逝世：{hoveredNode.death_date}
            </p>
          )}
          {hoveredNode.bio && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
              {hoveredNode.bio}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
