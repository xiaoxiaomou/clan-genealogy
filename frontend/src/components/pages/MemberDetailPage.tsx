import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Member, Family, FamilyTree } from '@/types'
import {
  Button,
  AvatarDisplay,
  useToast,
  BorderGlow,
  RichTextRenderer,
} from '@/components/ui'
import { Layout } from '@/components/layout/Layout'
import { MemberEditHistoryPanel } from '@/components/ui/MemberEditHistoryPanel'
import {
  ArrowLeft,
  Edit3,
  User,
  Heart,
  Baby,
  Calendar,
  MapPin,
  BookOpen,
  Cross,
  BookText,
} from 'lucide-react'

export default function MemberDetailPage() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)
  const mId = Number(memberId)

  const [family, setFamily] = useState<Family | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [treeData, setTreeData] = useState<FamilyTree | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    if (familyId && mId) {
      loadData()
    }
  }, [familyId, mId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [familyRes, memberRes, treeRes, roleRes] = await Promise.all([
        api.getFamily(familyId),
        api.getMember(familyId, mId),
        api.getFamilyTree(familyId),
        api.getMyRole(familyId),
      ])
      setFamily(familyRes.family)
      setMember(memberRes.member)
      setTreeData(treeRes)
      setCanEdit(roleRes.can_edit)
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // 从 treeData 中计算子女
  const getChildren = (): Member[] => {
    if (!treeData || !member) return []
    const childIds = treeData.edges
      .filter((e) => e.type === 'parent' && e.source === member.id)
      .map((e) => e.target)
    return treeData.nodes
      .filter((n) => childIds.includes(n.id))
      .map((n) => ({
        id: n.id,
        family_id: familyId,
        name: n.name,
        gender: n.gender as 'male' | 'female' | 'unknown',
        birth_date: n.birth_date,
        death_date: n.death_date,
        generation: n.generation,
        generation_name: n.generation_name,
        bio: null,
        avatar: n.avatar,
        branch_id: (n as any).branch_id ?? null,
        is_alive: n.is_alive,
        created_at: '',
        updated_at: '',
      }))
  }

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case 'male': return 'bg-blue-50 text-blue-600 border-blue-100'
      case 'female': return 'bg-pink-50 text-pink-600 border-pink-100'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return '男'
      case 'female': return '女'
      default: return '未知'
    }
  }

  const children = getChildren()

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center" role="status" aria-live="polite">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
          <span className="sr-only">加载成员信息...</span>
        </div>
      </Layout>
    )
  }

  if (!member) {
    return (
      <Layout>
        <div className="flex h-screen flex-col items-center justify-center text-muted-foreground" role="alert">
          <p>成员不存在或无权访问</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(`/family/${familyId}`)} aria-label="返回族谱">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            返回族谱
          </Button>
        </div>
      </Layout>
    )
  }

  const InfoItem = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string | null }) => {
    if (!value) return null
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value}</p>
        </div>
      </div>
    )
  }

  const RelationCard = ({ m }: { m: Member }) => (
    <button
      onClick={() => navigate(`/family/${familyId}/member/${m.id}`)}
      className="flex items-center gap-3 rounded border bg-card p-3 transition-all hover:shadow-md text-left w-full"
      aria-label={`查看 ${m.name} 的详细信息`}
    >
      <AvatarDisplay avatar={m.avatar} name={m.name} gender={m.gender} size={40} />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm">{m.name}</p>
        <p className="text-xs text-muted-foreground">
          {getGenderLabel(m.gender)}
          {m.generation_name && ` · ${m.generation_name}字辈`}
          {m.birth_date && ` · ${m.birth_date.substring(0, 4)}年`}
          {!m.is_alive && ' · 已故'}
        </p>
      </div>
    </button>
  )

  return (
    <Layout>
      

      <BorderGlow
        backgroundColor="transparent"
        className="!bg-transparent border-0 p-0"
        colors={['#4facfe', '#00f2fe', '#43e97b']}
        glowIntensity={0.3}
        edgeSensitivity={35}
      >
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* 顶部导航 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/family/${familyId}`)} aria-label="返回族谱">
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              返回族谱
            </Button>
            <h1 className="text-lg font-semibold text-foreground">{family?.name}</h1>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/family/${familyId}`, { state: { editMemberId: member.id } })}
              className="gap-1"
              aria-label="编辑成员信息"
            >
              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
              编辑
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/family/${familyId}/member/${member.id}/biography`)}
            className="gap-1"
            aria-label="翻开传记"
          >
            <BookText className="h-3.5 w-3.5" aria-hidden="true" />
            翻开传记
          </Button>
        </div>

        {/* 基本信息卡片 */}
        <div className="mb-8 rounded-lg bg-white dark:bg-[#262628] border p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <AvatarDisplay
              avatar={member.avatar}
              name={member.name}
              gender={member.gender}
              size={96}
            />
            <div className="flex-1 text-center sm:text-left">
              <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-2xl font-bold">{member.name}</h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getGenderColor(member.gender)}`}>
                  {getGenderLabel(member.gender)}
                </span>
                {!member.is_alive && (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    已故
                  </span>
                )}
              </div>
              {member.generation_name && (
                <p className="mb-1 text-sm text-muted-foreground">
                  第{member.generation}代 · {member.generation_name}字辈
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <InfoItem icon={Calendar} label="出生日期" value={member.birth_date} />
            <InfoItem icon={Cross} label="逝世日期" value={member.death_date} />
            <InfoItem icon={MapPin} label="籍贯" value={family?.origin ?? null} />
          </div>

          {/* 生平简介 - 富文本 */}
          {member.bio && (
            <div className="mt-6 rounded-lg border bg-white p-6 dark:bg-[#262628]">
              <div className="mb-3 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-lg font-medium text-foreground">生平简介</h3>
              </div>
              <RichTextRenderer html={member.bio} />
            </div>
          )}
        </div>

        {/* 亲属关系 */}
        <div className="space-y-6">
          {/* 父母 */}
          {member.parents && member.parents.length > 0 && (
            <div className="rounded-lg bg-white dark:bg-[#262628] border p-6">
              <div className="mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-lg font-medium text-foreground">父母</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {member.parents.map((p) => (
                  <RelationCard key={p.id} m={p} />
                ))}
              </div>
            </div>
          )}

          {/* 配偶 */}
          {member.spouses && member.spouses.length > 0 && (
            <div className="rounded-lg bg-white dark:bg-[#262628] border p-6">
              <div className="mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-lg font-medium text-foreground">配偶</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {member.spouses.map((s) => (
                  <RelationCard key={s.id} m={s} />
                ))}
              </div>
            </div>
          )}

          {/* 子女 */}
          {children.length > 0 && (
            <div className="rounded-lg bg-white dark:bg-[#262628] border p-6">
              <div className="mb-4 flex items-center gap-2">
                <Baby className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-lg font-medium text-foreground">子女</h3>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                  {children.length}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {children.map((c) => (
                  <RelationCard key={c.id} m={c} />
                ))}
              </div>
            </div>
          )}

          {/* 编辑历史 */}
          <div className="mt-6">
            <MemberEditHistoryPanel
              familyId={Number(id)}
              memberId={Number(memberId)}
              canEdit={true}
              isAdmin={(() => { try { return !!(JSON.parse(localStorage.getItem('user') || 'null')?.is_admin); } catch { return false; } })()}
            />
          </div>
        </div>
      </div>
      </BorderGlow>
    </Layout>
  )
}
