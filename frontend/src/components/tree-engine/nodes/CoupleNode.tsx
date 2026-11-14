import { Handle, Position } from '@xyflow/react'
import { AvatarDisplay } from '@/components/ui'
import type { TreeNode } from '@/types'
import { getGenerationColor } from '../hooks/useTreeLayout'

/* ═══ 谱牒合牌：夫妻共享一张纸牌，中缝分隔，顶上「合」字朱章 ═══ */
const PG_RED = '#A63A2E'
const GENDER_INK = { male: '#5B7A95', female: '#A76A8C' } as const

const HIGHLIGHT = {
  up: '#B8963F',
  down: '#5F8A5F',
  path: PG_RED,
  pulse: PG_RED,
} as const

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
  onHover?: ((member: TreeNode | null, x?: number, y?: number) => void) | null
  /** 右键节点（管理员添加子女/配偶/连线等） */
  onNodeContextMenu?: (member: TreeNode, x: number, y: number) => void
}

function HalfPerson({
  m,
  halfWidth,
  onHover,
  onNodeContextMenu,
}: {
  m: TreeNode
  halfWidth: number
  onHover?: (member: TreeNode | null, x?: number, y?: number) => void
  onNodeContextMenu?: (member: TreeNode, x: number, y: number) => void
}) {
  const isDead = !m.is_alive
  const ziLine =
    m.courtesy_name || m.art_name
      ? [m.courtesy_name && `字${m.courtesy_name}`, m.art_name && `号${m.art_name}`]
          .filter(Boolean)
          .join('　')
      : null
  return (
    <div
      className="relative flex flex-col items-center px-1 py-0.5 text-center"
      style={{ minWidth: halfWidth }}
      onMouseEnter={(e) => onHover?.(m, e.clientX, e.clientY)}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onNodeContextMenu?.(m, e.clientX, e.clientY)
      }}
    >
      <div
        className="absolute bottom-0 left-0 top-0 w-[3px]"
        style={{ background: m.gender === 'female' ? GENDER_INK.female : GENDER_INK.male }}
        aria-hidden="true"
      />
      <AvatarDisplay name={m.name} avatar={m.avatar} size={24} className="flex-shrink-0" />
      <span
        className="w-full truncate text-center font-serif text-[13px] font-semibold tracking-wide"
        style={{ opacity: isDead ? 0.72 : 1 }}
      >
        {m.name}
        {isDead && <span className="ml-0.5 text-[10px] text-muted-foreground">†</span>}
      </span>
      {ziLine && <span className="w-full truncate text-[9px] leading-tight text-muted-foreground">{ziLine}</span>}
    </div>
  )
}

export function CoupleNode({ data }: { data: CoupleNodeData }) {
  const h = data.husband
  const w = data.wife
  const { onHover, onNodeContextMenu } = data
  const roleColor =
    data.highlightRole === 'up' ? HIGHLIGHT.up
    : data.highlightRole === 'down' ? HIGHLIGHT.down
    : data.highlightRole === 'path' || data.highlightRole === 'pulse' ? HIGHLIGHT.path
    : null
  const isSelected = data.isSelectedNode
  const borderColor = isSelected
    ? PG_RED
    : roleColor || (data.isHighlighted ? HIGHLIGHT.up : 'hsl(var(--border))')
  const halfWidth = Math.floor((data.nodeWidth - 16) / 2)
  const isPulsing = data.highlightRole === 'pulse'

  return (
    <div
      style={{
        width: data.nodeWidth,
        height: 106,
        opacity: data.isDimmed ? 0.3 : 1,
        transition: 'opacity 0.3s ease, box-shadow 0.3s ease',
        transform: data.isHighlighted ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isPulsing ? '0 0 0 0 rgba(166, 58, 46, 0.5)' : undefined,
        animation: isPulsing ? 'lineage-pulse 1.4s ease-out infinite' : undefined,
      }}
      className="relative touch-manipulation"
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />

      {/* 合牌：一张纸牌，中缝细分隔 */}
      <div
        className="relative h-full w-full cursor-pointer overflow-hidden rounded-[4px] border transition-shadow hover:shadow-lg"
        style={{
          borderColor,
          borderWidth: isSelected || roleColor || data.isHighlighted ? 1.5 : 1,
          background: 'hsl(var(--card))',
          boxShadow: isSelected ? `0 0 0 1.5px ${PG_RED}, 0 6px 18px -8px rgba(166, 58, 46, 0.6)` : undefined,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: getGenerationColor(h.generation) }}
          aria-hidden="true"
        />
        <div
          className="absolute left-1/2 top-[3px] h-[16px] w-[20px] -translate-x-1/2 rounded-b-[3px] text-center font-serif text-[10px] leading-[16px] text-white"
          style={{ backgroundColor: PG_RED, marginTop: 0 }}
          aria-hidden="true"
        >
          合
        </div>

        <div
          className="flex h-full items-stretch pt-[3px]"
          onMouseLeave={() => onHover?.(null)}
        >
          <HalfPerson m={h} halfWidth={halfWidth} onHover={onHover ?? undefined} onNodeContextMenu={onNodeContextMenu} />
          <div className="w-px flex-shrink-0" style={{ background: 'hsl(var(--border))' }} aria-hidden="true" />
          {w ? (
            <HalfPerson m={w} halfWidth={halfWidth} onHover={onHover ?? undefined} onNodeContextMenu={onNodeContextMenu} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <span className="text-xs text-muted-foreground">待配</span>
            </div>
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
        <div
          className="absolute -bottom-1 -right-1 z-10 min-w-[20px] h-5 px-1.5 rounded-[4px] text-white text-[10px] font-semibold flex items-center justify-center shadow-md nodrag nopan pointer-events-none"
          style={{ backgroundColor: PG_RED }}
        >
          +{data.hiddenDescendantCount}
        </div>
      )}
      {/* 源锚点：合牌底部中央 */}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  )
}
