import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Move } from 'lucide-react'

interface SvgZoomPanProps {
  viewBox: string
  children: ReactNode
  className?: string
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
  showToolbar?: boolean
  showMinimap?: boolean
  aspectRatio?: number
  onZoomChange?: (zoom: number) => void
}

export function SvgZoomPan({
  viewBox,
  children,
  className = '',
  minZoom = 0.3,
  maxZoom = 4,
  zoomStep = 0.2,
  showToolbar = true,
  showMinimap = false,
  aspectRatio,
  onZoomChange,
}: SvgZoomPanProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number }>(
    { active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 }
  )
  const pinchRef = useRef<{ active: boolean; dist: number; baseZoom: number }>({
    active: false,
    dist: 0,
    baseZoom: 1,
  })
  const lastTapRef = useRef<number>(0)
  const [tapPoint, setTapPoint] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    onZoomChange?.(zoom)
  }, [zoom, onZoomChange])

  const zoomBy = useCallback(
    (delta: number, cx?: number, cy?: number) => {
      setZoom((prev) => {
        const next = Math.max(minZoom, Math.min(maxZoom, prev + delta))
        if (cx !== undefined && cy !== undefined && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const ox = cx - rect.left - rect.width / 2
          const oy = cy - rect.top - rect.height / 2
          const ratio = next / prev
          setPan((p) => ({
            x: ox - (ox - p.x) * ratio,
            y: oy - (oy - p.y) * ratio,
          }))
        }
        return next
      })
    },
    [minZoom, maxZoom]
  )

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const fitView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: pan.x,
      baseY: pan.y,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return
    setPan({
      x: dragRef.current.baseX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.baseY + (e.clientY - dragRef.current.startY),
    })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current.active = false
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      pinchRef.current = {
        active: true,
        dist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        baseZoom: zoom,
      }
    } else if (e.touches.length === 1) {
      const now = Date.now()
      const t = e.touches[0]
      if (now - lastTapRef.current < 300 && tapPoint) {
        const dx = t.clientX - tapPoint.x
        const dy = t.clientY - tapPoint.y
        if (Math.hypot(dx, dy) < 20) {
          zoomBy(zoom > 1.5 ? 1 - zoom : 0.8, t.clientX, t.clientY)
          lastTapRef.current = 0
          setTapPoint(null)
          return
        }
      }
      lastTapRef.current = now
      setTapPoint({ x: t.clientX, y: t.clientY })
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current.active) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const ratio = dist / pinchRef.current.dist
      const targetZoom = pinchRef.current.baseZoom * ratio
      setZoom(Math.max(minZoom, Math.min(maxZoom, targetZoom)))
    }
  }

  const onTouchEnd = () => {
    pinchRef.current.active = false
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? zoomStep : -zoomStep
    zoomBy(delta, e.clientX, e.clientY)
  }

  const vbParts = viewBox.split(/\s+/).map(Number)
  const [vbX, vbY, vbW, vbH] = vbParts.length === 4 ? vbParts : [0, 0, 800, 400]

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="zoom-svg-container relative h-full w-full overflow-hidden"
        style={{
          aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
          minHeight: 300,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
      >
        <svg
          viewBox={viewBox}
          className="h-full w-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: dragRef.current.active ? 'none' : 'transform 0.05s linear',
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          {children}
        </svg>

        {zoom > 1.01 && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
            <Move className="mr-0.5 inline h-2.5 w-2.5" />
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>

      {showToolbar && (
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 rounded-lg border border-amber-700/30 bg-stone-900/85 p-1 shadow-lg backdrop-blur-sm">
          <button
            onClick={() => zoomBy(zoomStep)}
            className="touch-target rounded p-1.5 text-amber-200/80 hover:bg-amber-900/40 hover:text-amber-100"
            title="放大"
            aria-label="放大"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => zoomBy(-zoomStep)}
            className="touch-target rounded p-1.5 text-amber-200/80 hover:bg-amber-900/40 hover:text-amber-100"
            title="缩小"
            aria-label="缩小"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <div className="mx-1 h-px bg-amber-700/30" />
          <button
            onClick={resetView}
            className="touch-target rounded p-1.5 text-amber-200/80 hover:bg-amber-900/40 hover:text-amber-100"
            title="重置"
            aria-label="重置视图"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={fitView}
            className="touch-target rounded p-1.5 text-amber-200/80 hover:bg-amber-900/40 hover:text-amber-100"
            title="适合屏幕"
            aria-label="适合屏幕"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {showMinimap && (
        <div className="absolute bottom-2 right-2 z-10 h-20 w-20 overflow-hidden rounded border border-amber-700/40 bg-stone-950/80">
          <svg viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} className="h-full w-full opacity-70">
            {children}
          </svg>
        </div>
      )}
    </div>
  )
}

export default SvgZoomPan
