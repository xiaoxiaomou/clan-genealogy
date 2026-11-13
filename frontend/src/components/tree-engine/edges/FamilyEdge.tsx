import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react'
import type { CSSProperties } from 'react'

export interface FamilyEdgeData {
  sourceName: string
  targetName: string
  isSelected: boolean
  isHighlighted: boolean
  highlightColor?: string
  highlightDimmed?: boolean
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
