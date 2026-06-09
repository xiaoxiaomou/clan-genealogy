# Family Tree Engine 重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 1400 行 FamilyTreeGraph.tsx 拆分为模块化引擎，翻新视觉风格，作为统一族谱展示入口

**Architecture:** React Flow + dagre 一次性布局 + 提取 PersonNode/CoupleNode/FamilyEdge 为独立组件 + 布局/状态逻辑提取为 hooks

**Tech Stack:** @xyflow/react ^12.10.2, @dagrejs/dagre ^3.0.0, React 19, TailwindCSS 4

---

### Task 1: 创建新目录结构和公共类型

**Files:**
- Create: `frontend/src/components/tree-engine/nodes/PersonNode.tsx`
- Create: `frontend/src/components/tree-engine/nodes/CoupleNode.tsx`
- Create: `frontend/src/components/tree-engine/edges/FamilyEdge.tsx`
- Create: `frontend/src/components/tree-engine/hooks/useTreeLayout.ts`
- Create: `frontend/src/components/tree-engine/hooks/useTreeNodeState.ts`
- Create: `frontend/src/components/tree-engine/FamilyTreeEngine.tsx`
- Create: `frontend/src/components/tree-engine/FamilyTreeEngine.css`
- Create: `frontend/src/components/tree-engine/index.ts`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p "D:\soft\test\soft\zupu\frontend\src\components\tree-engine\nodes"
mkdir -p "D:\soft\test\soft\zupu\frontend\src\components\tree-engine\edges"
mkdir -p "D:\soft\test\soft\zupu\frontend\src\components\tree-engine\hooks"
```

- [ ] **Step 2: 创建 index.ts**

Create `frontend/src/components/tree-engine/index.ts`:

```typescript
export { FamilyTreeEngine } from './FamilyTreeEngine'
export type { FamilyTreeEngineProps, LayoutMode } from './FamilyTreeEngine'
export { PersonNode } from './nodes/PersonNode'
export { CoupleNode } from './nodes/CoupleNode'
export { FamilyEdge } from './edges/FamilyEdge'
```

- [ ] **Step 3: 创建 FamilyTreeEngine.css**

Create `frontend/src/components/tree-engine/FamilyTreeEngine.css`:

```css
@keyframes lineage-pulse {
  0% { box-shadow: 0 0 0 0 rgba(201, 168, 76, 0.5); }
  70% { box-shadow: 0 0 0 12px rgba(201, 168, 76, 0); }
  100% { box-shadow: 0 0 0 0 rgba(201, 168, 76, 0); }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/tree-engine/
git commit -m "feat(tree): create tree-engine directory structure"
```

---

### Task 2: 实现 useTreeNodeState hook（折叠+选中状态管理）

~（内容保持不变）~

---

### Task 3: 提取 useTreeLayout hook（折叠+选中+高亮状态）

**Files:**
- Create: `frontend/src/components/tree-engine/hooks/useTreeNodeState.ts`

- [ ] **Step 1: 实现 useTreeNodeState**

Create `frontend/src/components/tree-engine/hooks/useTreeNodeState.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/tree-engine/hooks/useTreeNodeState.ts
git commit -m "feat(tree): extract useTreeNodeState hook"
```

---

### Task 3: 提取 useTreeLayout hook（dagre 布局 + 夫妻处理）

**Files:**
- Create: `frontend/src/components/tree-engine/hooks/useTreeLayout.ts`

- [ ] **Step 1: 实现 useTreeLayout**

Create `frontend/src/components/tree-engine/hooks/useTreeLayout.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/tree-engine/hooks/useTreeLayout.ts
git commit -m "feat(tree): extract useTreeLayout hook with dagre+couples"
```

---

### Task 4: 实现 PersonNode 组件

**Files:**
- Create: `frontend/src/components/tree-engine/nodes/PersonNode.tsx`

- [ ] **Step 1: 实现 PersonNode 组件**

Create `frontend/src/components/tree-engine/nodes/PersonNode.tsx`:

```typescript
import { Handle, Position } from '@xyflow/react'
import { Card, CardContent } from '@/components/ui'
import { AvatarDisplay } from '@/components/ui'
import type { TreeNode } from '@/types'

const GENDER_COLORS: Record<string, string> = {
  male: '#2563eb',
  female: '#ec4899',
}

function calcAge(birth: string, death?: string | null): number | null {
  const from = new Date(birth)
  if (isNaN(from.getTime())) return null
  const to = death ? new Date(death) : new Date()
  if (isNaN(to.getTime())) return null
  let age = to.getFullYear() - from.getFullYear()
  const mDiff = to.getMonth() - from.getMonth()
  if (mDiff < 0 || (mDiff === 0 && to.getDate() < from.getDate())) age--
  return age
}

function getGenerationColor(generation: number | null): string {
  const gen = generation || 1
  const step = 6
  const lightness = Math.min(30 + gen * step, 85)
  return `hsl(145, 45%, ${lightness}%)`
}

export interface PersonNodeData {
  member: TreeNode
  isHighlighted: boolean
  isDimmed: boolean
  highlightRole: 'normal' | 'up' | 'down' | 'path' | 'pulse'
  isCollapsed: boolean
  hiddenDescendantCount: number
  canCollapse: boolean
  isSelectedNode: boolean
  nodeWidth: number
  onToggleCollapse: (id: number) => void
  onHover: ((member: TreeNode | null) => void) | null
}

export function PersonNode({ data }: { data: PersonNodeData }) {
  const m = data.member
  const borderColor = data.isSelectedNode
    ? '#8b5cf6'
    : data.highlightRole === 'up' ? '#b08d57'
    : data.highlightRole === 'down' ? '#7ba17b'
    : data.highlightRole === 'path' ? '#c08494'
    : data.highlightRole === 'pulse' ? '#c9a84c'
    : GENDER_COLORS[m.gender] || '#94a3b8'
  const age = m.birth_date ? calcAge(m.birth_date, m.death_date) : null
  const isPulsing = data.highlightRole === 'pulse'

  return (
    <div
      style={{
        width: data.nodeWidth,
        height: 90,
        opacity: data.isDimmed ? 0.3 : 1,
        transition: 'all 0.3s ease',
        transform: data.isHighlighted ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isPulsing ? '0 0 0 0 rgba(201,168,76,0.5)' : undefined,
      }}
      className="relative touch-manipulation"
      onMouseEnter={() => data.onHover?.(m)}
      onMouseLeave={() => data.onHover?.(null)}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <Card
        className="cursor-pointer hover:shadow-lg transition-shadow h-full"
        style={{
          borderColor,
          borderWidth: 2,
          background: getGenerationColor(m.generation),
        }}
      >
        <CardContent className="p-1.5 flex items-center gap-1.5 h-full">
          <AvatarDisplay name={m.name} avatar={m.avatar} size={30} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs truncate leading-tight">
              {m.name}
              {!m.is_alive && <span className="ml-0.5 text-muted-foreground">†</span>}
              {age !== null && <span className="ml-1 text-[10px] text-muted-foreground/60">{age}</span>}
            </p>
            <div className="flex gap-1 text-[9px] text-muted-foreground truncate">
              {m.courtesy_name && <span>字{m.courtesy_name}</span>}
              {m.art_name && <span>号{m.art_name}</span>}
            </div>
            {m.generation_name && <p className="text-[9px] text-muted-foreground">{m.generation_name}辈</p>}
            {m.birth_date && (
              <p className="text-[9px] text-muted-foreground truncate">
                {m.birth_date}{m.death_date ? ` ~ ${m.death_date}` : ''}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      {data.canCollapse && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onToggleCollapse(m.id) }}
          className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full border bg-background shadow-sm flex items-center justify-center text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors nodrag nopan"
        >
          {data.isCollapsed ? '+' : '−'}
        </button>
      )}
      {data.isCollapsed && data.hiddenDescendantCount > 0 && (
        <div className="absolute -bottom-1 -right-1 z-10 min-w-[20px] h-5 px-1.5 rounded-full bg-purple-600 text-white text-[10px] font-semibold flex items-center justify-center shadow-md border border-background nodrag nopan pointer-events-none">
          +{data.hiddenDescendantCount}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/tree-engine/nodes/PersonNode.tsx
git commit -m "feat(tree): implement PersonNode component"
```

---

### Task 5: 实现 CoupleNode 组件

**Files:**
- Create: `frontend/src/components/tree-engine/nodes/CoupleNode.tsx`

- [ ] **Step 1: 实现 CoupleNode 组件**

Create `frontend/src/components/tree-engine/nodes/CoupleNode.tsx`:

```typescript
import { Handle, Position } from '@xyflow/react'
import { AvatarDisplay } from '@/components/ui'
import type { TreeNode } from '@/types'

function getGenerationColor(generation: number | null): string {
  const gen = generation || 1
  const step = 6
  const lightness = Math.min(30 + gen * step, 85)
  return `hsl(145, 45%, ${lightness}%)`
}

export interface CoupleNodeData {
  husband: TreeNode
  wife: TreeNode | null
  isHighlighted: boolean
  isDimmed: boolean
  highlightRole: 'normal' | 'up' | 'down' | 'path' | 'pulse'
  isCollapsed: boolean
  hiddenDescendantCount: number
  canCollapse: boolean
  isSelectedNode: boolean
  nodeWidth: number
  onToggleCollapse: (id: number) => void
}

export function CoupleNode({ data }: { data: CoupleNodeData }) {
  const h = data.husband
  const w = data.wife
  const borderColor = data.isSelectedNode
    ? '#8b5cf6'
    : data.highlightRole === 'up' ? '#b08d57'
    : data.highlightRole === 'down' ? '#7ba17b'
    : data.highlightRole === 'path' ? '#c08494'
    : data.highlightRole === 'pulse' ? '#c9a84c'
    : '#927d5b'
  const halfWidth = Math.floor((data.nodeWidth - 16) / 2)

  return (
    <div
      style={{
        width: data.nodeWidth,
        height: 106,
        opacity: data.isDimmed ? 0.3 : 1,
        transition: 'all 0.3s ease',
        transform: data.isHighlighted ? 'scale(1.05)' : 'scale(1)',
      }}
      className="relative touch-manipulation"
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <div
        className="flex items-center gap-0.5 bg-card rounded-lg border-2 p-0.5 h-full"
        style={{ borderColor, background: getGenerationColor(h.generation) }}
      >
        <div className="flex flex-col items-center p-1 rounded" style={{ minWidth: halfWidth, background: 'rgba(37,99,235,0.08)' }}>
          <AvatarDisplay name={h.name} avatar={h.avatar} size={24} className="flex-shrink-0" />
          <span className="font-semibold text-xs truncate w-full text-center">{h.name}</span>
          {h.courtesy_name && <span className="text-[9px] text-muted-foreground">字{h.courtesy_name}</span>}
          {h.generation_name && <span className="text-[9px] text-muted-foreground">{h.generation_name}辈</span>}
        </div>
        <div className="flex items-center justify-center">
          <span className="text-sm" style={{ color: '#c0a060' }}>─</span>
        </div>
        <div className="flex flex-col items-center p-1 rounded" style={{ minWidth: halfWidth, background: w ? 'rgba(236,72,153,0.08)' : 'transparent' }}>
          {w ? (
            <>
              <AvatarDisplay name={w.name} avatar={w.avatar} size={24} className="flex-shrink-0" />
              <span className="font-semibold text-xs truncate w-full text-center">{w.name}</span>
              {w.courtesy_name && <span className="text-[9px] text-muted-foreground">字{w.courtesy_name}</span>}
              {w.generation_name && <span className="text-[9px] text-muted-foreground">{w.generation_name}辈</span>}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">待配</span>
          )}
        </div>
      </div>
      {data.canCollapse && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onToggleCollapse(h.id) }}
          className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full border bg-background shadow-sm flex items-center justify-center text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors nodrag nopan"
        >
          {data.isCollapsed ? '+' : '−'}
        </button>
      )}
      {data.isCollapsed && data.hiddenDescendantCount > 0 && (
        <div className="absolute -bottom-1 -right-1 z-10 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-purple-500 text-white text-[10px] font-bold px-1 shadow-sm">
          +{data.hiddenDescendantCount}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/tree-engine/nodes/CoupleNode.tsx
git commit -m "feat(tree): implement CoupleNode component"
```

---

### Task 6: 实现 FamilyEdge 组件（带箭头）

**Files:**
- Create: `frontend/src/components/tree-engine/edges/FamilyEdge.tsx`

- [ ] **Step 1: 实现 FamilyEdge 组件**

Create `frontend/src/components/tree-engine/edges/FamilyEdge.tsx`:

```typescript
import { BaseEdge, getBezierPath, EdgeLabelRenderer, type EdgeProps, type Edge } from '@xyflow/react'
import type { PersonNodeData } from '../nodes/PersonNode'

export interface FamilyEdgeData {
  sourceName: string
  targetName: string
  isSelected: boolean
  isHighlighted: boolean
  highlightColor?: string
  highlightDimmed?: boolean
}

export type FamilyEdgeType = Edge<FamilyEdgeData>

export function FamilyEdge({
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
}: EdgeProps<FamilyEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const edgeData = data
  const isSelected = selected || edgeData?.isSelected
  const isHighlighted = edgeData?.isHighlighted
  const highlightColor = edgeData?.highlightColor
  const isDimmed = edgeData?.highlightDimmed

  const strokeColor = isSelected
    ? '#2563eb'
    : highlightColor
    ? highlightColor
    : isHighlighted
    ? '#c9a84c'
    : '#94a3b8'
  const strokeWidth = isSelected ? 4 : (highlightColor || isHighlighted) ? 3 : 2
  const opacity = isDimmed ? 0.3 : 1

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          opacity,
          transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.3s',
        }}
      />
      {isSelected && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-all cursor-pointer nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-lg font-medium whitespace-nowrap">
              {edgeData?.sourceName} → {edgeData?.targetName}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/tree-engine/edges/FamilyEdge.tsx
git commit -m "feat(tree): implement FamilyEdge component with arrows"
```

---

### Task 7: 实现 FamilyTreeEngine 主组件

**Files:**
- Create: `frontend/src/components/tree-engine/FamilyTreeEngine.tsx`

- [ ] **Step 1: 实现 FamilyTreeEngine**

Create `frontend/src/components/tree-engine/FamilyTreeEngine.tsx`:

```typescript
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
```

- [ ] **Step 2: 运行 TypeScript 检查**

```bash
cd D:\soft\test\soft\zupu\frontend
npx tsc --noEmit 2>&1 | Select-Object -First 20
```
Expected: no errors

- [ ] **Step 3: 运行 Vite build**

```bash
cd D:\soft\test\soft\zupu\frontend
npx vite build 2>&1 | Select-Object -Last 5
```
Expected: build succeeded

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/tree-engine/FamilyTreeEngine.tsx
git commit -m "feat(tree): implement FamilyTreeEngine main component"
```

---

### Task 8: 替换 FamilyTreePage 中的视图切换

**Files:**
- Modify: `frontend/src/components/pages/FamilyTreePage.tsx` (找到视图切换区域，替换 graph 视图为 FamilyTreeEngine)

- [ ] **Step 1: 在 FamilyTreePage 中导入 FamilyTreeEngine**

在 FamilyTreePage.tsx 中找到原来的 FamilyTreeGraph import 行，修改为:

```typescript
// 替换:
// const FamilyTreeGraph = lazy(() => import('./FamilyTreeGraph'))
// 改为:
import { FamilyTreeEngine } from '@/components/tree-engine'
```

- [ ] **Step 2: 替换 graph 视图渲染**

在 FamilyTreePage.tsx 中找到 `treeViewType === 'graph'` 的渲染分支，替换为:

```tsx
case 'graph':
  return (
    <ReactFlowProvider>
      <FamilyTreeEngine
        treeData={treeData}
        canEdit={canEdit}
        onMemberClick={(member) => handleMemberClick(member)}
        familyId={familyId}
        highlightedMemberId={highlightedMemberId}
      />
    </ReactFlowProvider>
  )
```

- [ ] **Step 3: 运行 TypeScript 和 build 检查**

```bash
cd D:\soft\test\soft\zupu\frontend
npx tsc --noEmit 2>&1 | Select-Object -First 20
npx vite build 2>&1 | Select-Object -Last 5
```
Expected: no errors, build succeeded

- [ ] **Step 4: 运行测试**

```bash
cd D:\soft\test\soft\zupu
.venv\Scripts\python.exe -m pytest tests/ -q 2>&1 | Select-Object -Last 3
```
Expected: 49 passed

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/pages/FamilyTreePage.tsx
git commit -m "feat(tree): switch to FamilyTreeEngine in FamilyTreePage"
```

---

### Task 9: 删除旧的 FamilyTreeGraph.tsx

**Files:**
- Delete: `frontend/src/components/pages/FamilyTreeGraph.tsx`

- [ ] **Step 1: 确认引擎正常工作后删除旧文件**

```bash
rm "D:\soft\test\soft\zupu\frontend\src\components\pages\FamilyTreeGraph.tsx"
```

- [ ] **Step 2: 运行 build 确认无断链**

```bash
cd D:\soft\test\soft\zupu\frontend
npx vite build 2>&1 | Select-Object -Last 5
```
Expected: build succeeded

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(tree): remove legacy FamilyTreeGraph.tsx"
```
