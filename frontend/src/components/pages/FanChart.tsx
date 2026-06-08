import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, AvatarDisplay } from '@/components/ui'
import { ZoomIn, ZoomOut } from 'lucide-react'
import type { TreeNode, FamilyTree, Member } from '@/types'

interface FanChartProps {
  treeData: FamilyTree | null
  members: Member[]
  canEdit: boolean
  familyId: number
  isLoading: boolean
  onEditMember: (member: Member) => void
  onDeleteMember: (memberId: number) => void
  highlightedMemberId?: number | null
  onMemberClick?: (member: TreeNode) => void
}

interface LayoutNode {
  id: number
  x: number
  y: number
  node: TreeNode
  generation: number
  spouseId?: number
  parentIds: number[]
  childIds: number[]
}

function getGenderLabel(gender: string): string {
  switch (gender) {
    case 'male': return '男'
    case 'female': return '女'
    default: return '未知'
  }
}

export default function FanChart({
  treeData,
  canEdit,
  familyId,
  isLoading,
  onEditMember,
  onDeleteMember,
  highlightedMemberId,
  onMemberClick,
}: FanChartProps) {
  const navigate = useNavigate()
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [localHighlightedId, setLocalHighlightedId] = useState<number | null>(null)
  const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })

  const effectiveHighlightedId = highlightedMemberId ?? localHighlightedId

  const { layoutNodes, edges, svgWidth, svgHeight } = useMemo(() => {
    if (!treeData || treeData.nodes.length === 0) {
      return {
        layoutNodes: [],
        edges: [],
        svgWidth: 800,
        svgHeight: 600,
        generations: new Map<number, number>(),
      }
    }

    const nodeMap = new Map<number, TreeNode>()
    treeData.nodes.forEach((n) => nodeMap.set(n.id, n))

    const parentToChildren = new Map<number, number[]>()
    const childToParents = new Map<number, number[]>()
    const spouseMap = new Map<number, number>()

    treeData.edges.forEach((edge) => {
      if (edge.type === 'parent') {
        const children = parentToChildren.get(edge.source) || []
        if (!children.includes(edge.target)) children.push(edge.target)
        parentToChildren.set(edge.source, children)

        const parents = childToParents.get(edge.target) || []
        if (!parents.includes(edge.source)) parents.push(edge.source)
        childToParents.set(edge.target, parents)
      } else if (edge.type === 'spouse') {
        spouseMap.set(edge.source, edge.target)
        spouseMap.set(edge.target, edge.source)
      }
    })

    const findRoots = () => {
      const nodesWithParents = new Set<number>()
      treeData.edges.filter(e => e.type === 'parent').forEach(e => nodesWithParents.add(e.target))
      return treeData.nodes.filter(n => !nodesWithParents.has(n.id))
    }

    const roots = findRoots()
    const generations = new Map<number, number>()
    const visitedForGen = new Set<number>()

    const assignGeneration = (nodeId: number, gen: number) => {
      if (visitedForGen.has(nodeId)) {
        if (generations.get(nodeId)! > gen) {
          generations.set(nodeId, gen)
        }
        return
      }
      visitedForGen.add(nodeId)
      generations.set(nodeId, gen)
      const children = parentToChildren.get(nodeId) || []
      children.forEach(childId => assignGeneration(childId, gen + 1))
    }

    roots.forEach(root => assignGeneration(root.id, 0))

    treeData.nodes.forEach(n => {
      if (!generations.has(n.id)) {
        generations.set(n.id, 0)
      }
    })

    const maxGen = Math.max(...Array.from(generations.values()), 0)
    const nodesPerGen = new Map<number, number[]>()
    for (let g = 0; g <= maxGen; g++) {
      nodesPerGen.set(g, [])
    }
    treeData.nodes.forEach(n => {
      const gen = generations.get(n.id) || 0
      nodesPerGen.get(gen)?.push(n.id)
    })

    const layoutNodes: LayoutNode[] = []
    const nodeWidth = 100
    const genGapY = 120
    const siblingGapX = 20
    const coupleGapX = 30
    const marginX = 60
    const marginY = 80

    const genWidths = new Map<number, number>()
    for (let g = 0; g <= maxGen; g++) {
      const nodeIds = nodesPerGen.get(g) || []
      let totalWidth = 0
      let i = 0
      while (i < nodeIds.length) {
        const nodeId = nodeIds[i]
        const spouseId = spouseMap.get(nodeId)
        if (spouseId && nodeIds.includes(spouseId) && spouseId > nodeId) {
          totalWidth += nodeWidth * 2 + coupleGapX + siblingGapX
          i += 2
        } else {
          totalWidth += nodeWidth + siblingGapX
          i += 1
        }
      }
      genWidths.set(g, totalWidth)
    }

    const maxWidth = Math.max(...Array.from(genWidths.values()), 0)
    const svgWidth = Math.max(maxWidth + marginX * 2, 400)
    const svgHeight = (maxGen + 1) * genGapY + marginY * 2

    for (let g = 0; g <= maxGen; g++) {
      const nodeIds = nodesPerGen.get(g) || []
      const genWidth = genWidths.get(g) || 0
      let currentX = (svgWidth - genWidth) / 2 + marginX
      let i = 0

      while (i < nodeIds.length) {
        const nodeId = nodeIds[i]
        const spouseId = spouseMap.get(nodeId)
        const hasSpouse = spouseId && nodeIds.includes(spouseId) && spouseId > nodeId

        const parents = childToParents.get(nodeId) || []
        const children = parentToChildren.get(nodeId) || []

        if (hasSpouse) {
          const maleNode = nodeMap.get(nodeId)?.gender === 'male' ? nodeId : spouseId
          const femaleNode = maleNode === nodeId ? spouseId : nodeId

          const male = nodeMap.get(maleNode)
          const female = nodeMap.get(femaleNode)

          if (male) {
            layoutNodes.push({
              id: maleNode,
              x: currentX,
              y: marginY + g * genGapY,
              node: male,
              generation: g,
              spouseId: femaleNode,
              parentIds: parents,
              childIds: children,
            })
          }
          if (female) {
            layoutNodes.push({
              id: femaleNode,
              x: currentX + nodeWidth + coupleGapX,
              y: marginY + g * genGapY,
              node: female,
              generation: g,
              spouseId: maleNode,
              parentIds: parents,
              childIds: children,
            })
          }
          currentX += nodeWidth * 2 + coupleGapX + siblingGapX
          i += 2
        } else {
          const node = nodeMap.get(nodeId)
          if (node) {
            layoutNodes.push({
              id: nodeId,
              x: currentX,
              y: marginY + g * genGapY,
              node,
              generation: g,
              spouseId: undefined,
              parentIds: parents,
              childIds: children,
            })
          }
          currentX += nodeWidth + siblingGapX
          i += 1
        }
      }
    }

    const drawEdges: { from: number; to: number; type: 'spouse' | 'parent-child' }[] = []

    layoutNodes.forEach(ln => {
      if (ln.spouseId) {
        drawEdges.push({ from: ln.id, to: ln.spouseId, type: 'spouse' })
      }
    })

    layoutNodes.forEach(ln => {
      const children = parentToChildren.get(ln.id) || []
      children.forEach(childId => {
        if (!drawEdges.some(e => e.from === ln.id && e.to === childId)) {
          drawEdges.push({ from: ln.id, to: childId, type: 'parent-child' })
        }
      })
    })

    return {
      layoutNodes,
      edges: drawEdges,
      svgWidth,
      svgHeight,
      generations,
    }
  }, [treeData])

  const { highlightedIds, dimmedIds } = useMemo(() => {
    if (effectiveHighlightedId === null) {
      return { highlightedIds: new Set<number>(), dimmedIds: new Set<number>() }
    }

    const highlighted = new Set<number>()
    const dimmed = new Set<number>()
    highlighted.add(effectiveHighlightedId)

    const getRelatives = (id: number, visited: Set<number> = new Set()) => {
      if (visited.has(id)) return
      visited.add(id)

      edges.forEach(e => {
        if (e.from === id || e.to === id) {
          const other = e.from === id ? e.to : e.from
          if (!highlighted.has(other)) {
            highlighted.add(other)
            getRelatives(other, visited)
          }
        }
      })
    }

    getRelatives(effectiveHighlightedId)

    layoutNodes.forEach(ln => {
      if (!highlighted.has(ln.id)) {
        dimmed.add(ln.id)
      }
    })

    return { highlightedIds: highlighted, dimmedIds: dimmed }
  }, [effectiveHighlightedId, layoutNodes, edges])

  const handleNodeClick = useCallback((node: TreeNode) => {
    setLocalHighlightedId(node.id)
    setSelectedNode(node)
    if (onMemberClick) {
      onMemberClick(node)
    }
  }, [onMemberClick])

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

  const nodeWidth = 100
  const nodeHeight = 60

  return (
    <div className="relative overflow-auto rounded-md border bg-card shadow-sm" style={{ maxHeight: '700px' }}>
      {!canEdit && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px] pointer-events-none">
          <p className="text-sm text-muted-foreground bg-background/80 px-4 py-2 rounded-md border shadow-sm">
            仅管理员可进行拖动与连线操作
          </p>
        </div>
      )}
      <div
        className="sticky left-4 top-4 z-10 flex items-center gap-2"
        role="toolbar"
        aria-label="缩放控制"
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
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
          className="h-8 w-8 rounded-lg bg-card/80 backdrop-blur-sm"
          aria-label="缩小"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="ml-2 text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        {effectiveHighlightedId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalHighlightedId(null)
              setSelectedNode(null)
            }}
            className="ml-2 text-xs"
          >
            清除高亮
          </Button>
        )}
      </div>

      <div className="p-4">
        <svg
          width={svgWidth * zoom}
          height={svgHeight * zoom}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ display: 'block', margin: '0 auto' }}
        >
          <defs>
            <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
            <linearGradient id="male-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="female-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#be185d" />
            </linearGradient>
            <linearGradient id="male-gradient-hl" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="female-gradient-hl" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>

          {edges.map((edge, idx) => {
            const fromLn = layoutNodes.find(n => n.id === edge.from)
            const toLn = layoutNodes.find(n => n.id === edge.to)
            if (!fromLn || !toLn) return null

            const isHighlighted = highlightedIds.has(edge.from) && highlightedIds.has(edge.to)
            const isDimmed = dimmedIds.has(edge.from) || dimmedIds.has(edge.to)
            const opacity = isDimmed ? 0.2 : 1

            if (edge.type === 'spouse') {
              const minX = Math.min(fromLn.x, toLn.x)
              const maxX = Math.max(fromLn.x, toLn.x)
              const y = fromLn.y

              return (
                <g key={`edge-${idx}`} opacity={opacity}>
                  <line
                    x1={minX + nodeWidth / 2}
                    y1={y}
                    x2={maxX - nodeWidth / 2}
                    y2={y}
                    stroke={isHighlighted ? '#f59e0b' : '#eab308'}
                    strokeWidth={isHighlighted ? 3 : 2}
                  />
                  <circle
                    cx={(minX + maxX) / 2}
                    cy={y - 12}
                    r="4"
                    fill={isHighlighted ? '#f59e0b' : '#eab308'}
                  />
                </g>
              )
            } else {
              const fromX = fromLn.x + nodeWidth / 2
              const fromY = fromLn.y + nodeHeight
              const toX = toLn.x + nodeWidth / 2
              const toY = toLn.y

              const midY = (fromY + toY) / 2

              return (
                <path
                  key={`edge-${idx}`}
                  d={`M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`}
                  fill="none"
                  stroke={isHighlighted ? '#f59e0b' : '#a1a1aa'}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  opacity={opacity}
                />
              )
            }
          })}

          {layoutNodes.map((ln) => {
            const isSelected = selectedNode?.id === ln.id
            const isHighlighted = highlightedIds.has(ln.id)
            const isDimmed = dimmedIds.has(ln.id)

            const gradientId = isHighlighted && !isDimmed
              ? (ln.node.gender === 'male' ? 'male-gradient-hl' : 'female-gradient-hl')
              : (ln.node.gender === 'male' ? 'male-gradient' : 'female-gradient')

            const strokeColor = isHighlighted && !isDimmed ? '#f59e0b' : isSelected ? '#3b82f6' : 'transparent'
            const strokeWidth = isHighlighted && !isDimmed ? 3 : isSelected ? 2 : 0

            return (
              <g
                key={ln.id}
                onClick={() => handleNodeClick(ln.node)}
                onDoubleClick={() => navigate(`/family/${familyId}/member/${ln.node.id}`)}
                onMouseEnter={(e) => {
                  setHoveredNode(ln.node)
                  setHoverPosition({ x: e.clientX, y: e.clientY })
                }}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
                opacity={isDimmed ? 0.4 : 1}
              >
                <ellipse
                  cx={ln.x + nodeWidth / 2}
                  cy={ln.y + nodeHeight / 2}
                  rx={nodeWidth / 2 - 2}
                  ry={nodeHeight / 2 - 2}
                  fill={`url(#${gradientId})`}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  filter="url(#node-shadow)"
                />
                <text
                  x={ln.x + nodeWidth / 2}
                  y={ln.y + nodeHeight / 2 - 4}
                  textAnchor="middle"
                  className="text-xs font-semibold"
                  fill="white"
                  style={{ fontSize: '12px', pointerEvents: 'none' }}
                >
                  {ln.node.name.length > 7 ? ln.node.name.slice(0, 6) + '…' : ln.node.name}
                </text>
                <text
                  x={ln.x + nodeWidth / 2}
                  y={ln.y + nodeHeight / 2 + 12}
                  textAnchor="middle"
                  fill="white"
                  fillOpacity={0.85}
                  style={{ fontSize: '10px', pointerEvents: 'none' }}
                >
                  {ln.node.generation_name ? `${ln.node.generation_name}字` : getGenderLabel(ln.node.gender)}
                </text>
                {!ln.node.is_alive && (
                  <text
                    x={ln.x + nodeWidth - 10}
                    y={ln.y + 12}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.7)"
                    fontSize="11px"
                    style={{ pointerEvents: 'none' }}
                  >
                    ✝
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {effectiveHighlightedId && (
        <div className="absolute bottom-4 left-4 rounded-md border bg-card/90 p-2 shadow-lg text-xs">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{highlightedIds.size}</span> 位成员高亮
          </p>
        </div>
      )}

      {selectedNode && (
        <div className="absolute right-4 top-20 w-64 rounded-md border bg-card p-4 shadow-lg animate-fade-in">
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
            {!selectedNode.is_alive && ' · 已故'}
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
