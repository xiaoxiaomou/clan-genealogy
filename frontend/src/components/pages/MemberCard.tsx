import { Button, AvatarDisplay } from '@/components/ui'
import { Eye, Trash2 } from 'lucide-react'
import type { Member } from '@/types'

interface MemberCardProps {
  member: Member
  canEdit: boolean
  onView: (memberId: number) => void
  onDelete: (memberId: number) => void
}

function getGenderLabel(gender: string): string {
  switch (gender) {
    case 'male':
      return '男'
    case 'female':
      return '女'
    default:
      return '未知'
  }
}

export default function MemberCard({
  member,
  canEdit,
  onView,
  onDelete,
}: MemberCardProps) {
  return (
    <div
      className="flex items-center gap-3 rounded border bg-card p-4 transition-all hover:shadow-gu-md cursor-pointer"
      onClick={() => onView(member.id)}
    >
      <AvatarDisplay
        avatar={member.avatar}
        name={member.name}
        gender={member.gender}
        size={40}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{member.name}</p>
        <p className="text-xs text-muted-foreground">
          {getGenderLabel(member.gender)}
          {member.generation_name && ` · ${member.generation_name}字辈`}
          {member.birth_date && ` · ${member.birth_date.substring(0, 4)}年`}
          {!member.is_alive && ' · 已故'}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onView(member.id)
        }}
      >
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(member.id)
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  )
}
