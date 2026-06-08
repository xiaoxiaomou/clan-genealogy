import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { AuditLog } from '@/types'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Button, Input, useToast } from '@/components/ui'
import {
  ArrowLeft,
  Loader2,
  Download,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Settings,
  Trash2,
  Edit,
  Plus,
} from 'lucide-react'

const ACTION_COLORS: Record<string, string> = {
  create: 'text-green-600 bg-green-100',
  update: 'text-blue-600 bg-blue-100',
  delete: 'text-red-600 bg-red-100',
  config_update: 'text-purple-600 bg-purple-100',
  config_reset: 'text-orange-600 bg-orange-100',
  approve: 'text-green-600 bg-green-100',
  reject: 'text-red-600 bg-red-100',
  enable: 'text-green-600 bg-green-100',
  disable: 'text-yellow-600 bg-yellow-100',
  login: 'text-blue-600 bg-blue-100',
  logout: 'text-gray-600 bg-gray-100',
  import: 'text-indigo-600 bg-indigo-100',
  export: 'text-cyan-600 bg-cyan-100',
}

const ACTION_ICONS: Record<string, typeof Plus> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  config_update: Settings,
  config_reset: RefreshCw,
}

export function AdminAuditLogsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number> = { page, per_page: perPage }
      if (actionFilter) params.action = actionFilter

      const res = await api.get('/admin/audit-logs', { params })
      setLogs(res.data.logs || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.pages || 1)
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法获取审计日志',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const params: Record<string, string> = { format }
      if (actionFilter) params.action = actionFilter

      const res = await api.get('/admin/audit-logs/export', { params })

      const blob = new Blob([JSON.stringify(res.data.logs, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(url)

      toast({ title: '导出成功', description: `已导出 ${res.data.total} 条日志` })
    } catch (error) {
      toast({ title: '导出失败', variant: 'destructive' })
    }
  }

  const getActionColor = (action: string) => {
    for (const key of Object.keys(ACTION_COLORS)) {
      if (action.includes(key)) return ACTION_COLORS[key]
    }
    return 'text-gray-600 bg-gray-100'
  }

  const getActionIcon = (action: string) => {
    for (const key of Object.keys(ACTION_ICONS)) {
      if (action.includes(key)) return ACTION_ICONS[key]
    }
    return Clock
  }

  const formatTime = (time: string) => {
    const date = new Date(time)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredLogs = searchTerm
    ? logs.filter(log =>
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : logs

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              返回
            </Button>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-foreground">审计日志</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
            >
              <Download className="mr-1 h-4 w-4" aria-hidden="true" />
              导出 CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
            >
              <Download className="mr-1 h-4 w-4" aria-hidden="true" />
              导出 JSON
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">筛选:</span>
                <select
                  value={actionFilter}
                  onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                  className="rounded border px-2 py-1 text-sm"
                >
                  <option value="">全部操作</option>
                  <option value="create">创建</option>
                  <option value="update">更新</option>
                  <option value="delete">删除</option>
                  <option value="config_update">配置修改</option>
                  <option value="config_reset">配置重置</option>
                  <option value="approve">审批通过</option>
                  <option value="reject">审批拒绝</option>
                  <option value="enable">启用</option>
                  <option value="disable">禁用</option>
                </select>
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="搜索描述、操作类型..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
              <span className="text-sm text-muted-foreground">
                共 {total} 条记录
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchLogs}
              >
                <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />
                刷新
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Log List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                const ActionIcon = getActionIcon(log.action)
                const colorClass = getActionColor(log.action)
                return (
                  <Card key={log.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 rounded-full p-2 ${colorClass.split(' ')[1]}`}>
                          <ActionIcon className={`h-4 w-4 ${colorClass.split(' ')[0]}`} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${colorClass}`}>
                              {log.action}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {log.entity_type}
                              {log.entity_id && ` #${log.entity_id}`}
                            </span>
                          </div>
                          <p className="mt-1 text-sm">
                            {log.description || '(无描述)'}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            {log.user_id && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" aria-hidden="true" />
                                用户 #{log.user_id}
                              </span>
                            )}
                            {log.ip_address && (
                              <span>IP: {log.ip_address}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              {formatTime(log.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {filteredLogs.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  暂无日志记录
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  第 {page} 页，共 {totalPages} 页
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
