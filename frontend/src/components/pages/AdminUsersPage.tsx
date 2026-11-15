import { useState, useEffect } from 'react'
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
import { PgPageHead } from '@/components/ui/pedigree'
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
} from 'lucide-react'

type UserTab = 'pending' | 'all' | 'rejected'

const STATUS_LABELS: Record<string, { text: string; color: string; icon: typeof Clock }> = {
  pending: { text: '待审核', color: 'text-foreground bg-muted', icon: Clock },
  active: { text: '正常', color: 'text-success bg-success/10', icon: CheckCircle },
  rejected: { text: '已拒绝', color: 'text-destructive bg-destructive/10', icon: XCircle },
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [resetPw, setResetPw] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<UserTab>('pending')
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        setCurrentUserId(user.id)
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
      setAllUsers(res.users)
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = allUsers.filter((u) => {
    if (activeTab === 'pending') return u.status === 'pending'
    if (activeTab === 'rejected') return u.status === 'rejected'
    return true
  })

  const pendingCount = allUsers.filter((u) => u.status === 'pending').length
  const rejectedCount = allUsers.filter((u) => u.status === 'rejected').length

  const handleApprove = async (userId: number) => {
    setProcessingId(userId)
    try {
      await api.approveUser(userId)
      showToast('用户审核通过', 'success')
      loadUsers()
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (userId: number) => {
    if (!confirm('确定要拒绝该用户的注册申请吗？')) return
    setProcessingId(userId)
    try {
      await api.rejectUser(userId)
      showToast('用户已拒绝', 'success')
      loadUsers()
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDisable = async (userId: number) => {
    if (!confirm('确定要禁用该用户吗？禁用后该用户将无法登录。')) return
    setProcessingId(userId)
    try {
      await api.disableUser(userId)
      showToast('用户已禁用', 'success')
      loadUsers()
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleEnable = async (userId: number) => {
    setProcessingId(userId)
    try {
      await api.enableUser(userId)
      showToast('用户已启用', 'success')
      loadUsers()
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleResetPassword = async () => {
    if (!resetTarget) return
    if (resetPw.length < 6) {
      showToast('新密码至少 6 位', 'error')
      return
    }
    setProcessingId(resetTarget.id)
    try {
      await api.adminResetPassword(resetTarget.id, resetPw)
      showToast(`已将 ${resetTarget.display_name || resetTarget.username} 的密码重置`, 'success')
      setResetTarget(null)
      setResetPw('')
    } catch (err: any) {
      showToast(err.message || '重置失败', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return
    setProcessingId(deleteTarget.id)
    try {
      await api.adminDeleteUser(deleteTarget.id)
      showToast('用户已删除', 'success')
      setDeleteTarget(null)
      loadUsers()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const tabs: { key: UserTab; label: string; count: number }[] = [
    { key: 'pending', label: '待审核', count: pendingCount },
    { key: 'all', label: '全部用户', count: allUsers.length },
    { key: 'rejected', label: '已拒绝', count: rejectedCount },
  ]

  return (
    <Layout>
      <div className="pg-rise mx-auto max-w-3xl px-4 py-8">
        {/* 顶部导航 */}
        <div className="mb-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            aria-label="返回首页"
          >
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            返回首页
          </Button>
        </div>

        <PgPageHead
          eyebrow="谱 局 · 用 户"
          title="用户管理"
          subtitle="注册审核与账号启禁，此为谱局事务"
        />

        {/* 标签页 */}
        <div className="mb-6 flex gap-1 rounded-lg border bg-muted/50 p-1" role="tablist" aria-label="用户状态筛选" style={{ borderColor: 'hsl(var(--border))' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
              id={`tab-${tab.key}`}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className="rounded-full bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* 用户列表 */}
        <section>
          <div className="pg-card p-6">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
              <p className="pg-title text-sm" style={{ letterSpacing: '0.1em' }}>
                {activeTab === 'pending'
                  ? '册上无待审之人。'
                  : activeTab === 'rejected'
                  ? '册上无已拒之记。'
                  : '名册尚空。'}
              </p>
              <p className="mt-1.5 text-xs">
                {activeTab === 'pending'
                  ? '新注册用户经谱局审核后方可登录'
                  : activeTab === 'rejected'
                  ? '被拒绝的注册申请会记录在此'
                  : '用户注册后将出现在这里'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const statusInfo = STATUS_LABELS[user.status] || STATUS_LABELS.pending
                const StatusIcon = statusInfo.icon
                const isSelf = user.id === currentUserId
                return (
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
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {user.display_name || user.username}
                          </p>
                          <span
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.text}
                          </span>
                          {!user.is_active && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              已禁用
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-xs text-muted-foreground">(你)</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          @{user.username} · {user.email}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          注册于 {formatRelativeTime(user.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 待审核操作 */}
                      {user.status === 'pending' && !isSelf && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => handleApprove(user.id)}
                            disabled={processingId === user.id}
                            aria-label={`通过 ${user.display_name || user.username} 的注册申请`}
                          >
                            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            通过
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleReject(user.id)}
                            disabled={processingId === user.id}
                            aria-label={`拒绝 ${user.display_name || user.username} 的注册申请`}
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            拒绝
                          </Button>
                        </>
                      )}

                      {/* 禁用/启用 */}
                      {user.status === 'active' && !isSelf && (
                        <>
                          {user.is_active ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDisable(user.id)}
                              disabled={processingId === user.id}
                              aria-label={`禁用 ${user.display_name || user.username}`}
                            >
                              <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                              禁用
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => handleEnable(user.id)}
                              disabled={processingId === user.id}
                              aria-label={`启用 ${user.display_name || user.username}`}
                            >
                              <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                              启用
                            </Button>
                          )}

                          {/* 重置密码 / 删除用户 */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => { setResetTarget(user); setResetPw('') }}
                            disabled={processingId === user.id}
                            aria-label={`重置 ${user.display_name || user.username} 的密码`}
                          >
                            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                            重置密码
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(user)}
                            disabled={processingId === user.id}
                            aria-label={`删除 ${user.display_name || user.username}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            删除
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </div>
        </section>
      </div>

      {/* 重置密码弹窗 */}
      {resetTarget && (
        <Modal
          isOpen={!!resetTarget}
          onClose={() => setResetTarget(null)}
          title={`重置密码 — ${resetTarget.display_name || resetTarget.username}`}
        >
          <div className="space-y-4">
            <div>
              <Label>新密码</Label>
              <Input
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                placeholder="至少 6 位，请告知用户后提醒其登录修改"
                autoFocus
              />
              {resetPw.length > 0 && resetPw.length < 6 && (
                <p className="mt-1.5 text-xs text-destructive">至少 6 位</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setResetTarget(null)}>取消</Button>
              <Button onClick={handleResetPassword} disabled={resetPw.length < 6 || processingId === resetTarget.id}>
                确认重置
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 删除用户确认弹窗 */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="删除用户"
        >
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              确定删除 <b className="text-foreground">{deleteTarget.display_name || deleteTarget.username}</b> 吗？
              其聊天、帖子、通知与家族关联将一并清除，此操作不可恢复。
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
              <Button
                onClick={handleDeleteUser}
                disabled={processingId === deleteTarget.id}
                className="text-white"
                style={{ backgroundColor: '#A63A2E', borderColor: '#A63A2E' }}
              >
                确认删除
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast */}

    </Layout>
  )
}
