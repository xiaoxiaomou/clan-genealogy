import type { TreeNode } from '@/types'
import { AvatarDisplay } from '@/components/ui'

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
  /** 所在容器的矩形；为 null 时按视口定位（fixed） */
  containerRect: DOMRect | null
}

/** 谱牒名帖 · 悬停浮层：行式条目呈现族人全部要目 */
export function MemberTooltip({ member, mouseX, mouseY, containerRect }: MemberTooltipProps) {
  if (!member) return null

  const age = member.birth_date ? calcAge(member.birth_date, member.death_date) : null
  const tooltipW = 288
  const pad = 12
  const maxX = containerRect ? containerRect.width : window.innerWidth
  const maxY = containerRect ? containerRect.height : window.innerHeight

  let left = mouseX + pad
  let top = mouseY + pad
  if (left + tooltipW > maxX - pad) left = mouseX - tooltipW - pad
  if (top + 240 > maxY - pad) top = mouseY - 240 - pad
  left = Math.max(pad, left)
  top = Math.max(pad, top)

  const rows: Array<[string, string]> = []
  if (member.generation) rows.push(['世代', `第 ${member.generation} 代`])
  if (member.generation_name) rows.push(['字辈', member.generation_name])
  if (member.birth_date) rows.push(['生卒', `${member.birth_date}${member.death_date ? ` ~ ${member.death_date}` : ' ~'}`])
  if (age !== null) rows.push([member.is_alive ? '现年' : '享年', `${age} 岁`])
  if (member.courtesy_name) rows.push(['字', member.courtesy_name])
  if (member.art_name) rows.push(['号', member.art_name])
  if (member.posthumous_name) rows.push(['谥', member.posthumous_name])
  if (member.spouse_family_name) rows.push(['适', `${member.spouse_family_name}氏`])
  if (member.burial_place) rows.push(['葬地', member.burial_place])
  if (member.migration_note) rows.push(['迁徙', member.migration_note])

  return (
    <div
      className="pointer-events-none z-50 animate-fade-in"
      style={{
        position: containerRect ? 'absolute' : 'fixed',
        left,
        top,
        width: tooltipW,
      }}
    >
      <div
        className="relative overflow-hidden rounded-[4px] border p-3 pt-3.5 shadow-xl"
        style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}
      >
        {/* 顶部世代墨青条 */}
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: 'hsl(160, 24%, 34%)' }}
          aria-hidden="true"
        />
        {/* 名讳行 */}
        <div className="flex items-center gap-2.5">
          <AvatarDisplay
            name={member.name}
            avatar={member.avatar}
            gender={member.gender}
            size={34}
            className="flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="truncate font-serif text-[16px] font-semibold tracking-wide">
                {member.name}
                {!member.is_alive && <span className="ml-1 text-[11px] text-muted-foreground">†</span>}
              </span>
              <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                {GENDER_LABELS[member.gender] || '未知'}
              </span>
            </div>
            {!member.is_alive && (
              <span className="text-[10px] text-muted-foreground">故</span>
            )}
          </div>
        </div>

        {/* 条目 */}
        {rows.length > 0 && (
          <div className="mt-2.5 space-y-1 border-t pt-2" style={{ borderColor: 'hsl(var(--border))' }}>
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 text-[11px] leading-snug">
                <span className="flex-shrink-0 text-muted-foreground">
                  <span
                    className="mr-1.5 inline-block h-1 w-1 rounded-[1px] align-middle"
                    style={{ backgroundColor: '#A63A2E' }}
                    aria-hidden="true"
                  />
                  {label}
                </span>
                <span className="truncate text-right" title={value}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 传略 */}
        {member.bio && (
          <div className="mt-2 border-t pt-2" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{member.bio}</p>
          </div>
        )}
      </div>
    </div>
  )
}
