import { useMemo, useState, useCallback, useRef, useEffect, memo } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { AvatarDisplay } from '@/components/ui'
import { MemberTooltip } from '@/components/tree-engine/nodes/MemberTooltip'
import type { TreeNode, FamilyTree } from '@/types'
import type { ManualEdge, EditingMode, AddingState, DragHandle, HistoryState } from '@/types/manualEdge'
import { ManualEdgeToolbar, EdgeCreationDialog, ManualEdgeComponent } from '@/components/manual-edge'
import { useHistory } from '@/hooks/useHistory'
import { useLineageHighlight } from '@/hooks/useLineageHighlight'
import { useTreeSearch } from '@/hooks/useTreeSearch'
import { LineageToolbar } from '@/components/tree/LineageToolbar'
import { TreeSearchPalette } from '@/components/tree/TreeSearchPalette'

// 高亮配色（A1 金线 / A2 路径）—— 谱牒化：描金/墨绿/朱红
const HIGHLIGHT_COLORS = {
  up: '#B8963F',
  down: '#5F8A5F',
  path: '#A63A2E',
  pulse: '#A63A2E',
  dimmed: 0.3,
}

interface HoverInfo {
  member: TreeNode
  x: number
  y: number
}

interface SelectedEdgeInfo {
  id: string
  edge: ManualEdge
  sourceName: string
  targetName: string
}

const NODE_WIDTH = 160
const NODE_HEIGHT = 80

/* ═══ 谱牒化：朱印红唯一强调色，其余走主题令牌/墨调语义色 ═══ */
const PG_RED = '#A63A2E'
const GENDER_INK = { male: '#5B7A95', female: '#A76A8C' } as const
const EDGE_INK = 'hsl(var(--muted-foreground))'

/* 世代条：墨青调，深浅示辈分 */
const GEN_BASE_COLOR = { h: 160, s: 24, l: 30 }

function getGenerationColor(generation: number | null): string {
  const gen = generation || 1
  const step = 6
  const lightness = Math.min(GEN_BASE_COLOR.l + gen * step, 70)
  return `hsl(${GEN_BASE_COLOR.h}, ${GEN_BASE_COLOR.s}%, ${lightness}%)`
}

function getGenderColor(gender: string): string {
  switch (gender) {
    case 'male':
      return GENDER_INK.male
    case 'female':
      return GENDER_INK.female
    default:
      return EDGE_INK
  }
}

interface FamilyMemberNodeData {
  [key: string]: unknown
  member: TreeNode
  isHighlighted: boolean
  isDimmed: boolean
  highlightRole: 'normal' | 'up' | 'down' | 'path' | 'pulse'
  onHover?: (member: TreeNode | null, x?: number, y?: number) => void
}

