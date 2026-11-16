import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { smartBack } from '@/lib/smartBack'
import type { Member, Family, FamilyTree } from '@/types'
import {
  Button,
  AvatarDisplay,
  useToast,
  RichTextRenderer,
} from '@/components/ui'
import { Layout } from '@/components/layout/Layout'
import { MemberEditHistoryPanel } from '@/components/ui/MemberEditHistoryPanel'
import { PgSectionHead } from '@/components/ui/pedigree'
import {
  ArrowLeft,
  Edit3,
  User,
  Heart,
  Calendar,
  MapPin,
  Cross,
  BookText,
  Landmark,
  Footprints,
} from 'lucide-react'
import type { MemberFormData } from './MemberFormModal'

const MemberFormModal = lazy(() => import('./MemberFormModal'))

const SAVE_SHORTCUT_KEYS = 'Ctrl+S / Ctrl+Enter'

const defaultMemberForm: MemberFormData = {
  name: '',
  gender: 'male',
  birth_date: '',
  death_date: '',
  generation: '',
  generation_name: '',
  bio: '',
  avatar: '',
  is_alive: true,
  courtesy_name: '',
  art_name: '',
  posthumous_name: '',
  burial_place: '',
  migration_note: '',
  spouse_family_name: '',
  privacy_level: 'public',
  privacy_override: false,
}

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

  /* 编辑弹窗（原地编辑，不再跳回族谱页） */
  const [showEdit, setShowEdit] = useState(false)
  const [memberForm, setMemberForm] = useState<MemberFormData>({ ...defaultMemberForm })
  const [generationSuggestion, setGenerationSuggestion] = useState<string | null>(null)
  const formRefEdit = useRef<HTMLFormElement>(null!)
  const formRefAdd = useRef<HTMLFormElement>(null!)

  const openEdit = () => {
    if (!member) return
    setMemberForm({
      name: member.name,
      gender: member.gender,
      birth_date: member.birth_date || '',
      death_date: member.death_date || '',
      generation: member.generation?.toString() || '',
      generation_name: member.generation_name || '',
      bio: member.bio || '',
      avatar: member.avatar || '',
      is_alive: member.is_alive,
      courtesy_name: member.courtesy_name || '',
      art_name: member.art_name || '',
      posthumous_name: member.posthumous_name || '',
      burial_place: member.burial_place || '',
      migration_note: member.migration_note || '',
      spouse_family_name: member.spouse_family_name || '',
      privacy_level: member.privacy_level || 'public',
      privacy_override: member.privacy_override || false,
    })
    setShowEdit(true)
  }

  const handleFormChange = useCallback(async (field: string, value: any) => {
    setMemberForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'generation' && value) {
      const genNum = Number(value)
      if (!isNaN(genNum)) {
        try {
          const res = await api.suggestGeneration(familyId, genNum)
          setGenerationSuggestion(res.has_rule && res.character ? res.character : null)
        } catch {
          setGenerationSuggestion(null)
        }
      }
    } else if (field === 'generation') {
      setGenerationSuggestion(null)
    }
  }, [familyId])

  const applyGenerationSuggestion = () => {
    if (generationSuggestion) {
      setMemberForm((prev) => ({ ...prev, generation_name: generationSuggestion }))
      setGenerationSuggestion(null)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return
    try {
      await api.updateMember(familyId, member.id, {
        name: memberForm.name,
        gender: memberForm.gender as 'male' | 'female' | 'unknown',
        birth_date: memberForm.birth_date || undefined,
        death_date: memberForm.death_date || undefined,
        generation: memberForm.generation ? Number(memberForm.generation) : undefined,
        generation_name: memberForm.generation_name || undefined,
        bio: memberForm.bio || undefined,
        avatar: memberForm.avatar || undefined,
        is_alive: memberForm.is_alive,
        courtesy_name: memberForm.courtesy_name || undefined,
        art_name: memberForm.art_name || undefined,
        posthumous_name: memberForm.posthumous_name || undefined,
        burial_place: memberForm.burial_place || undefined,
        migration_note: memberForm.migration_note || undefined,
        spouse_family_name: memberForm.spouse_family_name || undefined,
        privacy_level: memberForm.privacy_level,
        privacy_override: memberForm.privacy_override,
      })
      showToast('成员信息已更新', 'success')
      setShowEdit(false)
      loadData()
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error')
    }
  }

  /* Ctrl+S / Ctrl+Enter 快捷保存 */
  useEffect(() => {
    if (!showEdit) return
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
        e.preventDefault()
        formRefEdit.current?.requestSubmit()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showEdit])

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
          <Button variant="ghost" className="mt-4" onClick={() => smartBack(navigate, `/family/${familyId}`)} aria-label="返回族谱">
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
      <div className="pg-rise mx-auto max-w-3xl px-4 py-8">
        {/* 顶部导航 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => smartBack(navigate, `/family/${familyId}`)} aria-label="返回族谱">
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              返回族谱
            </Button>
            <h1 className="text-lg font-semibold text-foreground">{family?.name}</h1>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={openEdit}
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
        <div className="pg-card mb-8 p-6">
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
            <InfoItem icon={Landmark} label="葬地" value={member.burial_place ?? null} />
            <InfoItem icon={Heart} label="适（夫家姓氏）" value={member.spouse_family_name ?? null} />
            <InfoItem icon={Footprints} label="迁徙" value={member.migration_note ?? null} />
          </div>

          {/* 生平简介 - 富文本 */}
          {member.bio && (
            <div className="pg-card-soft mt-6 p-6">
              <PgSectionHead text="生 平 简 介" />
              <RichTextRenderer html={member.bio} />
            </div>
          )}
        </div>

        {/* 亲属关系 */}
        <div className="space-y-6">
          {/* 父母 */}
          {member.parents && member.parents.length > 0 && (
            <div className="pg-card p-6">
              <PgSectionHead text="父 母" />
              <div className="grid gap-3 sm:grid-cols-2">
                {member.parents.map((p) => (
                  <RelationCard key={p.id} m={p} />
                ))}
              </div>
            </div>
          )}

          {/* 配偶 */}
          {member.spouses && member.spouses.length > 0 && (
            <div className="pg-card p-6">
              <PgSectionHead text="配 偶" />
              <div className="grid gap-3 sm:grid-cols-2">
                {member.spouses.map((s) => (
                  <RelationCard key={s.id} m={s} />
                ))}
              </div>
            </div>
          )}

          {/* 子女 */}
          {children.length > 0 && (
            <div className="pg-card p-6">
              <PgSectionHead
                text="子 女"
                right={
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {children.length}
                  </span>
                }
              />
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

      {canEdit && member && (
        <Suspense fallback={null}>
          <MemberFormModal
            showAdd={false}
            showEdit={showEdit}
            formData={memberForm}
            editingMember={member}
            formRefAdd={formRefAdd}
            formRefEdit={formRefEdit}
            saveShortcutHint={`快捷保存：${SAVE_SHORTCUT_KEYS}`}
            familyId={familyId}
            onChange={handleFormChange}
            onCloseAdd={() => {}}
            onCloseEdit={() => setShowEdit(false)}
            onSubmitAdd={(e) => e.preventDefault()}
            onSubmitEdit={handleEditSubmit}
            generationSuggestion={generationSuggestion}
            onApplySuggestion={applyGenerationSuggestion}
          />
        </Suspense>
      )}
    </Layout>
  )
}
