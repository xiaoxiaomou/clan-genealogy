import { useCallback, useState, useRef } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { ManualEdge, DragHandle } from '@/types/manualEdge'

interface ManualEdgeComponentProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: string
  targetPosition: string
  selected?: boolean
  markerEnd?: string
  data?: {
    edge: ManualEdge
    isManual?: boolean
    onDragStart?: (handle: DragHandle) => void
    onDragEnd?: (handle: DragHandle, nodeId: string | null) => void
    onSelect?: () => void
  }
}

export function ManualEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  markerEnd,
}: ManualEdgeComponentProps) {
  const edge = data?.edge
  const onDragStart = data?.onDragStart
  const onDragEnd = data?.onDragEnd
  const onSelect = data?.onSelect

  const [isDragging, setIsDragging] = useState(false)
  const [hoveredHandle, setHoveredHandle] = useState<'source' | 'target' | null>(null)
  const dragInfoRef = useRef<{ handleType: 'source' | 'target' } | null>(null)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  if (!edge) return null

  const strokeDasharray = edge.lineStyle === 'dashed'
    ? '8,4'
    : edge.lineStyle === 'dotted'
    ? '2,2'
    : undefined

  const handleMouseDown = useCallback((e: React.MouseEvent, handleType: 'source' | 'target') => {
    e.stopPropagation()
    setIsDragging(true)
    dragInfoRef.current = { handleType }
    onDragStart?.({ edgeId: id, handleType, nodeId: '' })
  }, [id, onDragStart])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragInfoRef.current) {
      const target = e.target as HTMLElement
      const nodeElement = target.closest('[data-node-id]')
      const nodeId = nodeElement?.getAttribute('data-node-id') || null
      const handle: DragHandle = {
        edgeId: id,
        handleType: dragInfoRef.current.handleType,
        nodeId: nodeId || '',
      }
      onDragEnd?.(handle, nodeId)
    }
    setIsDragging(false)
    dragInfoRef.current = null
  }, [isDragging, id, onDragEnd])

  const handleMouseEnter = useCallback((handleType: 'source' | 'target') => {
    setHoveredHandle(handleType)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredHandle(null)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.()
  }, [onSelect])

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#2563eb' : edge.color,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray,
          transition: 'stroke 0.2s, stroke-width 0.2s',
          cursor: 'pointer',
        }}
        onClick={handleClick}
        onMouseUp={handleMouseUp}
      />

      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-all cursor-pointer nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          onClick={handleClick}
        >
          <div
            className={`text-xs px-2 py-1 rounded-full shadow-md font-medium transition-all ${
              selected ? 'bg-blue-500 text-white' : 'bg-background/90 text-foreground border'
            }`}
            style={{ borderColor: edge.color }}
          >
            {edge.label}
          </div>
        </div>
      </EdgeLabelRenderer>

      {selected && (
        <>
          <circle
            cx={sourceX}
            cy={sourceY}
            r={8}
            fill={hoveredHandle === 'source' ? edge.color : '#fff'}
            stroke={edge.color}
            strokeWidth={2}
            className="cursor-crosshair hover:scale-125 transition-transform"
            onMouseDown={(e) => handleMouseDown(e, 'source')}
            onMouseEnter={() => handleMouseEnter('source')}
            onMouseLeave={handleMouseLeave}
            style={{ transition: 'fill 0.15s, transform 0.15s' }}
          />
          <circle
            cx={targetX}
            cy={targetY}
            r={8}
            fill={hoveredHandle === 'target' ? edge.color : '#fff'}
            stroke={edge.color}
            strokeWidth={2}
            className="cursor-crosshair hover:scale-125 transition-transform"
            onMouseDown={(e) => handleMouseDown(e, 'target')}
            onMouseEnter={() => handleMouseEnter('target')}
            onMouseLeave={handleMouseLeave}
            style={{ transition: 'fill 0.15s, transform 0.15s' }}
          />
        </>
      )}
    </>
  )
}