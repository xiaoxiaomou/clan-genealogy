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
