import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { AvatarDisplay } from '@/components/ui'
import type { TreeNode } from '@/types'
import { getGenerationColor } from '../hooks/useTreeLayout'

/* ═══ 谱牒化名牌：纸面 + 世代墨青条 + 性别条 + 字辈朱印 ═══ */
const PG_RED = '#A63A2E'
const GENDER_INK = { male: '#5B7A95', female: '#A76A8C' } as const

const HIGHLIGHT = {
  up: '#B8963F',
  down: '#5F8A5F',
  path: PG_RED,
  pulse: PG_RED,
} as const

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

/** memo：拖拽/点选等任何上层状态变化时，未受影响节点不再重渲染 */
export const PersonNode = memo(function PersonNode({ data }: { data: PersonNodeData }) {
  const m = data.member
  const roleColor =
    data.highlightRole === 'up' ? HIGHLIGHT.up
    : data.highlightRole === 'down' ? HIGHLIGHT.down
    : data.highlightRole === 'path' || data.highlightRole === 'pulse' ? HIGHLIGHT.path
    : null
  const isSelected = data.isSelectedNode
  const borderColor = isSelected
    ? PG_RED
    : roleColor || (data.isHighlighted ? HIGHLIGHT.up : 'hsl(var(--border))')
  const isDead = !m.is_alive
  const age = m.birth_date ? calcAge(m.birth_date, m.death_date) : null
  const ziLine =
    m.courtesy_name || m.art_name
      ? [m.courtesy_name && `字${m.courtesy_name}`, m.art_name && `号${m.art_name}`]
          .filter(Boolean)
          .join('　')
      : null
  const isPulsing = data.highlightRole === 'pulse'

  return (
    <div
      style={{
        width: data.nodeWidth,
        height: 90,
        opacity: data.isDimmed ? 0.3 : 1,
        transition: 'all 0.3s ease',
        transform: data.isHighlighted ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isPulsing ? '0 0 0 0 rgba(166, 58, 46, 0.5)' : undefined,
        animation: isPulsing ? 'lineage-pulse 1.4s ease-out infinite' : undefined,
      }}
      className="relative touch-manipulation"
      onMouseEnter={() => data.onHover?.(m)}
      onMouseLeave={() => data.onHover?.(null)}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />

      {/* 谱牒纸牌 */}
      <div
        className="relative h-full w-full cursor-pointer overflow-hidden rounded-[4px] border transition-shadow hover:shadow-lg"
        style={{
          borderColor,
          borderWidth: isSelected || roleColor || data.isHighlighted ? 1.5 : 1,
          background: isDead ? 'hsl(var(--muted) / 0.55)' : 'hsl(var(--card))',
          boxShadow: isSelected ? `0 0 0 1.5px ${PG_RED}, 0 6px 18px -8px rgba(166, 58, 46, 0.6)` : undefined,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: getGenerationColor(m.generation) }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 top-[3px] w-[3px]"
          style={{ background: m.gender === 'female' ? GENDER_INK.female : GENDER_INK.male }}
          aria-hidden="true"
        />
        {m.generation_name && (
          <div
            className="absolute right-1.5 top-2 h-[17px] w-[17px] rounded-[3px] text-center font-serif text-[11px] leading-[17px] text-white"
            style={{ backgroundColor: PG_RED }}
            title={`字辈：${m.generation_name}`}
            aria-hidden="true"
          >
            {m.generation_name.charAt(0)}
          </div>
        )}
        {data.highlightRole === 'path' && (
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
            <AvatarDisplay name={m.name} avatar={m.avatar} size={24} className="flex-shrink-0" />
            <span
              className="truncate font-serif text-[15px] font-semibold tracking-wide"
              style={{ opacity: isDead ? 0.72 : 1 }}
            >
              {m.name}
              {isDead && <span className="ml-0.5 text-[11px] text-muted-foreground">†</span>}
            </span>
          </div>
          <p className="min-h-[12px] w-full truncate text-[10px] leading-none text-muted-foreground">
            {ziLine || '\u00A0'}
          </p>
          <p className="w-full truncate text-[10px] leading-none tracking-wide text-muted-foreground">
            {m.birth_date
              ? `${m.birth_date.slice(0, 4)} ~ ${m.death_date?.slice(0, 4) ?? ''}${!isDead && age !== null ? `（${age} 岁）` : ''}`
              : ''}
          </p>
        </div>
      </div>

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
        <div
          className="absolute -bottom-1 -right-1 z-10 min-w-[20px] h-5 px-1.5 rounded-[4px] text-white text-[10px] font-semibold flex items-center justify-center shadow-md nodrag nopan pointer-events-none"
          style={{ backgroundColor: PG_RED }}
        >
          +{data.hiddenDescendantCount}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  )
})