/** memo：上层状态变化时未受影响节点不重渲染 */
const FamilyMemberNodeComponent = memo(function FamilyMemberNodeComponent({ data }: { data: FamilyMemberNodeData }) {
  const member = data.member as TreeNode
  const isHighlighted = data.isHighlighted as boolean
  const isDimmed = data.isDimmed as boolean
  const highlightRole = (data.highlightRole as FamilyMemberNodeData['highlightRole']) || 'normal'
  const onHover = data.onHover as ((member: TreeNode | null, x?: number, y?: number) => void) | undefined

  const roleColor: string | null =
    highlightRole === 'up' ? HIGHLIGHT_COLORS.up :
    highlightRole === 'down' ? HIGHLIGHT_COLORS.down :
    highlightRole === 'path' ? HIGHLIGHT_COLORS.path :
    highlightRole === 'pulse' ? HIGHLIGHT_COLORS.pulse :
    null
  const borderColor = roleColor || (isHighlighted ? HIGHLIGHT_COLORS.up : 'hsl(var(--border))')
  const opacity = isDimmed ? HIGHLIGHT_COLORS.dimmed : 1
  const isPulsing = highlightRole === 'pulse'
  const isDead = !member.is_alive
  const ziLine =
    member.courtesy_name || member.art_name
      ? [member.courtesy_name && `字${member.courtesy_name}`, member.art_name && `号${member.art_name}`]
          .filter(Boolean)
          .join('　')
      : null
  const ringStyle = isPulsing
    ? {
        boxShadow: `0 0 0 0 ${HIGHLIGHT_COLORS.pulse}80`,
        animation: 'lineage-pulse 1.4s ease-out infinite',
      }
    : undefined

  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        opacity,
        transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.3s ease',
        ...(ringStyle || {}),
      }}
      className="relative"
      onMouseEnter={(e) => onHover?.(member, e.clientX, e.clientY)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-muted-foreground !w-2 !h-2"
      />

      {/* 谱牒纸牌：纸面随主题，顶部世代条，左缘性别条，右上字辈朱印 */}
      <div
        className="relative h-full w-full cursor-pointer overflow-hidden rounded-[4px] border transition-shadow hover:shadow-lg"
        style={{
          borderColor,
          borderWidth: roleColor || isHighlighted ? 1.5 : 1,
          background: isDead ? 'hsl(var(--muted) / 0.55)' : 'hsl(var(--card))',
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: getGenerationColor(member.generation) }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 top-[3px] w-[3px]"
          style={{ background: getGenderColor(member.gender) }}
          aria-hidden="true"
        />
        {member.generation_name && (
          <div
            className="absolute right-1.5 top-2 h-[17px] w-[17px] rounded-[3px] text-center font-serif text-[11px] leading-[17px] text-white"
            style={{ backgroundColor: PG_RED }}
            title={`字辈：${member.generation_name}`}
            aria-hidden="true"
          >
            {member.generation_name.charAt(0)}
          </div>
        )}
        {highlightRole === 'path' && (
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b px-1.5 py-px text-[9px] leading-none text-white"
            style={{ backgroundColor: PG_RED, letterSpacing: '0.2em' }}
            aria-hidden="true"
          >
            路径
          </div>
        )}

        <div className="flex h-full flex-col items-center justify-center gap-0.5 px-2.5 pb-0.5 pt-[7px] text-center">
          <div className="flex w-full items-center justify-center gap-1.5">
            <AvatarDisplay
              name={member.name}
              avatar={member.avatar}
              size={24}
              className="flex-shrink-0"
            />
            <span
              className="truncate font-serif text-[15px] font-semibold tracking-wide"
              style={{ opacity: isDead ? 0.72 : 1 }}
            >
              {member.name}
              {!member.is_alive && <span className="ml-0.5 text-[11px] text-muted-foreground">†</span>}
            </span>
          </div>
          <p className="min-h-[12px] w-full truncate text-[10px] leading-none text-muted-foreground">
            {ziLine || '\u00A0'}
          </p>
          <p className="w-full truncate text-[10px] leading-none tracking-wide text-muted-foreground">
            {member.birth_date ? `${member.birth_date.slice(0, 4)} ~ ${member.death_date?.slice(0, 4) ?? ''}` : ''}
          </p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-muted-foreground !w-2 !h-2"
      />
    </div>
  )
})

const nodeTypes = {
  familyMember: FamilyMemberNodeComponent,
}

interface FamilyEdgeData {
  sourceName: string
  targetName: string
  isSelected: boolean
  isHighlighted: boolean
  highlightColor?: string
  highlightDimmed?: boolean
}

interface FamilyEdgeComponentProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: string
  targetPosition: string
  data?: FamilyEdgeData
  selected?: boolean
  markerEnd?: string
}

function FamilyEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: FamilyEdgeComponentProps) {
  const edgeData = data as FamilyEdgeData | undefined
  const isSelected = selected || edgeData?.isSelected
  const isHighlighted = edgeData?.isHighlighted
  const highlightColor = edgeData?.highlightColor
  const isDimmed = edgeData?.highlightDimmed

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 14,
  })

  const strokeColor = isSelected
    ? PG_RED
    : highlightColor
    ? highlightColor
    : isHighlighted
    ? HIGHLIGHT_COLORS.up
    : EDGE_INK
  const strokeWidth = isSelected ? 2.5 : (highlightColor || isHighlighted) ? 2.2 : 1.5
  const opacity = isDimmed ? HIGHLIGHT_COLORS.dimmed : isHighlighted || highlightColor ? 1 : 0.85

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          opacity,
          transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.3s',
        }}
      />
      {isSelected && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-all cursor-pointer nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <div
              className="px-2 py-0.5 text-xs shadow-lg"
              style={{ backgroundColor: PG_RED, color: '#fff', fontFamily: "'Noto Serif SC', 'STSong', 'KaiTi', serif", letterSpacing: '0.08em' }}
            >
              父子关系
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const edgeTypes = {
  familyEdge: FamilyEdgeComponent,
}

function FlowInit({ onInit }: { onInit: (instance: ReturnType<typeof useReactFlow>) => void }) {
  const instance = useReactFlow()
  useEffect(() => { onInit(instance) }, [instance, onInit])
  return null
}

interface FamilyTreeGraphProps {
  treeData: FamilyTree | null
  onMemberClick?: (member: TreeNode) => void
  highlightedMemberId?: number | null
  canEdit?: boolean
  familyId?: number
}

export default function FamilyTreeGraph({
  treeData,
  canEdit = false,
  onMemberClick,
  highlightedMemberId,
  familyId,
}: FamilyTreeGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<HoverInfo | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdgeInfo | null>(null)
  const [mode, setMode] = useState<EditingMode>('default')
  const [addingState, setAddingState] = useState<AddingState>({
    step: 'select-source',
    sourceId: null,
    sourceName: null,
    targetId: null,
    targetName: null,
  })
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    mode: 'create' | 'edit'
    edge?: ManualEdge
  }>({ isOpen: false, mode: 'create' })

  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useRef<ReturnType<typeof useReactFlow> | null>(null)

  const historyManager = useHistory()
  const [historyState, setHistoryState] = useState<HistoryState>(() => historyManager.createInitialState())

  // A1+A2 高亮 hook
  const lineage = useLineageHighlight({ familyId, externalAnchorId: highlightedMemberId })

  // A7 搜索 hook
  const search = useTreeSearch({
    familyId,
    onLocate: (memberId) => {
      lineage.pulse(memberId)
      // 平滑居中
      const inst = reactFlowInstance.current
      if (inst) {
        const node = inst.getNode(String(memberId))
        if (node) {
          const cx = node.position.x + NODE_WIDTH / 2
          const cy = node.position.y + NODE_HEIGHT / 2
          inst.setCenter(cx, cy, { zoom: 1.0, duration: 600 })
        }
      }
    },
  })

  const handleHover = (member: TreeNode | null, x?: number, y?: number) => {
    if (member && x !== undefined && y !== undefined) {
      setHoveredNode({ member, x, y })
    } else {
      setHoveredNode(null)
    }
  }

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: { id: string; source: string; target: string; data?: FamilyEdgeData }) => {
    const edgeData = edge.data
    if (edgeData) {
      setSelectedEdge({
        id: edge.id,
        edge: { id: edge.id, source: edge.source, target: edge.target, label: '父子关系', color: '#94a3b8', lineStyle: 'solid' },
        sourceName: edgeData.sourceName,
        targetName: edgeData.targetName,
      })
    }
  }, [])

  const handleManualEdgeSelect = useCallback((edge: ManualEdge, sourceName: string, targetName: string) => {
    setSelectedEdge({
      id: edge.id,
      edge,
      sourceName,
      targetName,
    })
  }, [])

  const handlePaneClick = useCallback(() => {
    if (mode === 'adding' && addingState.step === 'select-source') {
      return
    }
    setSelectedEdge(null)
    if (mode === 'adding') {
      setAddingState({ step: 'select-source', sourceId: null, sourceName: null, targetId: null, targetName: null })
    }
  }, [mode, addingState.step])

  const handleNodeClick = useCallback((_: unknown, node: { data: FamilyMemberNodeData; id: string }) => {
    const member = node.data?.member as TreeNode | undefined
    const memberId = member ? Number(member.id) : Number(node.id)

    if (mode === 'adding') {
      if (addingState.step === 'select-source') {
        setAddingState({
          step: 'select-target',
          sourceId: node.id,
          sourceName: member?.name || node.id,
          targetId: null,
          targetName: null,
        })
      } else if (addingState.step === 'select-target' && node.id !== addingState.sourceId) {
        setAddingState({
          ...addingState,
          targetId: node.id,
          targetName: member?.name || node.id,
          step: 'confirm',
        })
        setDialogState({ isOpen: true, mode: 'create' })
      }
      return
    }

    // A1/A2 高亮模式优先
    if (lineage.mode !== 'none' && member) {
      void lineage.applyOnNode(memberId, member.name)
      return
    }

    if (onMemberClick && member) {
      onMemberClick(member)
    }
  }, [mode, addingState, onMemberClick, lineage])

  const handleManualEdgeDragStart = useCallback((_handle: DragHandle) => {
  }, [])

  const handleManualEdgeDragEnd = useCallback((handle: DragHandle, newNodeId: string | null) => {
    if (!newNodeId) return

    const currentEdge = historyState.present.find(e => e.id === handle.edgeId)
    if (!currentEdge) return

    const targetNode = reactFlowInstance.current?.getNode(newNodeId)
    const targetMember = targetNode?.data?.member as TreeNode | undefined
    const targetName = targetMember?.name || newNodeId

    const isSameEdge = handle.handleType === 'source'
      ? currentEdge.target === newNodeId
      : currentEdge.source === newNodeId

    if (isSameEdge) return

    const updatedEdge: ManualEdge = {
      ...currentEdge,
      [handle.handleType]: newNodeId,
    }

    setHistoryState(prev => historyManager.updateEdge(prev, currentEdge, updatedEdge))
    setSelectedEdge({
      id: updatedEdge.id,
      edge: updatedEdge,
      sourceName: handle.handleType === 'source' ? targetName : (handle.handleType === 'target' && targetNode ? currentEdge.source : ''),
      targetName: handle.handleType === 'target' ? targetName : (handle.handleType === 'source' && targetNode ? currentEdge.target : ''),
    })
  }, [historyState.present, reactFlowInstance, historyManager])

  const { nodes, edges } = useMemo(() => {
    if (!treeData || treeData.nodes.length === 0) {
      return { nodes: [], edges: [] }
    }

    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100 })

    const activeHighlight = lineage.highlight
    const activeHasHighlight = !!activeHighlight
    const activeNodeIds = activeHighlight?.nodeIds
    const activeEdgeKeys = activeHighlight?.edgeKeys
    const activeMode = activeHighlight?.mode

    const colorByMode: Record<string, string> = {
      up: HIGHLIGHT_COLORS.up,
      down: HIGHLIGHT_COLORS.down,
      path: HIGHLIGHT_COLORS.path,
      pulse: HIGHLIGHT_COLORS.pulse,
    }
    const edgeColor = activeMode ? colorByMode[activeMode] : null

    // O(1) 查找表：避免每条边/每个节点都线性扫描（N² → N）
    const treeNodeById = new Map(treeData.nodes.map((n) => [n.id, n]))

    const nodes = treeData.nodes.map((node) => {
      let isHighlighted = false
      let isDimmed = false
      let highlightRole: 'normal' | 'up' | 'down' | 'path' | 'pulse' = 'normal'

      if (activeHasHighlight && activeNodeIds && activeNodeIds.has(node.id)) {
        isHighlighted = true
        highlightRole = (activeMode as 'up' | 'down' | 'path' | 'pulse') || 'pulse'
      } else if (activeHasHighlight) {
        isDimmed = true
      } else if (highlightedMemberId === node.id) {
        isHighlighted = true
        highlightRole = 'pulse'
      } else if (highlightedMemberId !== null) {
        isDimmed = true
      }

      return {
        id: String(node.id),
        type: 'familyMember',
        position: { x: 0, y: 0 },
        data: {
          member: node,
          isHighlighted,
          isDimmed,
          highlightRole,
          onHover: handleHover,
        },
      }
    })

    const flowNodeById = new Map(nodes.map((n) => [n.id, n]))

    const edges = treeData.edges
      .filter((edge) => edge.type === 'parent')
      .map((edge) => {
        const sourceNode = treeNodeById.get(edge.source)
        const targetNode = treeNodeById.get(edge.target)
        const edgeKey = `${Math.min(edge.source, edge.target)}-${Math.max(edge.source, edge.target)}`
        const isHighlightedByExternal = highlightedMemberId === edge.source || highlightedMemberId === edge.target
        const isHighlightedByLineage = !!activeEdgeKeys && activeEdgeKeys.has(edgeKey)
        const isHighlighted = isHighlightedByLineage || isHighlightedByExternal
        const isDimmed = activeHasHighlight && !isHighlightedByLineage

        return {
          id: `edge-${edge.source}-${edge.target}`,
          source: String(edge.source),
          target: String(edge.target),
          type: 'familyEdge',
          data: {
            sourceName: sourceNode?.name || '',
            targetName: targetNode?.name || '',
            isSelected: false,
            isHighlighted,
            highlightColor: isHighlightedByLineage && edgeColor ? edgeColor : undefined,
            highlightDimmed: isDimmed,
          },
          animated: isHighlighted,
        }
      })

    const sortedNodes = [...treeData.nodes].sort((a, b) => {
      const genA = a.generation || 999
      const genB = b.generation || 999
      return genA - genB
    })

    sortedNodes.forEach((node) => {
      const nodeData = flowNodeById.get(String(node.id))
      if (nodeData) {
        dagreGraph.setNode(nodeData.id, {
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          rank: node.generation || 999,
        })
      }
    })

    edges.forEach((edge: { source: string; target: string }) => {
      dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    nodes.forEach((node: { id: string; position: { x: number; y: number } }) => {
      const nodeWithPosition = dagreGraph.node(node.id) as { x: number; y: number } | undefined
      if (nodeWithPosition) {
        node.position = {
          x: nodeWithPosition.x - NODE_WIDTH / 2,
          y: nodeWithPosition.y - NODE_HEIGHT / 2,
        }
      }
    })

    return { nodes, edges }
  }, [treeData, highlightedMemberId, lineage.highlight])

  const manualEdges = useMemo(() => {
    return historyState.present.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'manual',
      data: {
        edge,
        isManual: true,
        onSelect: () => handleManualEdgeSelect(edge, addingState.sourceName || edge.source, addingState.targetName || edge.target),
        onDragStart: handleManualEdgeDragStart,
        onDragEnd: handleManualEdgeDragEnd,
      },
    }))
  }, [historyState.present, handleManualEdgeSelect, addingState, handleManualEdgeDragStart, handleManualEdgeDragEnd])

  const allEdges = useMemo(() => {
    const familyEdges = edges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        isSelected: selectedEdge?.id === edge.id,
      },
    }))
    return [...familyEdges, ...manualEdges]
  }, [edges, selectedEdge])

  const canUndo = historyManager.canUndo(historyState)
  const canRedo = historyManager.canRedo(historyState)

  const handleUndo = useCallback(() => {
    setHistoryState(prev => historyManager.undo(prev))
  }, [historyManager])

  const handleRedo = useCallback(() => {
    setHistoryState(prev => historyManager.redo(prev))
  }, [historyManager])

  const handleDeleteSelected = useCallback(() => {
    if (selectedEdge && selectedEdge.edge) {
      setHistoryState(prev => historyManager.deleteEdge(prev, selectedEdge.edge))
      setSelectedEdge(null)
    }
  }, [selectedEdge, historyManager])

  const handleDialogConfirm = useCallback((edge: ManualEdge) => {
    if (dialogState.mode === 'create') {
      const newEdge = {
        ...edge,
        source: addingState.sourceId!,
        target: addingState.targetId!,
      }
      setHistoryState(prev => historyManager.addEdge(prev, newEdge))
      setAddingState({ step: 'select-source', sourceId: null, sourceName: null, targetId: null, targetName: null })
    } else if (dialogState.mode === 'edit' && dialogState.edge) {
      const existingEdge = dialogState.edge
      setHistoryState(prev => historyManager.updateEdge(prev, existingEdge, edge))
    }
  }, [dialogState.mode, dialogState.edge, addingState.sourceId, addingState.targetId, historyManager])

  const handleDialogClose = useCallback(() => {
    setDialogState({ isOpen: false, mode: 'create' })
    if (mode === 'adding') {
      setAddingState({ step: 'select-source', sourceId: null, sourceName: null, targetId: null, targetName: null })
    }
  }, [mode])

  const handleModeChange = useCallback((newMode: EditingMode) => {
    setMode(newMode)
    if (newMode !== 'adding') {
      setAddingState({ step: 'select-source', sourceId: null, sourceName: null, targetId: null, targetName: null })
    }
  }, [])

  const handleFlowInit = useCallback((instance: ReturnType<typeof useReactFlow>) => {
    reactFlowInstance.current = instance
  }, [])

  if (!treeData || treeData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 md:h-96 text-muted-foreground">
        暂无成员数据
      </div>
    )
  }

  return (
    <div ref={reactFlowWrapper} className="relative h-64 md:h-[600px] w-full border rounded-lg overflow-hidden">
      {canEdit && (
        <ManualEdgeToolbar
          mode={mode}
          onModeChange={handleModeChange}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDeleteSelected={handleDeleteSelected}
          hasSelectedEdge={!!selectedEdge}
        />
      )}

      {/* A1+A2 高亮工具栏 + A7 搜索按钮 */}
      {treeData && treeData.nodes.length > 0 && familyId && (
        <LineageToolbar
          mode={lineage.mode}
          onChange={(m) => lineage.setMode(m)}
          onClear={() => lineage.clear()}
          onOpenSearch={() => search.toggle()}
          loading={lineage.loading}
          label={lineage.highlight?.label}
          error={lineage.error}
        />
      )}

      {/* A7 搜索浮层 */}
      <TreeSearchPalette
        open={search.open}
        query={search.query}
        onQueryChange={search.setQuery}
        results={search.results}
        loading={search.loading}
        onPick={(hit) => search.pick(hit)}
        onClose={() => search.setOpen(false)}
      />

      {mode === 'adding' && (
        <div className="absolute top-16 left-4 z-20 bg-blue-500/90 text-white text-sm px-3 py-2 rounded-lg shadow-lg">
          {addingState.step === 'select-source'
            ? '请选择连线的起点节点'
            : addingState.step === 'select-target'
            ? `已选择起点: ${addingState.sourceName}，请选择终点节点`
            : '请在对话框中填写连线信息'}
        </div>
      )}

      {!canEdit && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px] pointer-events-none">
          <p className="text-sm text-muted-foreground bg-background/80 px-4 py-2 rounded-md border shadow-sm">
            仅管理员可进行拖动与连线操作
          </p>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={allEdges}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={{ ...edgeTypes, manual: ManualEdgeComponent }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        nodesDraggable={canEdit && mode !== 'adding'}
        nodesConnectable={false}
        selectNodesOnDrag={canEdit}
      >
        <FlowInit onInit={handleFlowInit} />
        <Controls
          showZoom
          showFitView
          showInteractive={canEdit}
          className="!bg-background/80 !backdrop-blur !border"
        />
        <Background className="!bg-background" gap={20} />
      </ReactFlow>

      {hoveredNode && (
        <MemberTooltip
          member={hoveredNode.member}
          mouseX={hoveredNode.x}
          mouseY={hoveredNode.y}
          containerRect={null}
        />
      )}

      {selectedEdge && selectedEdge.edge && (
        <div className="absolute right-2 bottom-2 sm:right-4 sm:top-4 w-[calc(100%-1rem)] sm:w-64 rounded-md border bg-card p-3 sm:p-4 shadow-lg animate-fade-in z-40 max-h-[40vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: selectedEdge.edge.color }}>
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h4 className="font-semibold text-sm sm:text-base">手动连线</h4>
            </div>
            <button
              onClick={() => setSelectedEdge(null)}
              className="text-muted-foreground hover:text-foreground text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">关系：</span>
              <span className="text-sm font-medium">{selectedEdge.edge.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">起点：</span>
              <span className="text-sm">{selectedEdge.sourceName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">终点：</span>
              <span className="text-sm">{selectedEdge.targetName}</span>
            </div>
            {canEdit && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setDialogState({ isOpen: true, mode: 'edit', edge: selectedEdge.edge })}
                  className="flex-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="flex-1 px-3 py-1.5 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  删除
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <EdgeCreationDialog
        isOpen={dialogState.isOpen}
        onClose={handleDialogClose}
        onConfirm={handleDialogConfirm}
        sourceName={addingState.sourceName || ''}
        targetName={addingState.targetName || ''}
        mode={dialogState.mode}
        initialData={dialogState.edge}
      />
    </div>
  )
}