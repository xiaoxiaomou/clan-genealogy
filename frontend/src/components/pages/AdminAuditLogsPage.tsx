import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { AuditLog } from '@/types'
import { Layout } from '@/components/layout/Layout'


import { Button, Input, useToast } from '@/components/ui'
import { PgPageHead } from '@/components/ui/pedigree'
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

/* 操作印记：色彩走主题令牌，谱局页面从素 */
const ACTION_COLORS: Record<string, string> = {
  create: 'text-success bg-success/10',
  update: 'text-primary bg-primary/10',
  delete: 'text-destructive bg-destructive/10',
  config_update: 'text-foreground bg-muted',
  config_reset: 'text-foreground bg-muted',
  approve: 'text-success bg-success/10',
  reject: 'text-destructive bg-destructive/10',
  enable: 'text-success bg-success/10',
  disable: 'text-foreground bg-muted',
  login: 'text-primary bg-primary/10',
  logout: 'text-muted-foreground bg-muted',
  import: 'text-foreground bg-muted',
  export: 'text-foreground bg-muted',
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
  const { showToast } = useToast()
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

      const res = await api.adminAuditLogs(params)
      setLogs(res.logs || [])
      setTotal(res.total || 0)
      setTotalPages(res.pages || 1)
    } catch (error) {
      showToast('加载失败：无法获取审计日志', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const params: Record<string, string> = { format }
      if (actionFilter) params.action = actionFilter

      const res = await api.adminAuditLogsExport(format)

      const blob = new Blob([JSON.stringify(res.logs, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(url)

      showToast(`导出成功：${res.total} 条日志`, 'success')
    } catch (error) {
      showToast('导出失败', 'error')
    }
  }

  const getActionColor = (action: string) => {
    for (const key of Object.keys(ACTION_COLORS)) {
      if (action.includes(key)) return ACTION_COLORS[key]
    }
    return 'text-muted-foreground bg-muted'
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
      <div className="pg-rise mx-auto max-w-6xl px-6 py-8">
        {/* 顶部导航 */}
        <div className="mb-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            返回
          </Button>
        </div>

        {/* Header */}
        <PgPageHead
          eyebrow="谱 局 · 审 计"
          title="审计日志"
          subtitle="操作记录与变更历史，留痕备查"
          actions={
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
          }
        />

        {/* Filters */}
        <div className="pg-card mb-6 p-4">
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
        </div>

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
                  <div key={log.id} className="pg-card p-4">
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 rounded-lg p-2 ${colorClass.split(' ')[1]}`}>
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
                  </div>
                )
              })}

              {filteredLogs.length === 0 && (
                <div className="pg-card py-12 text-center">
                  <p className="pg-title text-sm text-muted-foreground" style={{ letterSpacing: '0.1em' }}>
                    暂无日志记录。
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">放宽筛选条件，或稍后再来查阅</p>
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

export default AdminAuditLogsPage
