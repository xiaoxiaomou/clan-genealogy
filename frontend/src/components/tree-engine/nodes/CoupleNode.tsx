import { Handle, Position } from '@xyflow/react'
import { AvatarDisplay } from '@/components/ui'
import type { TreeNode } from '@/types'
import { getGenerationColor } from '../hooks/useTreeLayout'

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
