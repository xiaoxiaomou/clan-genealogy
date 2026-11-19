import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { User } from '@/types'
import { formatRelativeTime } from '@/lib/date'
import {
  Button,
  Modal,
  Input,
  Label,
  useToast,
  AvatarDisplay,
} from '@/components/ui'
import { PgPageHead, PgSectionHead, PgSeal, PG_RED } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Ban,
  Unlock,
  Clock,
  KeyRound,
  Trash2,
  Search,
  UserPlus,
} from 'lucide-react'

/* ═══ 谱局 · 用户 —— 族人名册（注册审核 / 启禁 / 直建账号） ═══ */

type UserTab = 'all' | 'pending' | 'disabled' | 'rejected'
type RowStatus = 'active' | 'pending' | 'disabled' | 'rejected'
type ModalKind = 'reset' | 'disable' | 'enable' | 'delete' | 'reject' | 'create'

interface UserFamily {
  family_id: number
  family_name: string
  role: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: '所有者',
  admin: '管理员',
  editor: '编辑者',
  viewer: '查看者',
}

const ROLE_DOT_COLORS: Record<string, string> = {
  owner: PG_RED,
  admin: 'hsl(18 60% 45%)',
  editor: 'hsl(160 24% 38%)',
  viewer: 'hsl(211 40% 55%)',
}

/** 行状态：pending / rejected 看审核流，禁用看 is_active */
function rowStatus(u: User): RowStatus {
  if (u.status === 'pending') return 'pending'
  if (u.status === 'rejected') return 'rejected'
  if (!u.is_active) return 'disabled'
  return 'active'
}

const STATUS_BADGES: Record<RowStatus, { text: string; cls: string; icon: typeof Clock } | null> = {
  active: { text: '正常', cls: 'text-success bg-success/10', icon: CheckCircle },
  pending: { text: '待审核', cls: 'text-warning bg-warning/10', icon: Clock },
  disabled: { text: '已禁用', cls: 'text-muted-foreground bg-muted', icon: Ban },
  rejected: { text: '已拒绝', cls: 'text-destructive bg-destructive/10', icon: XCircle },
}

