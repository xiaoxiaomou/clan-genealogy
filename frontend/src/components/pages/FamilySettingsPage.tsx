import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Family, FamilyUser, SearchUser, GenerationRule, Invitation, AuditLog, AuditLogStats } from '@/types'
import {
  Button,
  Input,
  Label,
  useToast,
  AvatarDisplay,
} from '@/components/ui'
import { Layout } from '@/components/layout/Layout'
import { ShareLinksSection } from '@/components/ui/ShareLinksSection'
import { FamilyMergeSection } from '@/components/ui/FamilyMergeSection'
import {
  ArrowLeft,
  Settings,
  Users,
  UserPlus,
  Trash2,
  Shield,
  Search,
  Pencil,
  Save,
  X,
  BookText,
  Plus,
  Copy,
  Check,
  Share2,
  GitMerge,
  Clock,
  Activity,
  ExternalLink,
  ListChecks,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  owner: '所有者',
  admin: '管理员',
  editor: '编辑者',
  viewer: '查看者',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-amber-600 bg-amber-50',
  admin: 'text-blue-600 bg-blue-50',
  editor: 'text-green-600 bg-green-50',
  viewer: 'text-muted-foreground bg-muted',
}

export default function FamilySettingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [family, setFamily] = useState<Family | null>(null)
  const [users, setUsers] = useState<FamilyUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // 辈分字派管理
  const [generations, setGenerations] = useState<GenerationRule[]>([])
  const [showAddGen, setShowAddGen] = useState(false)
  const [addingGen, setAddingGen] = useState(false)
  const [genForm, setGenForm] = useState({ generation: 0, character: '', description: '' })

  // 邀请管理
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ role: 'viewer', max_uses: 0, expires_in_hours: 72 })
  const [createdCode, setCreatedCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [loadingInvites, setLoadingInvites] = useState(false)

  // 审计日志
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditStats, setAuditStats] = useState<AuditLogStats | null>(null)
  const [auditPage, setAuditPage] = useState(1)
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPages, setAuditPages] = useState(1)
  const [loadingAudit, setLoadingAudit] = useState(false)

  // 编辑族谱信息
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    surname: '',
    origin: '',
    description: '',
    is_public: false,
  })

  // 搜索添加用户
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [addingUserId, setAddingUserId] = useState<number | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        setCurrentUserId(user.id)
        setIsAdmin(user.is_admin || false)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [familyRes, usersRes, gensRes] = await Promise.all([
        api.getFamily(familyId),
        api.getFamilyUsers(familyId),
        api.getGenerations(familyId),
      ])
      setFamily(familyRes.family)
      setUsers(usersRes.users)
      setGenerations(gensRes.generations)
      setEditForm({
        name: familyRes.family.name || '',
        surname: familyRes.family.surname || '',
        origin: familyRes.family.origin || '',
        description: familyRes.family.description || '',
        is_public: familyRes.family.is_public || false,
      })
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [familyId, showToast])

  useEffect(() => {
    if (familyId) {
      loadData()
    }
  }, [familyId, loadData])

  // 加载邀请列表
  const loadInvitations = useCallback(async () => {
    setLoadingInvites(true)
    try {
      const res = await api.getInvitations(familyId)
      setInvitations(res.invitations)
    } catch {
      // ignore
    } finally {
      setLoadingInvites(false)
    }
  }, [familyId])

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.createInvitation(familyId, {
        role: inviteForm.role,
        max_uses: inviteForm.max_uses > 0 ? inviteForm.max_uses : undefined,
        expires_in_hours: inviteForm.expires_in_hours > 0 ? inviteForm.expires_in_hours : undefined,
      })
      setCreatedCode(res.invitation.code)
      showToast('邀请链接已生成', 'success')
      loadInvitations()
    } catch (err: any) {
      showToast(err.message || '生成失败', 'error')
    }
  }

  const handleDeleteInvitation = async (inviteId: number) => {
    if (!confirm('确定要删除此邀请吗？')) return
    try {
      await api.deleteInvitation(familyId, inviteId)
      showToast('邀请已删除', 'success')
      loadInvitations()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getInviteLink = (code: string) => {
    return `${window.location.origin}/invitation/join?code=${code}`
  }

  // 加载审计日志
  const loadAuditLogs = useCallback(async (page: number = 1) => {
    setLoadingAudit(true)
    try {
      const res = await api.getAuditLogs(familyId, page, 20)
      setAuditLogs(res.audit_logs)
      setAuditTotal(res.total)
      setAuditPage(res.page)
      setAuditPages(res.pages)
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false)
    }
  }, [familyId])

  const loadAuditStats = useCallback(async () => {
    try {
      const res = await api.getAuditLogStats(familyId)
      setAuditStats(res)
    } catch {
      // ignore
    }
  }, [familyId])

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      showToast('搜索关键词至少2个字符', 'error')
      return
    }
    setIsSearching(true)
    try {
      const res = await api.searchUsers(searchQuery.trim())
      // 过滤掉已在族谱中的用户
      const existingIds = new Set(users.map((u) => u.user_id))
      const filtered = res.users.filter((u) => !existingIds.has(u.id))
      setSearchResults(filtered)
      setShowSearchResults(true)
    } catch (err: any) {
      showToast(err.message || '搜索失败', 'error')
    } finally {
      setIsSearching(false)
    }
  }

  // 添加用户到族谱
  const handleAddUser = async (userId: number, role: string = 'viewer') => {
    setAddingUserId(userId)
    try {
      await api.addFamilyUser(familyId, userId, role)
      showToast('用户授权成功', 'success')
      setSearchQuery('')
      setSearchResults([])
      setShowSearchResults(false)
      loadData()
    } catch (err: any) {
      showToast(err.message || '授权失败', 'error')
    } finally {
      setAddingUserId(null)
    }
  }

  // 修改角色
  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await api.updateFamilyUserRole(familyId, userId, newRole)
      showToast('角色更新成功', 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error')
    }
  }

  // 移除用户
  const handleRemoveUser = async (userId: number) => {
    if (!confirm('确定要移除该用户的访问权限吗？')) return
    try {
      await api.removeFamilyUser(familyId, userId)
      showToast('用户已移除', 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message || '移除失败', 'error')
    }
  }

  // 检查当前用户是否有管理权限
  const canManage = () => {
    if (isAdmin) return true
    const me = users.find((u) => u.user_id === currentUserId)
    return me && (me.role === 'owner' || me.role === 'admin')
  }

  const handleEditSave = async () => {
    try {
      const res = await api.updateFamily(familyId, editForm)
      setFamily(res.family)
      setIsEditing(false)
      showToast('族谱信息已更新', 'success')
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error')
    }
  }

  const handleDeleteFamily = async () => {
    if (!confirm('确定要删除该族谱吗？此操作不可恢复，所有成员和关系数据也将被删除。')) return
    try {
      await api.deleteFamily(familyId)
      showToast('族谱已删除', 'success')
      navigate('/')
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  // 辈分字派
  const handleAddGeneration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!genForm.generation || !genForm.character.trim()) return
    setAddingGen(true)
    try {
      await api.addGeneration(familyId, {
        generation: genForm.generation,
        character: genForm.character.trim(),
        description: genForm.description.trim() || undefined,
      })
      showToast('字派添加成功', 'success')
      setShowAddGen(false)
      setGenForm({ generation: 0, character: '', description: '' })
      loadData()
    } catch (err: any) {
      showToast(err.message || '添加失败', 'error')
    } finally {
      setAddingGen(false)
    }
  }

  const handleDeleteGeneration = async (ruleId: number) => {
    if (!confirm('确定要删除此字派规则吗？')) return
    try {
      await api.deleteGeneration(familyId, ruleId)
      showToast('字派已删除', 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="mb-8">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="mb-8 rounded-md border p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-5 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
          <div className="rounded-md border p-6">
            <div className="mb-6 flex items-center gap-2">
              <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              <div className="h-5 w-8 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between rounded border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                    <div>
                      <div className="mb-1 h-4 w-24 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                  <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!family) {
    return (
      <Layout>
        <div className="flex h-screen flex-col items-center justify-center text-muted-foreground">
          <p>族谱不存在或无权访问</p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* 顶部导航 */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/family/${familyId}`)}
            aria-label="返回族谱"
          >
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            返回族谱
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-foreground">
              {family.name} - 设置
            </h1>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => navigate(`/family/${familyId}/batch`)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-700/20 bg-amber-700/5 p-4 text-xs font-medium text-foreground transition-colors hover:bg-amber-700/10"
            aria-label="批量操作成员"
          >
            <ListChecks className="h-5 w-5 text-amber-700" aria-hidden="true" />
            批量操作
            <span className="text-[10px] font-normal text-muted-foreground">编辑/删除/导入</span>
          </button>
          <button
            onClick={() => document.getElementById('share-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-700/20 bg-amber-700/5 p-4 text-xs font-medium text-foreground transition-colors hover:bg-amber-700/10"
            aria-label="管理公开分享链接"
          >
            <Share2 className="h-5 w-5 text-amber-700" aria-hidden="true" />
            公开分享
            <span className="text-[10px] font-normal text-muted-foreground">生成只读链接</span>
          </button>
          <button
            onClick={() => document.getElementById('merge-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs font-medium text-foreground transition-colors hover:bg-rose-500/10"
            aria-label="合并其他家族"
          >
            <GitMerge className="h-5 w-5 text-rose-500" aria-hidden="true" />
            家族合并
            <span className="text-[10px] font-normal text-muted-foreground">高危操作</span>
          </button>
        </div>

        {/* 公开分享链接 */}
        <ShareLinksSection familyId={familyId} />

        {/* 家族合并 */}
        <div id="merge-section" className="mb-6">
          <FamilyMergeSection familyId={familyId} />
        </div>

        {/* 族谱信息 */}
        <div className="mb-8 rounded-lg bg-white dark:bg-[#262628] border p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">族谱信息</h2>
            <div className="flex items-center gap-2">
              {canManage() && !isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1"
                  aria-label="编辑族谱信息"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  编辑
                </Button>
              )}
              {canManage() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteFamily}
                  className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                  aria-label="删除族谱"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  删除
                </Button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">名称</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-surname">姓氏</Label>
                  <Input
                    id="edit-surname"
                    value={editForm.surname}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, surname: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-origin">籍贯</Label>
                <Input
                  id="edit-origin"
                  value={editForm.origin}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, origin: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">描述</Label>
                <textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, description: e.target.value }))
                  }
                  rows={3}
                  className="flex w-full rounded border border-border bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-is-public"
                  checked={editForm.is_public}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, is_public: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="edit-is-public" className="cursor-pointer text-sm">
                  公开族谱（允许他人查看）
                </Label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    setEditForm({
                      name: family.name || '',
                      surname: family.surname || '',
                      origin: family.origin || '',
                      description: family.description || '',
                      is_public: family.is_public || false,
                    })
                  }}
                  className="gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  取消
                </Button>
                <Button
                  variant="apple"
                  glow
                  size="sm"
                  onClick={handleEditSave}
                  className="gap-1"
                >
                  <Save className="h-3.5 w-3.5" />
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">名称：</span>
                <span className="font-medium text-foreground">{family.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">姓氏：</span>
                <span className="font-medium text-foreground">
                  {family.surname || '未设置'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">籍贯：</span>
                <span className="font-medium text-foreground">
                  {family.origin || '未设置'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">公开：</span>
                <span className="font-medium text-foreground">
                  {family.is_public ? '是' : '否'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">描述：</span>
                <span className="font-medium text-foreground">
                  {family.description || '未设置'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 辈分字派管理 */}
        <div className="mb-8 rounded-lg bg-white dark:bg-[#262628] border p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-lg font-medium text-foreground">辈分字派</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {generations.length}
              </span>
            </div>
            {canManage() && !showAddGen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddGen(true)}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                添加字派
              </Button>
            )}
          </div>

          {/* 添加字派表单 */}
          {showAddGen && (
            <form onSubmit={handleAddGeneration} className="mb-4 rounded border bg-muted/30 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="gen-number">辈分（第几代）</Label>
                  <Input
                    id="gen-number"
                    type="number"
                    min={1}
                    placeholder="如：1"
                    value={genForm.generation || ''}
                    onChange={(e) => setGenForm({ ...genForm, generation: e.target.value ? Number(e.target.value) : 0 })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gen-char">字派</Label>
                  <Input
                    id="gen-char"
                    placeholder="如：文"
                    value={genForm.character}
                    onChange={(e) => setGenForm({ ...genForm, character: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="gen-desc">备注（可选）</Label>
                <Input
                  id="gen-desc"
                  placeholder="如：始祖、二世祖..."
                  value={genForm.description || ''}
                  onChange={(e) => setGenForm({ ...genForm, description: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="apple" glow size="sm" disabled={addingGen}>
                  {addingGen ? '添加中...' : '确认添加'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  setShowAddGen(false)
                  setGenForm({ generation: 0, character: '', description: '' })
                }}>
                  取消
                </Button>
              </div>
            </form>
          )}

          {/* 字派列表 */}
          {generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <BookText className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">尚未设置辈分字派</p>
              <p className="text-xs mt-1">添加字派后，添加成员时可以自动推荐对应辈分的字</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded border">
              <table className="w-full text-sm table-cards">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">辈分</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">字派</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">备注</th>
                    {canManage() && <th className="px-4 py-2 text-right font-medium text-muted-foreground">操作</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {generations.map((g) => (
                    <tr key={g.id} className="hover:bg-muted/20">
                      <td data-label="辈分" className="px-4 py-3 font-medium">第{g.generation}代</td>
                      <td data-label="字派" className="px-4 py-3">
                        <span className="inline-block rounded bg-primary/10 px-3 py-1 font-mono text-lg font-bold text-primary">
                          {g.character}
                        </span>
                      </td>
                      <td data-label="备注" className="px-4 py-3 text-muted-foreground">{g.description || '-'}</td>
                      {canManage() && (
                        <td data-label="操作" className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleDeleteGeneration(g.id)}
                            aria-label={`删除第${g.generation}代字派`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 字派诗展示 */}
          {generations.length >= 4 && (
            <div className="mt-6 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4 border border-amber-200 dark:border-amber-800">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
                <BookText className="h-4 w-4" />
                字派诗
              </h3>
              <div className="flex flex-wrap gap-2">
                {generations
                  .sort((a, b) => a.generation - b.generation)
                  .map((g, idx) => (
                    <div key={g.id} className="flex items-center gap-1">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 font-mono font-bold text-sm">
                        {g.character}
                      </span>
                      {idx < generations.length - 1 && (
                        <span className="text-amber-400 mx-1">→</span>
                      )}
                    </div>
                  ))}
              </div>
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                共 {generations.length} 个辈分，{generations[0].generation} - {generations[generations.length - 1].generation} 代
              </p>
            </div>
          )}
        </div>

        {/* 成员权限管理 */}
        <div className="rounded-lg bg-white dark:bg-[#262628] border p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-lg font-medium text-foreground">成员权限</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {users.length}
              </span>
            </div>
          </div>

          {/* 添加用户 */}
          {canManage() && (
            <div className="mb-6">
              <Label htmlFor="search-users" className="mb-2 block text-sm font-medium text-foreground">
                添加成员
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="search-users"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      if (!e.target.value.trim()) {
                        setShowSearchResults(false)
                        setSearchResults([])
                      }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="搜索用户名或昵称（至少2个字符）"
                    className="pl-9"
                    aria-label="搜索用户"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching} aria-label="搜索用户">
                  <Search className="mr-1 h-4 w-4" aria-hidden="true" />
                  搜索
                </Button>
              </div>

              {/* 搜索结果 */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="mt-2 rounded border bg-muted/50 p-3">
                  <p className="mb-2 text-xs text-muted-foreground">搜索结果：</p>
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <AvatarDisplay
                            avatar={user.avatar}
                            name={user.display_name || user.username}
                            size={32}
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {user.display_name || user.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddUser(user.id)}
                          disabled={addingUserId === user.id}
                        >
                          <UserPlus className="mr-1 h-3 w-3" />
                          添加
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showSearchResults && searchResults.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">未找到匹配的用户</p>
              )}
            </div>
          )}

          {/* 用户列表 */}
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded border bg-muted/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <AvatarDisplay
                    avatar={user.avatar}
                    name={user.display_name || user.username}
                    size={40}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {user.display_name || user.username}
                      {user.user_id === currentUserId && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (你)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* 角色标签/选择 */}
                  {canManage() && user.user_id !== currentUserId ? (
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.user_id, e.target.value)
                        }
                        className="rounded-lg border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        aria-label={`修改 ${user.display_name || user.username} 的角色`}
                      >
                        <option value="viewer">查看者</option>
                        <option value="editor">编辑者</option>
                        <option value="admin">管理员</option>
                        <option value="owner">所有者</option>
                      </select>
                    </div>
                  ) : (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role] || ROLE_COLORS.viewer}`}
                    >
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  )}

                  {/* 移除按钮 */}
                  {canManage() &&
                    user.user_id !== currentUserId &&
                    user.role !== 'owner' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleRemoveUser(user.user_id)}
                        aria-label={`移除 ${user.display_name || user.username}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 邀请管理 */}
        <div className="mb-8 rounded-lg bg-white dark:bg-[#262628] border p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-lg font-medium text-foreground">邀请管理</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {invitations.length}
              </span>
            </div>
            {canManage() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowInviteModal(true)
                  setCreatedCode('')
                  setInviteForm({ role: 'viewer', max_uses: 0, expires_in_hours: 72 })
                }}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                生成邀请
              </Button>
            )}
          </div>

          {/* 生成邀请弹窗 */}
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/15 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold">生成邀请链接</h3>
                {createdCode ? (
                  <div className="space-y-4">
                    <div className="rounded border bg-muted/30 p-4">
                      <p className="mb-2 text-xs text-muted-foreground">邀请码</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-lg font-bold text-primary">
                          {createdCode}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCode(createdCode)}
                          className="gap-1"
                        >
                          {copied ? (
                            <><Check className="h-3.5 w-3.5" /> 已复制</>
                          ) : (
                            <><Copy className="h-3.5 w-3.5" /> 复制</>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="rounded border bg-muted/30 p-4">
                      <p className="mb-2 text-xs text-muted-foreground">邀请链接</p>
                      <p className="break-all rounded bg-background px-3 py-2 font-mono text-xs">
                        {getInviteLink(createdCode)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowInviteModal(false)}
                    >
                      关闭
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleCreateInvitation} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">角色权限</Label>
                      <select
                        id="invite-role"
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        <option value="viewer">查看者</option>
                        <option value="editor">编辑者</option>
                        <option value="admin">管理员</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-max">最大使用次数</Label>
                        <Input
                          id="invite-max"
                          type="number"
                          min={0}
                          placeholder="0 = 不限"
                          value={inviteForm.max_uses || ''}
                          onChange={(e) => setInviteForm((p) => ({ ...p, max_uses: e.target.value ? Number(e.target.value) : 0 }))}
                        />
                        <p className="text-xs text-muted-foreground">0 表示不限次数</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-expires">有效时长（小时）</Label>
                        <Input
                          id="invite-expires"
                          type="number"
                          min={0}
                          placeholder="72"
                          value={inviteForm.expires_in_hours || ''}
                          onChange={(e) => setInviteForm((p) => ({ ...p, expires_in_hours: e.target.value ? Number(e.target.value) : 0 }))}
                        />
                        <p className="text-xs text-muted-foreground">0 表示永不过期</p>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowInviteModal(false)}
                      >
                        取消
                      </Button>
                      <Button type="submit" variant="apple" glow className="flex-1">
                        生成
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* 邀请列表 */}
          {loadingInvites ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Share2 className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">暂无邀请</p>
              <p className="text-xs mt-1">生成邀请链接，让其他人加入这个族谱</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                      <Share2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
                          {inv.code}
                        </code>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.role === 'admin' ? 'text-blue-600 bg-blue-50' :
                          inv.role === 'editor' ? 'text-green-600 bg-green-50' :
                          'text-muted-foreground bg-muted'
                        }`}>
                          {inv.role === 'admin' ? '管理员' : inv.role === 'editor' ? '编辑者' : '查看者'}
                        </span>
                        {!inv.is_active && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">已失效</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          已使用 {inv.use_count}/{inv.max_uses === 0 ? '∞' : inv.max_uses} 次
                        </span>
                        {inv.expires_at && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(inv.expires_at) > new Date() ? '有效' : '已过期'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleCopyCode(inv.code)}
                      aria-label="复制邀请码"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    {canManage() && inv.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDeleteInvitation(inv.id)}
                        aria-label="删除邀请"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 审计日志 */}
        <div className="rounded-lg bg-white dark:bg-[#262628] border p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-lg font-medium text-foreground">审计日志</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {auditTotal}
              </span>
            </div>
            {canManage() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  loadAuditLogs()
                  loadAuditStats()
                }}
                className="gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                刷新
              </Button>
            )}
          </div>

          {/* 审计统计 */}
          {auditStats && (
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded border bg-muted/30 p-3 text-center">
                <p className="text-lg font-bold text-foreground">{Object.values(auditStats.by_action).reduce((a, b) => a + b, 0)}</p>
                <p className="text-xs text-muted-foreground">总操作数</p>
              </div>
              <div className="rounded border bg-muted/30 p-3 text-center">
                <p className="text-lg font-bold text-foreground">{Object.keys(auditStats.by_action).length}</p>
                <p className="text-xs text-muted-foreground">操作类型</p>
              </div>
              <div className="rounded border bg-muted/30 p-3 text-center">
                <p className="text-lg font-bold text-foreground">{Object.keys(auditStats.by_entity).length}</p>
                <p className="text-xs text-muted-foreground">涉及模块</p>
              </div>
            </div>
          )}

          {/* 日志列表 */}
          {loadingAudit ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Activity className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">暂无审计日志</p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded border">
                <table className="w-full text-sm table-cards">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">时间</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">用户</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">操作</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">描述</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td data-label="时间" className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td data-label="用户" className="px-3 py-2.5 text-sm">{log.username || '-'}</td>
                        <td data-label="操作" className="px-3 py-2.5">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                            {log.action}
                          </span>
                        </td>
                        <td data-label="描述" className="px-3 py-2.5 text-xs text-muted-foreground max-w-xs truncate">
                          {log.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {auditPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    共 {auditTotal} 条，第 {auditPage}/{auditPages} 页
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={auditPage <= 1}
                      onClick={() => loadAuditLogs(auditPage - 1)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={auditPage >= auditPages}
                      onClick={() => loadAuditLogs(auditPage + 1)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
</div>
        </div>

      {/* Toast */}
      
    </Layout>
  )
}
