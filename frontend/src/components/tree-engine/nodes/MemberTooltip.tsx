import type { TreeNode } from '@/types'

const GENDER_LABELS: Record<string, string> = {
  male: '男', female: '女', unknown: '未知',
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

interface MemberTooltipProps {
  member: TreeNode | null
  mouseX: number
  mouseY: number
  containerRect: DOMRect | null
}

export function MemberTooltip({ member, mouseX, mouseY, containerRect }: MemberTooltipProps) {
  if (!member || !containerRect) return null

  const age = member.birth_date ? calcAge(member.birth_date, member.death_date) : null
  const relX = mouseX - containerRect.left
  const relY = mouseY - containerRect.top
  const tooltipW = 280
  const tooltipH = 200
  const pad = 12
  let left = relX + pad
  let top = relY + pad
  if (left + tooltipW > containerRect.width - pad) left = relX - tooltipW - pad
  if (top + tooltipH > containerRect.height - pad) top = relY - tooltipH - pad
  if (left < pad) left = pad
  if (top < pad) top = pad

  return (
    <div
      className="pointer-events-none z-50"
      style={{
        position: 'absolute',
        left,
        top,
        width: tooltipW,
      }}
    >
      <div className="bg-card border shadow-xl rounded-lg p-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
            member.gender === 'male' ? 'bg-blue-500' : member.gender === 'female' ? 'bg-pink-500' : 'bg-slate-400'
          }`}>
            {member.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm truncate">{member.name}</span>
              <span className="text-muted-foreground text-[10px]">({GENDER_LABELS[member.gender] || '未知'})</span>
              {!member.is_alive && <span className="text-muted-foreground text-[10px]">故</span>}
            </div>
            {member.generation_name && (
              <span className="text-muted-foreground text-[10px] block">{member.generation_name}辈</span>
            )}
          </div>
        </div>
        <div className="border-t pt-1.5 space-y-1">
          {member.birth_date && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">生卒</span>
              <span>{member.birth_date}{member.death_date ? ` ~ ${member.death_date}` : ''}</span>
            </div>
          )}
          {age !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">享年</span>
              <span>{age} 岁</span>
            </div>
          )}
          {member.courtesy_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">字</span>
              <span>{member.courtesy_name}</span>
            </div>
          )}
          {member.art_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">号</span>
              <span>{member.art_name}</span>
            </div>
          )}
          {member.posthumous_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">谥</span>
              <span>{member.posthumous_name}</span>
            </div>
          )}
        </div>
        {member.bio && (
          <div className="border-t pt-1">
            <p className="text-muted-foreground leading-relaxed line-clamp-3">{member.bio}</p>
          </div>
        )}
      </div>
    </div>
  )
}