const EMPTY_COPY: Record<UserTab, { title: string; sub: string; jump: boolean }> = {
  all: { title: '未找到匹配的族人。', sub: '试试其他关键字，或切换标签查看', jump: false },
  pending: { title: '册上无待审之人。', sub: '新注册用户经谱局审核后方可登录', jump: true },
  disabled: { title: '无停用名帖。', sub: '被禁用的账号会集中出现在这里', jump: false },
  rejected: { title: '册上无谢绝之记。', sub: '被拒绝的注册申请会记录在此', jump: false },
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  const [activeTab, setActiveTab] = useState<UserTab>('all')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalKind | null>(null)
  const [target, setTarget] = useState<User | null>(null)
  const [resetPw, setResetPw] = useState('')
  const [createForm, setCreateForm] = useState({ username: '', display_name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        setCurrentUserId(JSON.parse(stored).id)
      } catch {
        /* ignore */
      }
    }
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const res = await api.getAllUsers()
      setUsers(res.users)
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const counts = useMemo(() => {
    const c = { all: users.length, pending: 0, disabled: 0, rejected: 0, active: 0 }
    users.forEach((u) => {
      c[rowStatus(u)] += 1
    })
    return c
  }, [users])

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (activeTab !== 'all' && rowStatus(u) !== activeTab) return false
      if (!q) return true
      const fams = (u.families || []).map((f) => f.family_name).join(' ')
      const haystack = [u.display_name || '', u.username, u.email, fams].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [users, activeTab, query])

  /* ── 操作：通过免确认，其余统一弹窗 ── */
  const handleApprove = async (user: User) => {
    setProcessingId(user.id)
    try {
      await api.approveUser(user.id)
      showToast('用户审核通过', 'success')
      loadUsers()
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const runAction = async (kind: ModalKind, user: User) => {
    setProcessingId(user.id)
    try {
      if (kind === 'reject') {
        await api.rejectUser(user.id)
        showToast('用户已拒绝', 'success')
      } else if (kind === 'disable') {
        await api.disableUser(user.id)
        showToast('用户已禁用', 'success')
      } else if (kind === 'enable') {
        await api.enableUser(user.id)
        showToast('用户已启用', 'success')
      } else if (kind === 'delete') {
        await api.adminDeleteUser(user.id)
        showToast('用户已删除', 'success')
      } else if (kind === 'reset') {
        await api.adminResetPassword(user.id, resetPw)
        showToast(`已将 ${user.display_name || user.username} 的密码重置`, 'success')
      }
      setModal(null)
      setResetPw('')
      loadUsers()
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCreate = async () => {
    if (!createForm.username.trim() || createForm.password.length < 6) {
      showToast('请填写用户名，密码至少 6 位', 'error')
      return
    }
    setCreating(true)
    try {
      await api.adminCreateUser({
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        display_name: createForm.display_name.trim() || undefined,
      })
      showToast('账号已创建（免审核直接入册）', 'success')
      setModal(null)
      setCreateForm({ username: '', display_name: '', email: '', password: '' })
      loadUsers()
    } catch (err: any) {
      showToast(err.message || '创建失败', 'error')
    } finally {
      setCreating(false)
    }
  }

  const openModal = (kind: ModalKind, user: User | null) => {
    setTarget(user)
    setResetPw('')
    setModal(kind)
  }

  const tabs: { key: UserTab; label: string; count: number }[] = [
    { key: 'all', label: '全部用户', count: counts.all },
    { key: 'pending', label: '待审核', count: counts.pending },
    { key: 'disabled', label: '已禁用', count: counts.disabled },
    { key: 'rejected', label: '已拒绝', count: counts.rejected },
  ]

  const renderFamilies = (fams: UserFamily[] | undefined) => {
    if (!fams || fams.length === 0) return null
    return (
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {fams.map((f) => (
          <span
            key={`${f.family_id}-${f.role}`}
            className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-0.5 text-[11.5px] text-muted-foreground"
            style={{ borderColor: 'hsl(var(--border))' }}
          >
            <i
              className="h-[5px] w-[5px] rounded-full"
              style={{ background: ROLE_DOT_COLORS[f.role] || 'hsl(var(--muted-foreground))' }}
            />
            <b className="font-medium text-foreground/80">{f.family_name}</b>
            <span>· {ROLE_LABELS[f.role] || f.role}</span>
          </span>
        ))}
      </div>
    )
  }

  const renderRow = (u: User) => {
    const st = rowStatus(u)
    const badge = STATUS_BADGES[st]
    const BadgeIcon = badge?.icon
    const isSelf = u.id === currentUserId
    const name = u.display_name || u.username
    return (
      <div
        key={u.id}
        className={`flex flex-wrap items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-opacity ${
          st === 'disabled' || st === 'rejected' ? 'opacity-60 hover:opacity-100' : ''
        }`}
        style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
      >
        <AvatarDisplay avatar={u.avatar} name={name} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-semibold">{name}</span>
            {u.is_admin && (
              <span
                className="inline-flex h-[18px] min-w-[18px] rotate-3 items-center justify-center rounded px-1 font-serif text-[11px] font-semibold text-white"
                style={{ backgroundColor: PG_RED }}
                title="系统管理员"
              >
                管
              </span>
            )}
            {badge && BadgeIcon && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>
                <BadgeIcon className="h-3 w-3" />
                {badge.text}
              </span>
            )}
            {isSelf && <span className="text-xs text-muted-foreground">(你)</span>}
          </div>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            @{u.username} · {u.email}
            <span className="opacity-75"> · 注册于 {formatRelativeTime(u.created_at)}</span>
          </p>
          {renderFamilies(u.families)}
        </div>

        <div className="flex items-center gap-2">
          {st === 'pending' && !isSelf && (
            <>
              <Button
                size="sm"
                className="gap-1 border-none text-white"
                style={{ backgroundColor: 'hsl(var(--success))' }}
                onClick={() => handleApprove(u)}
                disabled={processingId === u.id}
                aria-label={`通过 ${name} 的注册申请`}
              >
                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                通过
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => openModal('reject', u)}
                disabled={processingId === u.id}
                aria-label={`拒绝 ${name} 的注册申请`}
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                拒绝
              </Button>
            </>
          )}

          {st === 'active' && !isSelf && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => openModal('reset', u)}
                disabled={processingId === u.id}
                aria-label={`重置 ${name} 的密码`}
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                重置密码
              </Button>
              <span className="mx-0.5 h-[18px] w-px bg-border" aria-hidden="true" />
              {u.is_active ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => openModal('disable', u)}
                  disabled={processingId === u.id}
                  aria-label={`禁用 ${name}`}
                >
                  <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                  禁用
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => openModal('enable', u)}
                  disabled={processingId === u.id}
                  aria-label={`启用 ${name}`}
                >
                  <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                  启用
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => openModal('delete', u)}
                disabled={processingId === u.id}
                aria-label={`删除 ${name}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                删除
              </Button>
            </>
          )}

          {st === 'disabled' && !isSelf && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => openModal('enable', u)}
                disabled={processingId === u.id}
                aria-label={`启用 ${name}`}
              >
                <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                启用
              </Button>
              <span className="mx-0.5 h-[18px] w-px bg-border" aria-hidden="true" />
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => openModal('delete', u)}
                disabled={processingId === u.id}
                aria-label={`删除 ${name}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                删除
              </Button>
            </>
          )}

          {st === 'rejected' && !isSelf && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => openModal('delete', u)}
              disabled={processingId === u.id}
              aria-label={`删除 ${name}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              删除
            </Button>
          )}

          {isSelf && <span className="text-xs text-muted-foreground">本人账号在此管理</span>}
        </div>
      </div>
    )
  }

  const emptyCopy = EMPTY_COPY[activeTab]
  const isSearching = query.trim().length > 0

  return (
    <Layout>
      <div className="pg-rise mx-auto max-w-4xl px-4 py-8">
        {/* 顶部导航 */}
        <div className="mb-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            aria-label="返回管理"
          >
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            返回管理
          </Button>
        </div>

        <PgPageHead
          eyebrow="谱 局 · 用 户"
          title="用户管理"
          subtitle="族人名册 · 注册审核与账号启禁，此为谱局事务"
          actions={<PgSeal char="籍" size={52} />}
        />

        {/* 名册总览 */}
        <section
          className="mt-6 flex items-stretch overflow-hidden rounded-xl border"
          style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
          aria-label="用户统计"
        >
          <div className="hidden items-center border-r px-3 sm:flex" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted) / 0.45)' }}>
            <span className="pg-spine text-[13px]" aria-hidden="true">名册总览</span>
          </div>
          {[
            { n: counts.active, label: '在册族人', sub: '审核通过且启用', alert: false },
            { n: counts.pending, label: '待审核', sub: '登录前须过谱局核验', alert: true },
            { n: counts.disabled, label: '已禁用', sub: '禁用后无法登录', alert: false },
            { n: counts.rejected, label: '已拒绝', sub: '谢绝的注册申请', alert: false },
          ].map((s, i) => (
            <div key={s.label} className={`relative flex-1 px-2.5 py-3.5 text-center ${i > 0 ? 'before:absolute before:left-0 before:top-[22%] before:bottom-[22%] before:w-px' : ''}`}>
              <b
                className={`pg-title block text-[26px] font-semibold leading-tight ${s.alert ? 'text-destructive' : 'text-foreground'}`}
                style={s.alert ? { color: PG_RED } : undefined}
              >
                {s.n}
              </b>
              <span className="text-[11.5px] tracking-[0.14em] text-muted-foreground">{s.label}</span>
              <small className="block text-[10.5px] text-muted-foreground/75">{s.sub}</small>
            </div>
          ))}
        </section>

        {/* 标签 + 搜索 + 新建 */}
        <div className="mb-3.5 mt-5 flex flex-wrap items-center gap-3">
          <div
            className="inline-flex gap-0.5 rounded-[10px] border p-0.5"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--muted) / 0.5)' }}
            role="tablist"
            aria-label="用户状态筛选"
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] transition-all ${
                  activeTab === tab.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={activeTab === tab.key ? { backgroundColor: 'hsl(var(--card))' } : undefined}
              >
                {tab.label}
                <span
                  className="rounded-full px-1.5 text-[11px]"
                  style={
                    activeTab === tab.key
                      ? { backgroundColor: 'rgba(166, 58, 46, 0.1)', color: PG_RED }
                      : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
                  }
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <label
            className="ml-auto flex min-w-[200px] max-w-[300px] flex-1 items-center gap-2 rounded-[10px] border px-3 py-1.5"
            style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
          >
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜名字 / 用户名 / 邮箱"
              aria-label="搜索用户"
              className="w-full border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </label>

          <Button
            size="sm"
            className="gap-1 border-none text-white"
            style={{ backgroundColor: PG_RED }}
            onClick={() => openModal('create', null)}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            新建用户
          </Button>
        </div>

        {/* 名册 */}
        <section aria-label="用户列表">
          <PgSectionHead
            text="名 册"
            right={
              <span className="text-xs text-muted-foreground">
                {isSearching ? `匹配 ${visibleUsers.length} 位` : `共 ${visibleUsers.length} 位`}
              </span>
            }
          />
          <div className="space-y-2.5">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : visibleUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed px-5 py-11 text-center" style={{ borderColor: 'hsl(var(--border))' }}>
                <p className="pg-title text-[15px] tracking-[0.12em] text-foreground/75">
                  {isSearching ? EMPTY_COPY.all.title : emptyCopy.title}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {isSearching ? EMPTY_COPY.all.sub : emptyCopy.sub}
                </p>
                {emptyCopy.jump && !isSearching && (
                  <Button variant="outline" size="sm" className="mt-3.5" onClick={() => setActiveTab('all')}>
                    查看全部 {counts.all} 位族人
                  </Button>
                )}
              </div>
            ) : (
              visibleUsers.map(renderRow)
            )}
          </div>
        </section>

        <div className="pg-colophon mt-7">
          <b>名册规则</b>
          <span className="pg-colophon-sep" />
          新注册用户须谱局审核后方可登录
          <span className="pg-colophon-sep" />
          禁用后无法登录，可随时启用
          <span className="pg-colophon-sep" />
          直建账号免审核直接入册
        </div>
      </div>

      {/* 统一确认弹窗 */}
      <Modal
        isOpen={modal !== null && modal !== 'create'}
        onClose={() => setModal(null)}
        title={
          modal === 'reset' && target
            ? `重置密码 — ${target.display_name || target.username}`
            : modal === 'disable' && target
            ? `禁用 — ${target.display_name || target.username}`
            : modal === 'enable' && target
            ? `启用 — ${target.display_name || target.username}`
            : modal === 'reject' && target
            ? '拒绝注册申请'
            : '删除用户'
        }
      >
        {modal === 'reset' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="au-newpw">新密码</Label>
              <Input
                id="au-newpw"
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                placeholder="至少 6 位"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                请当面或另行告知本人，提醒其登录后自行修改。
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setModal(null)}>取消</Button>
              <Button
                onClick={() => target && runAction('reset', target)}
                disabled={resetPw.length < 6 || processingId === target?.id}
              >
                确认重置
              </Button>
            </div>
          </div>
        )}

        {(modal === 'disable' || modal === 'enable' || modal === 'reject' || modal === 'delete') && target && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {modal === 'disable' && (
                <>
                  确定禁用 <b className="text-foreground">{target.display_name || target.username}</b> 吗？
                  禁用后该用户将<b className="text-foreground">无法登录</b>，其在各族中的权限一并暂停；可随时重新启用。
                </>
              )}
              {modal === 'enable' && (
                <>
                  启用后 <b className="text-foreground">{target.display_name || target.username}</b> 即可重新登录，原有家族权限恢复。
                </>
              )}
              {modal === 'reject' && (
                <>
                  确定拒绝 <b className="text-foreground">{target.display_name || target.username}</b> 的注册申请吗？
                  申请将记入「已拒绝」，其账号保持不可登录。
                </>
              )}
              {modal === 'delete' && (
                <>
                  确定删除 <b className="text-foreground">{target.display_name || target.username}</b> 吗？
                  其聊天、帖子、通知与家族关联将<b className="text-destructive">一并清除，此操作不可恢复</b>。
                </>
              )}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setModal(null)}>取消</Button>
              <Button
                onClick={() => runAction(modal as Exclude<ModalKind, 'reset' | 'create'>, target)}
                disabled={processingId === target.id}
                className="border-none text-white"
                style={{ backgroundColor: modal === 'enable' ? 'hsl(var(--success))' : PG_RED }}
              >
                {modal === 'disable' && '确认禁用'}
                {modal === 'enable' && '确认启用'}
                {modal === 'reject' && '确认拒绝'}
                {modal === 'delete' && '确认删除'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 新建用户弹窗 */}
      <Modal
        isOpen={modal === 'create'}
        onClose={() => setModal(null)}
        title="新建用户"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="au-c-user">用户名 *</Label>
            <Input
              id="au-c-user"
              value={createForm.username}
              onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              placeholder="登录用，如 chuanxi"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="au-c-name">显示名</Label>
            <Input
              id="au-c-name"
              value={createForm.display_name}
              onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
              placeholder="如 牟传玺"
            />
          </div>
          <div>
            <Label htmlFor="au-c-mail">邮箱 *</Label>
            <Input
              id="au-c-mail"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <Label htmlFor="au-c-pw">初始密码 *</Label>
            <Input
              id="au-c-pw"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="至少 6 位"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              管理员新建的账号直接为「已审核」状态，无需再走注册审核；请将初始密码告知本人。
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setModal(null)}>取消</Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !createForm.username.trim() || createForm.password.length < 6}
              className="border-none text-white"
              style={{ backgroundColor: PG_RED }}
            >
              新建账号
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
