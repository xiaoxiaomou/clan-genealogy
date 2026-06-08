import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { SystemStatus } from '@/types'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { useToast } from '@/components/ui'
import {
  Users,
  BookOpen,
  UserCircle,
  Settings,
  Activity,
  Shield,
  Loader2,
  ArrowRight,
  UserPlus,
  Clock,
} from 'lucide-react'

const CATEGORY_INFO = {
  user: { label: '用户管理', icon: Users, color: '#3b82f6', bgColor: '#eff6ff' },
  family: { label: '族谱功能', icon: BookOpen, color: '#8b5cf6', bgColor: '#f5f3ff' },
  content: { label: '家族内容', icon: UserCircle, color: '#10b981', bgColor: '#ecfdf5' },
  notification: { label: '通知系统', icon: Activity, color: '#f59e0b', bgColor: '#fffbeb' },
  ui: { label: '界面定制', icon: Settings, color: '#ec4899', bgColor: '#fdf2f8' },
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SystemStatus | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/system/status')
      setStatus(res.data)
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法获取系统状态',
        variant: 'destructive',
      })
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
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-foreground">管理后台</h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                用户总数
              </CardTitle>
              <Users className="h-4 w-4 text-blue-500" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status?.users.total || 0}</div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="text-green-600">活跃 {status?.users.active || 0}</span>
                <span className="text-yellow-600">待审 {status?.users.pending || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                族谱总数
              </CardTitle>
              <BookOpen className="h-4 w-4 text-purple-500" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status?.families.total || 0}</div>
              <p className="text-xs text-muted-foreground">已创建的族谱数量</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                成员总数
              </CardTitle>
              <UserCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status?.members.total || 0}</div>
              <p className="text-xs text-muted-foreground">所有族谱的成员总数</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                配置总数
              </CardTitle>
              <Settings className="h-4 w-4 text-orange-500" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status?.configs.total || 0}</div>
              <p className="text-xs text-muted-foreground">系统配置项数量</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">快捷操作</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center justify-between rounded-lg border bg-white p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <Users className="h-5 w-5 text-blue-600" aria-hidden="true" />
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
              className="flex items-center justify-between rounded-lg border bg-white p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-100 p-2">
                  <Settings className="h-5 w-5 text-purple-600" aria-hidden="true" />
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
              className="flex items-center justify-between rounded-lg border bg-white p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-100 p-2">
                  <Activity className="h-5 w-5 text-orange-600" aria-hidden="true" />
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
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">配置分类</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {Object.entries(CATEGORY_INFO).map(([key, info]) => {
              const Icon = info.icon
              return (
                <button
                  key={key}
                  onClick={() => navigate(`/admin/config?category=${key}`)}
                  className="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-gray-50"
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

        {/* Recent Activity Placeholder */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">待处理事项</h2>
          <Card>
            <CardContent className="p-6">
              {status && status.users.pending > 0 ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-yellow-100 p-2">
                      <Clock className="h-5 w-5 text-yellow-600" aria-hidden="true" />
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
                  <div className="rounded-full bg-green-100 p-2">
                    <UserPlus className="h-5 w-5 text-green-600" aria-hidden="true" />
                  </div>
                  <p>暂无待处理事项</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
