import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react'
import type { CSSProperties } from 'react'

export interface FamilyEdgeData {
  sourceName: string
  targetName: string
  isSelected: boolean
  isHighlighted: boolean
  highlightColor?: string
  highlightDimmed?: boolean
  /** 关系记录 id（右键删除连线用） */
  relationshipId?: number
  relationshipType?: string
}

// src/env.d.ts 中对 '@xyflow/react' 的 ambient 声明覆盖了包内类型，
// 这里以结构等价的局部类型替代 Edge/EdgeProps（仅类型层面，无运行时影响）。
export type FamilyEdgeType = {
  id: string
  source?: string
  target?: string
  type?: string
  animated?: boolean
  data?: FamilyEdgeData
  selected?: boolean
}

type EdgeHandlePosition = 'top' | 'right' | 'bottom' | 'left'

interface FamilyEdgeProps {
  id: string | null
  source?: string
  target?: string
  type?: string
  animated?: boolean
  data?: FamilyEdgeData
  style?: CSSProperties
  selected?: boolean
  selectable?: boolean
  deletable?: boolean
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition?: EdgeHandlePosition
  targetPosition?: EdgeHandlePosition
  markerStart?: string
  markerEnd?: string
}

/* ═══ 谱牒化连线：墨色细线为常，描金为引，朱红为选 ═══ */
const PG_RED = '#A63A2E'
const EDGE_INK = 'hsl(var(--muted-foreground))'
const GOLD = '#B8963F'

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
}: FamilyEdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 14,
  })

  const edgeData = data
  const isSelected = selected || edgeData?.isSelected
  const isHighlighted = edgeData?.isHighlighted
  const highlightColor = edgeData?.highlightColor
  const isDimmed = edgeData?.highlightDimmed

  const strokeColor = isSelected
    ? PG_RED
    : highlightColor
    ? highlightColor
    : isHighlighted
    ? GOLD
    : EDGE_INK
  const strokeWidth = isSelected ? 2.5 : (highlightColor || isHighlighted) ? 2.2 : 1.5
  const opacity = isDimmed ? 0.3 : isHighlighted || highlightColor ? 1 : 0.85

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
            <div
              className="px-2 py-0.5 text-xs shadow-lg"
              style={{
                backgroundColor: PG_RED,
                color: '#fff',
                fontFamily: "'Noto Serif SC', 'STSong', 'KaiTi', serif",
                letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
              }}
            >
              {edgeData?.sourceName} → {edgeData?.targetName}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
