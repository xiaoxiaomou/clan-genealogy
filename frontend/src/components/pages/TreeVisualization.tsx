import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, AvatarDisplay } from '@/components/ui'
import { ZoomIn, ZoomOut, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import type { TreeNode, FamilyTree, Member, TreeEdge, FamilyBranch } from '@/types'

interface TreeVisualizationProps {
  treeData: FamilyTree | null
  members: Member[]
  canEdit: boolean
  familyId: number
  isLoading: boolean
  branches?: FamilyBranch[]
  onEditMember: (member: Member) => void
  onDeleteMember: (memberId: number) => void
  onOpenAddMember: () => void
  onOpenQuickFamily: () => void
  onOpenImport: () => void
}

interface LayoutNode {
  id: number; x: number; y: number; node: TreeNode; generation: number
}

interface HoverInfo {
  node: TreeNode; x: number; y: number
}

interface LayoutResult {
  layoutNodes: LayoutNode[]; svgWidth: number; svgHeight: number
}

interface GraphData {
  childrenOf: Map<number, number[]>
  parentsOf: Map<number, number[]>
  spouseOf: Map<number, number>
  primaryParentOf: Map<number, number>
  primaryTree: Map<number, number[]>
}

const C = {
  paper: '#FFF8E7', paperDark: '#F5ECD7', border: '#8B2500',
  borderLight: '#C8A253', text: '#2C1810', textMuted: '#8B7355',
  male: '#8B2500', female: '#CC3366', brown: '#6B4226',
  gold: '#C8A253', goldLight: '#E8D5A3', spouseLine: '#CC3366', hover: '#D4A017',
}

function getGenderColor(g: string): string {
  return g === 'male' ? C.male : g === 'female' ? C.female : C.textMuted
}

function getGenderLabel(g: string): string {
  return g === 'male' ? '男' : g === 'female' ? '女' : '未知'
}

function buildGraph(nodes: TreeNode[], edges: TreeEdge[]): GraphData {
  const childrenOf = new Map<number, number[]>()
  const parentsOf = new Map<number, number[]>()
  const spouseOf = new Map<number, number>()
  edges.forEach((e) => {
    if (e.type === 'parent') {
      const c = childrenOf.get(e.source) || []; c.push(e.target); childrenOf.set(e.source, c)
      const p = parentsOf.get(e.target) || []; p.push(e.source); parentsOf.set(e.target, p)
    } else if (e.type === 'spouse') spouseOf.set(e.source, e.target)
  })
  edges.forEach((e) => { if (e.type === 'spouse' && !spouseOf.has(e.target)) spouseOf.set(e.target, e.source) })
  const primaryParentOf = new Map<number, number>()
  nodes.forEach((n) => {
    const parents = parentsOf.get(n.id) || []
    if (parents.length > 0) {
      const male = parents.find((p) => nodes.find((nn) => nn.id === p)?.gender === 'male')
      primaryParentOf.set(n.id, male ?? parents[0])
    }
  })
  const primaryTree = new Map<number, number[]>()
  primaryParentOf.forEach((parentId, childId) => {
    const c = primaryTree.get(parentId) || []; c.push(childId); primaryTree.set(parentId, c)
  })
  return { childrenOf, parentsOf, spouseOf, primaryParentOf, primaryTree }
}

function getDescendantIds(nodeId: number, childrenOf: Map<number, number[]>): number[] {
  const r: number[] = []
  const children = childrenOf.get(nodeId) || []
  children.forEach((cid) => { r.push(cid); r.push(...getDescendantIds(cid, childrenOf)) })
  return r
}

function findPathEdges(edges: TreeEdge[], m1: number, m2: number): number[] {
  const adj = new Map<number, number[]>()
  edges.forEach(e => {
    const a = adj.get(e.source) || []; a.push(e.target); adj.set(e.source, a)
    const b = adj.get(e.target) || []; b.push(e.source); adj.set(e.target, b)
  })
  const visited = new Set<number>(), parent = new Map<number, number>(), q: number[] = [m1]
  visited.add(m1)
  while (q.length > 0) {
    const cur = q.shift()!
    if (cur === m2) break
    ;(adj.get(cur) || []).forEach(n => { if (!visited.has(n)) { visited.add(n); parent.set(n, cur); q.push(n) } })
  }
  if (!visited.has(m2)) return []
  const ids: number[] = []; let c = m2
  while (c !== m1) {
    const p = parent.get(c); if (p === undefined) break
    const edge = edges.find(e => (e.source === c && e.target === p) || (e.source === p && e.target === c))
    if (edge) ids.push(edge.id); c = p
  }
  return ids
}

function computeTreeLayout(nodes: TreeNode[], edges: TreeEdge[], siblingOrder?: Map<number, number[]>): LayoutResult {
  if (nodes.length === 0) return { layoutNodes: [], svgWidth: 1000, svgHeight: 800 }
  const NODE_WIDTH = 100, NODE_HEIGHT = 50, H_GAP = 24, V_GAP = 80, PADDING = 50

  const { childrenOf, parentsOf, spouseOf, primaryParentOf, primaryTree } = buildGraph(nodes, edges)
  // 应用兄弟顺序
  if (siblingOrder) {
    primaryTree.forEach((children, pid) => {
      const order = siblingOrder.get(pid)
      if (order) children.sort((a, b) => order.indexOf(a) - order.indexOf(b))
    })
  }

  const colSpan = new Map<number, number>()
  function getSpan(nid: number): number {
    if (colSpan.has(nid)) return colSpan.get(nid)!
    const pc = primaryTree.get(nid) || []
    if (pc.length === 0) { const s = spouseOf.has(nid) ? 2 : 1; colSpan.set(nid, s); return s }
    const s = Math.max(pc.reduce((a, c) => a + getSpan(c), 0), spouseOf.has(nid) ? 2 : 1)
    colSpan.set(nid, s); return s
  }
  nodes.forEach((n) => getSpan(n.id))

  const colMap = new Map<number, number>()
  function assignCol(nid: number, start: number): number {
    if (colMap.has(nid)) return colMap.get(nid)! + getSpan(nid)
    const pc = primaryTree.get(nid) || []; const span = getSpan(nid)
    if (pc.length === 0) {
      colMap.set(nid, start); const sp = spouseOf.get(nid)
      if (sp !== undefined && !colMap.has(sp)) colMap.set(sp, start + 1)
      return start + span
    }
    let cs = start
    pc.forEach((c) => { cs = assignCol(c, cs) })
    const lc = colMap.get(pc[0])!, rc = colMap.get(pc[pc.length - 1])! + getSpan(pc[pc.length - 1])
    const cc = (lc + rc) / 2; const myCol = cc - span / 2
    colMap.set(nid, myCol); const sp = spouseOf.get(nid)
    if (sp !== undefined && !colMap.has(sp)) colMap.set(sp, myCol + 1)
    return start + Math.max(span, rc - start) + 1
  }

  const allChildren = new Set(parentsOf.keys())
  const roots = nodes.filter((n) => !allChildren.has(n.id))
  const rootIds = roots.length > 0 ? roots.map((r) => r.id) : nodes.map((n) => n.id)
  let gstart = 0
  rootIds.forEach((rid) => { if (!colMap.has(rid)) gstart = assignCol(rid, gstart) + 1 })
  nodes.forEach((n) => {
    if (!colMap.has(n.id)) {
      colMap.set(n.id, gstart); const sp = spouseOf.get(n.id)
      if (sp !== undefined && !colMap.has(sp)) colMap.set(sp, gstart + 1)
      gstart += getSpan(n.id) + 1
    }
  })

  const sortedGens = Array.from(new Set(nodes.map((n) => n.generation || 1))).sort((a, b) => a - b)
  const genIndex = new Map<number, number>(); sortedGens.forEach((g, i) => genIndex.set(g, i))
  const UNIT = NODE_WIDTH + H_GAP
  const positions = new Map<number, { x: number; y: number }>()
  nodes.forEach((n) => {
    const gen = n.generation || 1; const col = colMap.get(n.id) ?? 0
    const y = PADDING + (genIndex.get(gen) ?? 0) * (NODE_HEIGHT + V_GAP)
    const x = PADDING + col * UNIT
    positions.set(n.id, { x, y })
  })

  const layoutNodes: LayoutNode[] = nodes.map((node) => {
    const pos = positions.get(node.id) || { x: PADDING, y: PADDING }
    return { id: node.id, x: pos.x, y: pos.y, node, generation: node.generation || 1 }
  })
  let maxX = 0, maxY = 0
  layoutNodes.forEach((ln) => { maxX = Math.max(maxX, ln.x + NODE_WIDTH); maxY = Math.max(maxY, ln.y + NODE_HEIGHT) })
  return { layoutNodes, svgWidth: Math.max(maxX + PADDING, 1000), svgHeight: Math.max(maxY + PADDING, 800) }
}

export default function TreeVisualization({
  treeData, canEdit, familyId, isLoading, branches,
  onEditMember, onDeleteMember,
}: TreeVisualizationProps) {
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 基础状态
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [compareNode, setCompareNode] = useState<TreeNode | null>(null)
  const [pathEdges, setPathEdges] = useState<number[]>([])
  const [hoveredNode, setHoveredNode] = useState<HoverInfo | null>(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })
  const [highlightedNodeId, setHighlightedNodeId] = useState<number | null>(null)
  const [highlightedBranchId, setHighlightedBranchId] = useState<number | null>(null)

  // 展开/折叠
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set())

  // 搜索
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocusedIdx, setSearchFocusedIdx] = useState(0)

  // 筛选
  const [filterGender, setFilterGender] = useState<string>('all')
  const [filterGeneration, setFilterGeneration] = useState<number | null>(null)
  const [filterAlive, setFilterAlive] = useState<string>('all')

  // 拖拽排序
  const [dragState, setDragState] = useState<{
    nodeId: number; startX: number; startY: number
    currentX: number; currentY: number; isDragging: boolean
  } | null>(null)
  const [siblingOrder, setSiblingOrder] = useState<Map<number, number[]>>(new Map())

  // 图数据
  const graph = useMemo<GraphData | null>(() => {
    if (!treeData || treeData.nodes.length === 0) return null
    return buildGraph(treeData.nodes, treeData.edges)
  }, [treeData])

  // 隐藏的节点 ID（折叠后代）
  const hiddenIds = useMemo(() => {
    if (!graph) return new Set<number>()
    const h = new Set<number>()
    collapsedIds.forEach((cid) => getDescendantIds(cid, graph.childrenOf).forEach((d) => h.add(d)))
    return h
  }, [collapsedIds, graph])

  // 搜索匹配
  const searchResults = useMemo(() => {
    if (!searchQuery || !treeData) return []
    const q = searchQuery.toLowerCase()
    return treeData.nodes.filter((n) => n.name.toLowerCase().includes(q))
  }, [searchQuery, treeData])

  // 筛选后的节点
  const filteredNodes = useMemo(() => {
    if (!treeData) return []
    let nodes = treeData.nodes.filter((n) => !hiddenIds.has(n.id))
    if (filterGender !== 'all') nodes = nodes.filter((n) => n.gender === filterGender)
    if (filterGeneration !== null) nodes = nodes.filter((n) => (n.generation || 1) === filterGeneration)
    if (filterAlive === 'alive') nodes = nodes.filter((n) => n.is_alive)
    else if (filterAlive === 'deceased') nodes = nodes.filter((n) => !n.is_alive)
    return nodes
  }, [treeData, hiddenIds, filterGender, filterGeneration, filterAlive])

  // 布局
  const { layoutNodes, svgWidth, svgHeight } = useMemo(() => {
    if (filteredNodes.length === 0) return { layoutNodes: [], svgWidth: 1000, svgHeight: 800 }
    return computeTreeLayout(filteredNodes, treeData?.edges || [], siblingOrder)
  }, [filteredNodes, treeData, siblingOrder])

  // 分支成员
  const branchMemberIds = useMemo(() => {
    if (!branches || !highlightedBranchId || !treeData) return new Set<number>()
    const s = new Set<number>()
    treeData.nodes.filter((n) => n.branch_id === highlightedBranchId).forEach((n) => s.add(n.id))
    return s
  }, [branches, highlightedBranchId, treeData])

  // 可用辈分列表（用于筛选）
  const generationOptions = useMemo(() => {
    if (!treeData) return []
    return Array.from(new Set(treeData.nodes.map((n) => n.generation || 1))).sort((a, b) => a - b)
  }, [treeData])

  // 节点有子节点？（用于显示折叠按钮）
  const nodeHasChildren = useCallback((nodeId: number): boolean => {
    return (graph?.childrenOf.get(nodeId)?.length ?? 0) > 0
  }, [graph])

  // ============ 展开/折叠 ============
  const toggleCollapse = useCallback((nodeId: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId)
      return next
    })
  }, [])

  const collapseAll = useCallback(() => {
    if (!graph || !treeData) return
    const set = new Set<number>()
    treeData.nodes.forEach((n) => { if (nodeHasChildren(n.id)) set.add(n.id) })
    setCollapsedIds(set)
  }, [graph, treeData, nodeHasChildren])

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set())
  }, [])

  // ============ 拖拽排序 ============
  const handleNodeMouseDown = useCallback((nodeId: number, e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as Element
    if (target.closest('[data-collapse-btn]') || target.closest('text')) return
    const ln = layoutNodes.find((n) => n.id === nodeId)
    if (!ln) return
    setDragState({ nodeId, startX: ln.x, startY: ln.y, currentX: ln.x, currentY: ln.y, isDragging: false })
  }, [layoutNodes])

  useEffect(() => {
    if (!dragState) return
    const onMove = (e: MouseEvent) => {
      const svg = svgRef.current; if (!svg) return
      const rect = svg.getBoundingClientRect()
      const svgX = (e.clientX - rect.left) / zoom
      const svgY = (e.clientY - rect.top) / zoom
      setDragState((prev) => prev ? { ...prev, currentX: svgX - 50, currentY: svgY - 25, isDragging: true } : null)
    }
    const onUp = () => {
      if (dragState.isDragging && graph) {
        const nodeId = dragState.nodeId
        const parents = graph.parentsOf.get(nodeId)
        if (parents && parents.length > 0) {
          const pid = parents[0]
          const siblings = (graph.childrenOf.get(pid) || []).filter((s) => s !== nodeId)
          const positions = siblings.map((sid) => ({ id: sid, x: layoutNodes.find((n) => n.id === sid)?.x ?? 0 }))
          positions.sort((a, b) => a.x - b.x)
          const dropX = dragState.currentX + 50
          let insertAt = positions.length
          for (let i = 0; i < positions.length; i++) {
            if (dropX < positions[i].x + 50) { insertAt = i; break }
          }
          const newOrder = positions.map((p) => p.id)
          newOrder.splice(insertAt, 0, nodeId)
          setSiblingOrder((prev) => { const m = new Map(prev); m.set(pid, newOrder); return m })
        }
      }
      setDragState(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragState, graph, layoutNodes, zoom])

  // ============ 选择 ============
  const handleNodeClick = useCallback((node: TreeNode, e: React.MouseEvent) => {
    if (dragState?.isDragging) return
    if ((e.target as Element).closest('[data-collapse-btn]')) return
    if (e.shiftKey || compareNode) {
      if (selectedNode && compareNode) { setCompareNode(node) }
      else if (selectedNode) {
        setCompareNode(node)
        if (treeData && selectedNode.id !== node.id) setPathEdges(findPathEdges(treeData.edges, selectedNode.id, node.id))
      } else setSelectedNode(node)
    } else setSelectedNode(node)
  }, [compareNode, selectedNode, treeData, dragState])

  const clearCompare = useCallback(() => { setSelectedNode(null); setCompareNode(null); setPathEdges([]) }, [])

  // ============ 搜索 ============
  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val); setSearchFocusedIdx(0)
    if (val && treeData) {
      const q = val.toLowerCase()
      const found = treeData.nodes.find((n) => n.name.toLowerCase().includes(q))
      if (found) setHighlightedNodeId(found.id)
    } else setHighlightedNodeId(null)
  }, [treeData])

  const focusSearchResult = useCallback((node: TreeNode) => {
    setHighlightedNodeId(node.id)
    setSelectedNode(node)
    const ln = layoutNodes.find((n) => n.id === node.id)
    if (ln && containerRef.current) {
      const cont = containerRef.current
      const cx = cont.clientWidth / 2, cy = cont.clientHeight / 2
      cont.scrollTo({ left: ln.x * zoom - cx + 50, top: ln.y * zoom - cy + 25, behavior: 'smooth' })
    }
  }, [layoutNodes, zoom])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!searchResults.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSearchFocusedIdx((i) => Math.min(i + 1, searchResults.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchFocusedIdx((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { focusSearchResult(searchResults[searchFocusedIdx]); setSearchQuery(searchResults[searchFocusedIdx].name) }
  }, [searchResults, searchFocusedIdx, focusSearchResult])

  // ============ 缩放 ============
  const zoomIn = useCallback(() => setZoom((z) => Math.min(2, z + 0.2)), [])
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.5, z - 0.2)), [])

  // ============ 分支高亮 ============
  const handleBranchSelect = useCallback((val: string) => {
    setHighlightedBranchId(val ? Number(val) : null)
  }, [])

  const hasPath = pathEdges.length > 0

  // ============ 加载/空状态 ============
  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-md border bg-card shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">加载族谱数据...</p>
        </div>
      </div>
    )
  }
  if (!treeData || treeData.nodes.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-md border bg-card shadow-sm">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">暂无族谱数据</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenAddMember?.()}>添加成员</Button>
            <Button variant="outline" size="sm" onClick={() => onOpenQuickFamily?.()}>快速建家庭</Button>
            <Button variant="outline" size="sm" onClick={() => onOpenImport?.()}>批量导入</Button>
          </div>
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

      {/* 工具栏 */}
      <div className="absolute left-2 top-2 right-2 z-10 flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border shadow-sm">
        {/* 缩放 */}
        <Button variant="outline" size="icon" onClick={zoomIn} className="h-7 w-7" aria-label="放大"><ZoomIn className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="icon" onClick={zoomOut} className="h-7 w-7" aria-label="缩小"><ZoomOut className="h-3.5 w-3.5" /></Button>
        <span className="text-[11px] text-muted-foreground w-10">{Math.round(zoom * 100)}%</span>
        <div className="w-px h-5 bg-border mx-1" />

        {/* 展开/折叠 */}
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={expandAll} title="全部展开">
          <ChevronDown className="h-3 w-3" />展开
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={collapseAll} title="全部折叠">
          <ChevronRight className="h-3 w-3" />折叠
        </Button>
        <div className="w-px h-5 bg-border mx-1" />

        {/* 搜索 */}
        <div className="relative flex-1 min-w-[120px] max-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="搜索成员..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full h-7 pl-7 pr-6 text-xs border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-border"
          />
          {searchQuery && (
            <button onClick={() => { handleSearchChange(''); searchInputRef.current?.focus() }}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
          {searchQuery && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
              {searchResults.map((node, i) => (
                <button
                  key={node.id}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-accent
                    ${i === searchFocusedIdx ? 'bg-accent' : ''}
                    ${highlightedNodeId === node.id ? 'text-primary font-medium' : 'text-foreground'}`}
                  onMouseDown={() => { focusSearchResult(node); setSearchQuery(node.name) }}
                >
                  <span className="w-4 h-4 rounded inline-flex items-center justify-center text-[10px] text-white shrink-0"
                    style={{ backgroundColor: getGenderColor(node.gender) }}>
                    {getGenderLabel(node.gender)}
                  </span>
                  {node.name}
                  <span className="ml-auto text-muted-foreground">
                    {node.generation_name ? `${node.generation_name}辈` : `第${node.generation || '?'}代`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 筛选 */}
        <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}
          className="h-7 px-1.5 text-[11px] border rounded bg-background text-foreground">
          <option value="all">全部性别</option>
          <option value="male">男</option>
          <option value="female">女</option>
        </select>
        <select value={filterGeneration ?? ''} onChange={(e) => setFilterGeneration(e.target.value ? Number(e.target.value) : null)}
          className="h-7 px-1.5 text-[11px] border rounded bg-background text-foreground max-w-[90px]">
          <option value="">全部辈分</option>
          {generationOptions.map((g) => <option key={g} value={g}>第{g}代</option>)}
        </select>
        <select value={filterAlive} onChange={(e) => setFilterAlive(e.target.value)}
          className="h-7 px-1.5 text-[11px] border rounded bg-background text-foreground">
          <option value="all">全部状态</option>
          <option value="alive">在世</option>
          <option value="deceased">已故</option>
        </select>

        {hasPath && (
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={clearCompare}>
            清除比较
          </Button>
        )}

        {/* 分支高亮 */}
        {branches && branches.length > 0 && (
          <select value={highlightedBranchId ?? ''} onChange={(e) => handleBranchSelect(e.target.value)}
            className="h-7 px-1.5 text-[11px] border rounded bg-background text-foreground max-w-[110px]">
            <option value="">分支高亮</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}（{b.member_count}人）</option>)}
          </select>
        )}

        <span className="text-[10px] text-muted-foreground ml-auto">
          {filteredNodes.length} / {treeData.nodes.length} 人
        </span>
      </div>

      {/* SVG 画布 */}
      <div ref={containerRef} className="h-[600px] overflow-auto" style={{ backgroundColor: C.paper }}>
        <svg ref={svgRef} width={svgWidth} height={svgHeight}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          <defs>
            <pattern id="paper-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E8DDC8" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
            <filter id="plaque-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8B2500" floodOpacity="0.12" />
            </filter>
            <filter id="plaque-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#C8A253" floodOpacity="0.35" />
            </filter>
          </defs>

          <rect width={svgWidth} height={svgHeight} fill={C.paper} />
          <rect width={svgWidth} height={svgHeight} fill="url(#paper-grid)" />

          {/* 连线 */}
          {treeData.edges.map((edge) => {
            const src = layoutNodes.find((n) => n.id === edge.source)
            const tgt = layoutNodes.find((n) => n.id === edge.target)
            if (!src || !tgt) return null
            const isPath = pathEdges.includes(edge.id)
            const sx = src.x + 50, sy = src.y + 50, tx = tgt.x + 50, ty = tgt.y
            if (edge.type === 'parent') {
              const midY = (sy + ty) / 2
              return (
                <g key={`edge-${edge.id}`} style={{ opacity: isPath || !dragState ? 1 : 0.3 }}>
                  <path d={`M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`}
                    fill="none" stroke={isPath ? '#D4870E' : C.brown} strokeWidth={isPath ? 2.5 : 1.2}
                    strokeOpacity={isPath ? 1 : 0.45} strokeLinejoin="round"
                  />
                  {!isPath && <circle cx={sx} cy={midY} r={1.5} fill={C.brown} fillOpacity={0.25} />}
                </g>
              )
            } else if (edge.type === 'spouse') {
              const mx = (sx + tx) / 2, my = src.y + 25
              return (
                <g key={`edge-${edge.id}`}>
                  <line x1={sx} y1={my} x2={tx} y2={my}
                    stroke={isPath ? '#D4870E' : C.spouseLine} strokeWidth={isPath ? 2.5 : 1}
                    strokeDasharray={isPath ? '0' : '3 2'} strokeOpacity={isPath ? 1 : 0.5}
                  />
                  <rect x={mx - 3.5} y={my - 3.5} width={7} height={7} rx={1}
                    fill={C.paper} stroke={C.spouseLine} strokeWidth={0.8} strokeOpacity={0.6}
                    transform={`rotate(45 ${mx} ${my})`}
                  />
                </g>
              )
            }
            return null
          })}

          {/* 节点 */}
          {layoutNodes.map((ln) => {
            const isSelected = selectedNode?.id === ln.id
            const isHighlighted = highlightedNodeId === ln.id || branchMemberIds.has(ln.id)
            const isHovered = hoveredNode?.node.id === ln.id
            const isCollapsed = collapsedIds.has(ln.id)
            const hasChildren = nodeHasChildren(ln.id)
            const isDragging = dragState?.nodeId === ln.id && dragState.isDragging

            const nodeX = isDragging ? dragState.currentX : ln.x
            const nodeY = isDragging ? dragState.currentY : ln.y
            const nodeOpacity = isDragging ? 0.7 : 1

            return (
              <g key={ln.id}
                onMouseDown={(e) => handleNodeMouseDown(ln.id, e)}
                onClick={(e) => handleNodeClick(ln.node, e)}
                onDoubleClick={() => { if (!isDragging) navigate(`/family/${familyId}/member/${ln.node.id}`) }}
                onMouseEnter={(e) => {
                  if (isDragging) return
                  setHoveredNode({ node: ln.node, x: e.clientX, y: e.clientY })
                  const svg = (e.target as Element).closest('svg')
                  const rect = svg?.getBoundingClientRect()
                  if (rect) setHoverPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                }}
                onMouseLeave={() => { if (!isDragging) setHoveredNode(null) }}
                className="cursor-pointer" style={{ opacity: nodeOpacity, transition: 'opacity 0.15s' }}
              >
                {/* 主牌位 */}
                <rect x={nodeX} y={nodeY} width={100} height={50} rx={4}
                  fill={isHovered ? '#FDF6E3' : isSelected ? '#FCF3D9' : isHighlighted ? '#FEF3C7' : '#FFFDF5'}
                  stroke={isHovered ? C.hover : isSelected ? C.borderLight : isHighlighted ? '#F59E0B' : getGenderColor(ln.node.gender)}
                  strokeWidth={isHovered || isSelected || isHighlighted ? 2 : 1}
                  filter={isHovered ? 'url(#plaque-glow)' : 'url(#plaque-shadow)'}
                />
                <rect x={nodeX + 3} y={nodeY + 3} width={94} height={44} rx={2.5}
                  fill="none" stroke={C.borderLight} strokeWidth={0.5} strokeOpacity={0.4}
                />
                {/* 性别色条 */}
                <rect x={nodeX + 1} y={nodeY + 3} width={4} height={44} rx={1.5}
                  fill={getGenderColor(ln.node.gender)} fillOpacity={0.7}
                />
                {/* 四角装饰 */}
                <path d={`M ${nodeX + 4} ${nodeY + 8} L ${nodeX + 4} ${nodeY + 4} L ${nodeX + 8} ${nodeY + 4}`}
                  fill="none" stroke={C.borderLight} strokeWidth={0.7} strokeOpacity={0.5} />
                <path d={`M ${nodeX + 96} ${nodeY + 8} L ${nodeX + 96} ${nodeY + 4} L ${nodeX + 92} ${nodeY + 4}`}
                  fill="none" stroke={C.borderLight} strokeWidth={0.7} strokeOpacity={0.5} />
                <path d={`M ${nodeX + 4} ${nodeY + 42} L ${nodeX + 4} ${nodeY + 46} L ${nodeX + 8} ${nodeY + 46}`}
                  fill="none" stroke={C.borderLight} strokeWidth={0.7} strokeOpacity={0.5} />
                <path d={`M ${nodeX + 96} ${nodeY + 42} L ${nodeX + 96} ${nodeY + 46} L ${nodeX + 92} ${nodeY + 46}`}
                  fill="none" stroke={C.borderLight} strokeWidth={0.7} strokeOpacity={0.5} />
                {/* 姓名 */}
                <text x={nodeX + 52} y={nodeY + 23} textAnchor="middle"
                  fontFamily="'Noto Serif SC','SimSun',serif" fontSize="13" fontWeight="bold" fill={C.text}>
                  {ln.node.name}
                </text>
                {/* 小字 */}
                <text x={nodeX + 52} y={nodeY + 39} textAnchor="middle"
                  fontFamily="'Noto Sans SC',sans-serif" fontSize="10" fill={C.textMuted}>
                  {ln.node.generation_name ? `${ln.node.generation_name}字辈` : getGenderLabel(ln.node.gender)}
                </text>
                {/* 已故标记 */}
                {!ln.node.is_alive && (
                  <text x={nodeX + 89} y={nodeY + 14} fill={C.textMuted} fontSize="11" fontFamily="serif" opacity={0.7}>†</text>
                )}
                {/* 折叠/展开按钮 */}
                {hasChildren && (
                  <g data-collapse-btn="true" onClick={(e) => { e.stopPropagation(); toggleCollapse(ln.id) }}
                    className="cursor-pointer" transform={`translate(${nodeX + 91}, ${nodeY + 38})`}>
                    <rect x={-6} y={-6} width={12} height={12} rx={2} fill={C.paper}
                      stroke={C.textMuted} strokeWidth={0.8} strokeOpacity={0.5} />
                    <text x={0} y={2} textAnchor="middle" dominantBaseline="middle"
                      fill={C.textMuted} fontSize="7" fontFamily="sans-serif">
                      {isCollapsed ? '+' : '−'}
                    </text>
                  </g>
                )}
                {/* 拖拽幽灵指示 */}
                {isDragging && (
                  <rect x={nodeX} y={nodeY - 3} width={100} height={3} rx={1.5} fill={C.gold} fillOpacity={0.5} />
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* 拖拽中提示 */}
      {dragState?.isDragging && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border rounded-full px-4 py-1.5 shadow-lg text-xs text-muted-foreground z-20 animate-fade-in">
          拖拽到目标位置以调整顺序
        </div>
      )}

      {/* 选中面板 */}
      {selectedNode && (
        <div className="absolute right-2 top-16 w-56 rounded-md border bg-card/95 backdrop-blur-sm p-3 shadow-lg animate-fade-in z-10">
          <div className="flex items-start justify-between mb-2">
            <AvatarDisplay avatar={selectedNode.avatar} name={selectedNode.name} gender={selectedNode.gender} size={36} />
            <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
          </div>
          <h3 className="mb-0.5 font-semibold text-sm" style={{ fontFamily: "'Noto Serif SC',serif" }}>{selectedNode.name}</h3>
          <p className="mb-2 text-[11px] text-muted-foreground">
            {getGenderLabel(selectedNode.gender)}
            {selectedNode.generation_name && ` · ${selectedNode.generation_name}字辈`}
            {!selectedNode.is_alive && ' · 已故'}
          </p>
          {selectedNode.birth_date && <p className="text-[11px] text-muted-foreground">出生：{selectedNode.birth_date}</p>}
          {selectedNode.death_date && <p className="text-[11px] text-muted-foreground">逝世：{selectedNode.death_date}</p>}
          {canEdit && (
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs"
                onClick={() => { const m = treeData?.nodes.find(n => n.id === selectedNode.id); if (m) { onEditMember(m as unknown as Member); setSelectedNode(null) } }}>
                编辑
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => { onDeleteMember(selectedNode.id); setSelectedNode(null) }}>
                删除
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 悬停提示 */}
      {hoveredNode && !dragState && (
        <div className="pointer-events-none fixed z-50 rounded-md border bg-card/95 backdrop-blur-sm p-2.5 shadow-lg animate-fade-in"
          style={{ left: hoverPosition.x + 12, top: hoverPosition.y + 12, maxWidth: 240 }}>
          <div className="flex items-center gap-2">
            <AvatarDisplay avatar={hoveredNode.node.avatar} name={hoveredNode.node.name} gender={hoveredNode.node.gender} size={28} />
            <div>
              <h4 className="font-semibold text-xs" style={{ fontFamily: "'Noto Serif SC',serif" }}>{hoveredNode.node.name}</h4>
              <p className="text-[10px] text-muted-foreground">
                {getGenderLabel(hoveredNode.node.gender)}
                {hoveredNode.node.generation_name && ` · ${hoveredNode.node.generation_name}字辈`}
                {!hoveredNode.node.is_alive && ' · 已故'}
              </p>
            </div>
          </div>
          {hoveredNode.node.birth_date && <p className="mt-1 text-[10px] text-muted-foreground">出生：{hoveredNode.node.birth_date}</p>}
          {hoveredNode.node.death_date && <p className="text-[10px] text-muted-foreground">逝世：{hoveredNode.node.death_date}</p>}
          {hoveredNode.node.bio && <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{hoveredNode.node.bio}</p>}
        </div>
      )}
    </div>
  )
}
