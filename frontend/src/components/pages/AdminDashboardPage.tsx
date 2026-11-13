import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { SystemStatus } from '@/types'
import { Layout } from '@/components/layout/Layout'
import { useToast } from '@/components/ui'
import { PgPageHead, PgSectionHead } from '@/components/ui/pedigree'
import {
  Users,
  BookOpen,
  UserCircle,
  Settings,
  Activity,
  Loader2,
  ArrowRight,
  Clock,
  UserPlus,
} from 'lucide-react'

/* 分类图记：色彩一律走主题令牌，谱局页面从素 */
const CATEGORY_INFO = {
  user: { label: '用户管理', icon: Users, color: 'hsl(var(--muted-foreground))', bgColor: 'hsl(var(--muted))' },
  family: { label: '族谱功能', icon: BookOpen, color: 'hsl(var(--muted-foreground))', bgColor: 'hsl(var(--muted))' },
  content: { label: '家族内容', icon: UserCircle, color: 'hsl(var(--muted-foreground))', bgColor: 'hsl(var(--muted))' },
  notification: { label: '通知系统', icon: Activity, color: 'hsl(var(--muted-foreground))', bgColor: 'hsl(var(--muted))' },
  ui: { label: '界面定制', icon: Settings, color: 'hsl(var(--muted-foreground))', bgColor: 'hsl(var(--muted))' },
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SystemStatus | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const res = await api.adminSystemStatus()
      setStatus(res)
    } catch (error) {
      showToast('加载失败：无法获取系统状态', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="pg-rise mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <PgPageHead
          eyebrow="谱 局 · 总 览"
          title="管理后台"
          subtitle="平台用户、族谱与配置的总体情况"
        />

        {/* Stats Cards — 四柱 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatusCard icon={Users} label="用户总数" value={status?.users.total || 0}>
            <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
              <span className="text-success">活跃 {status?.users.active || 0}</span>
              <span className="text-primary">待审 {status?.users.pending || 0}</span>
            </div>
          </StatusCard>

          <StatusCard icon={BookOpen} label="族谱总数" value={status?.families.total || 0}>
            <p className="mt-1 text-xs text-muted-foreground">已创建的族谱数量</p>
          </StatusCard>

          <StatusCard icon={UserCircle} label="成员总数" value={status?.members.total || 0}>
            <p className="mt-1 text-xs text-muted-foreground">所有族谱的成员总数</p>
          </StatusCard>

          <StatusCard icon={Settings} label="配置总数" value={status?.configs.total || 0}>
            <p className="mt-1 text-xs text-muted-foreground">系统配置项数量</p>
          </StatusCard>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <PgSectionHead text="快 捷 操 作" />
          <div className="grid gap-4 md:grid-cols-3">
            <button
              onClick={() => navigate('/admin/users')}
              className="pg-card flex items-center justify-between p-4 transition-colors hover:border-muted-foreground/40"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <p className="font-medium">用户管理</p>
                  <p className="text-sm text-muted-foreground">审核、启用/禁用用户</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </button>

            <button
              onClick={() => navigate('/admin/config')}
              className="pg-card flex items-center justify-between p-4 transition-colors hover:border-muted-foreground/40"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Settings className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <p className="font-medium">系统配置</p>
                  <p className="text-sm text-muted-foreground">配置平台各项功能参数</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </button>

            <button
              onClick={() => navigate('/admin/audit-logs')}
              className="pg-card flex items-center justify-between p-4 transition-colors hover:border-muted-foreground/40"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <p className="font-medium">审计日志</p>
                  <p className="text-sm text-muted-foreground">查看操作记录和变更历史</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Config Categories */}
        <div className="mt-8">
          <PgSectionHead text="配 置 分 类" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {Object.entries(CATEGORY_INFO).map(([key, info]) => {
              const Icon = info.icon
              return (
                <button
                  key={key}
                  onClick={() => navigate(`/admin/config?category=${key}`)}
                  className="pg-card flex flex-col items-center p-4 transition-colors hover:border-muted-foreground/40"
                >
                  <div
                    className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ backgroundColor: info.bgColor }}
                  >
                    <Icon className="h-6 w-6" style={{ color: info.color }} aria-hidden="true" />
                  </div>
                  <p className="font-medium">{info.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {status?.configs.categories.includes(key) ? '已配置' : '未配置'}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <PgSectionHead text="待 处 理 事 项" />
          <div className="pg-card p-6">
            {status && status.users.pending > 0 ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium">有 {status.users.pending} 个用户待审核</p>
                    <p className="text-sm text-muted-foreground">
                      新注册用户需要管理员审核后才能登录
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/admin/users?tab=pending')}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  去处理
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="rounded-lg bg-muted p-2">
                  <UserPlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <p>暂无待处理事项</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function StatusCard({ icon: Icon, label, value, children }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  children?: React.ReactNode
}) {
  return (
    <div className="pg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="pg-title mt-2 text-2xl font-semibold">{value}</div>
      {children}
    </div>
  )
}

export default AdminDashboardPage
