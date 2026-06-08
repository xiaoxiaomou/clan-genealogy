import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui'
import { AvatarDisplay } from '@/components/ui'
import type { Member } from '@/types'

interface TimelineViewProps {
  members: Member[]
  onMemberClick?: (member: Member) => void
  highlightedMemberId?: number | null
}

interface HoverInfo {
  member: Member
  x: number
  y: number
}

function getGenderColor(gender: string): string {
  switch (gender) {
    case 'male':
      return '#2563eb'
    case 'female':
      return '#ec4899'
    default:
      return '#94a3b8'
  }
}

interface CenturyGroup {
  year: number
  members: Member[]
  isCenturyStart: boolean
}

export default function TimelineView({
  members,
  onMemberClick,
  highlightedMemberId,
}: TimelineViewProps) {
  const [hoveredMember, setHoveredMember] = useState<HoverInfo | null>(null)
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const yearA = a.birth_date ? new Date(a.birth_date).getFullYear() : 0
      const yearB = b.birth_date ? new Date(b.birth_date).getFullYear() : 0
      return yearA - yearB
    })
  }, [members])

  const timelineData = useMemo(() => {
    const events: CenturyGroup[] = []

    let currentCentury = -1
    let centuryMembers: Member[] = []
    let centuryYear = 0

    sortedMembers.forEach((member) => {
      const birthYear = member.birth_date
        ? new Date(member.birth_date).getFullYear()
        : null

      if (birthYear) {
        const century = Math.floor(birthYear / 100) * 100

        if (century !== currentCentury) {
          if (centuryMembers.length > 0) {
            events.push({ year: centuryYear, members: centuryMembers, isCenturyStart: false })
          }
          currentCentury = century
          centuryYear = century
          centuryMembers = [member]
        } else {
          centuryMembers.push(member)
        }
      } else {
        if (centuryYear !== 0) {
          if (centuryMembers.length > 0) {
            events.push({ year: centuryYear, members: centuryMembers, isCenturyStart: false })
          }
          centuryYear = 0
          centuryMembers = [member]
        } else {
          centuryMembers.push(member)
        }
      }
    })

    if (centuryMembers.length > 0) {
      events.push({ year: centuryYear, members: centuryMembers, isCenturyStart: false })
    }

    return events
  }, [sortedMembers])

  if (members.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        暂无成员数据
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">时间线视图</h3>
        <div className="text-sm text-muted-foreground">
          共 {members.length} 位成员
        </div>
      </div>

      <div className="relative overflow-x-auto pb-4">
        <div className="min-w-[800px]">
          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
            <span>← 拖动滚动查看更多 →</span>
          </div>

          <div className="relative">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -translate-y-1/2" />

            <div className="space-y-8">
              {timelineData.map((centuryGroup, groupIndex) => (
                <div key={groupIndex} className="relative">
                  <div
                    className="sticky left-0 z-10 bg-background/90 backdrop-blur px-2 py-1 text-sm font-medium rounded border"
                    style={{ width: 'fit-content' }}
                  >
                    {centuryGroup.year > 0 ? `${centuryGroup.year}年` : '未知年代'}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-2 ml-4">
                    {centuryGroup.members.map((member) => {
                      const isHighlighted = highlightedMemberId === member.id
                      const isDimmed = highlightedMemberId !== null && !isHighlighted

                      return (
                        <Card spotlight
                          key={member.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            isHighlighted ? 'ring-2 ring-yellow-500' : ''
                          } ${isDimmed ? 'opacity-40' : ''}`}
                          style={{
                            borderColor: isHighlighted
                              ? '#c9a84c'
                              : getGenderColor(member.gender),
                            borderWidth: isHighlighted ? 2 : 1,
                          }}
                          onClick={() => onMemberClick?.(member)}
                          onMouseEnter={(e) => {
                            setHoveredMember({ member, x: e.clientX, y: e.clientY })
                          }}
                          onMouseLeave={() => setHoveredMember(null)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <AvatarDisplay
                                name={member.name}
                                avatar={member.avatar}
                                size={32}
                              />
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {member.name}
                                  {!member.is_alive && (
                                    <span className="ml-1 text-muted-foreground">†</span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.birth_date
                                    ? new Date(member.birth_date).getFullYear()
                                    : '?'}
                                  {member.death_date &&
                                    ` - ${new Date(member.death_date).getFullYear()}`}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#2563eb]" />
          <span>男性</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ec4899]" />
          <span>女性</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#94a3b8]" />
          <span>未知</span>
        </div>
      </div>

      {hoveredMember && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border bg-card p-3 shadow-lg animate-fade-in"
          style={{
            left: hoveredMember.x + 15,
            top: hoveredMember.y + 15,
            maxWidth: 280,
          }}
        >
          <div className="flex items-center gap-3">
            <AvatarDisplay
              name={hoveredMember.member.name}
              avatar={hoveredMember.member.avatar}
              gender={hoveredMember.member.gender}
              size={36}
            />
            <div>
              <h4 className="font-semibold">{hoveredMember.member.name}</h4>
              <p className="text-xs text-muted-foreground">
                {hoveredMember.member.gender === 'male' ? '男' : hoveredMember.member.gender === 'female' ? '女' : '未知'}
                {hoveredMember.member.generation_name && ` · ${hoveredMember.member.generation_name}字辈`}
                {!hoveredMember.member.is_alive && ' · 已故'}
              </p>
            </div>
          </div>
          {hoveredMember.member.birth_date && (
            <p className="mt-2 text-xs text-muted-foreground">
              出生：{hoveredMember.member.birth_date}
            </p>
          )}
          {hoveredMember.member.death_date && (
            <p className="text-xs text-muted-foreground">
              逝世：{hoveredMember.member.death_date}
            </p>
          )}
          {hoveredMember.member.bio && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
              {hoveredMember.member.bio}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
