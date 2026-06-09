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
