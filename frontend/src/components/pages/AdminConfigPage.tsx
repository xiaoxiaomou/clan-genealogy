import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import type { SystemConfig } from '@/types'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Button, Input, useToast } from '@/components/ui'
import {
  ArrowLeft,
  Loader2,
  Save,
  RotateCcw,
  Users,
  BookOpen,
  UserCircle,
  Bell,
  Palette,
  Settings,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const CATEGORY_CONFIG = {
  user: { label: '用户管理', icon: Users, color: '#3b82f6' },
  family: { label: '族谱功能', icon: BookOpen, color: '#8b5cf6' },
  content: { label: '家族内容', icon: UserCircle, color: '#10b981' },
  notification: { label: '通知系统', icon: Bell, color: '#f59e0b' },
  ui: { label: '界面定制', icon: Palette, color: '#ec4899' },
}

const ALL_CATEGORIES = ['user', 'family', 'content', 'notification', 'ui'] as const

export function AdminConfigPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [activeCategory, setActiveCategory] = useState<string>(
    searchParams.get('category') || 'user'
  )
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedDesc, setExpandedDesc] = useState<string | null>(null)

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/config')
      setConfigs(res.data.configs || [])
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法获取配置数据',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
    setSearchParams({ category })
  }

  const handleEdit = (config: SystemConfig) => {
    setEditingKey(config.key)
    setEditValue(config.value)
  }

  const handleSave = async (key: string) => {
    setSaving(true)
    try {
      await api.put(`/admin/config/${key}`, { value: editValue })
      toast({ title: '保存成功', description: `配置项 ${key} 已更新` })
      setEditingKey(null)
      fetchConfigs()
    } catch (error: any) {
      toast({
        title: '保存失败',
        description: error.response?.data?.error || '保存配置时出错',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingKey(null)
    setEditValue('')
  }

  const handleResetCategory = async () => {
    if (!confirm(`确定要重置 ${CATEGORY_CONFIG[activeCategory as keyof typeof CATEGORY_CONFIG]?.label} 下的所有配置吗？`)) {
      return
    }
    try {
      await api.post('/admin/config/reset', { category: activeCategory })
      toast({ title: '重置成功', description: '配置已恢复到默认值' })
      fetchConfigs()
    } catch (error) {
      toast({ title: '重置失败', variant: 'destructive' })
    }
  }

  const filteredConfigs = configs.filter(c => c.category === activeCategory)

  const renderConfigInput = (config: SystemConfig) => {
    if (editingKey !== config.key) {
      return (
        <span className="text-sm text-muted-foreground">
          {config.value_type === 'boolean' ? (
            config.value === 'true' ? '是' : '否'
          ) : (
            config.value || '-'
          )}
        </span>
      )
    }

    if (config.value_type === 'boolean') {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="true">是 (true)</option>
          <option value="false">否 (false)</option>
        </select>
      )
    }

    if (config.value_type === 'number') {
      return (
        <Input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          min={config.min_value ?? undefined}
          max={config.max_value ?? undefined}
          className="w-32"
        />
      )
    }

    if (config.options) {
      const options = JSON.parse(config.options)
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }

    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="w-64"
      />
    )
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
              <Settings className="h-5 w-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-foreground">系统配置</h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetCategory}
          >
            <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
            重置当前分类
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 flex gap-2 border-b overflow-x-auto">
          {ALL_CATEGORIES.map((cat) => {
            const info = CATEGORY_CONFIG[cat]
            const Icon = info.icon
            const count = configs.filter(c => c.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
                  activeCategory === cat
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" style={{ color: info.color }} aria-hidden="true" />
                <span className="whitespace-nowrap">{info.label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Config List */}
        <div className="space-y-3">
          {filteredConfigs.map((config) => (
            <Card key={config.key}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{config.label}</h3>
                      {config.is_public && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                          公开
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground font-mono">
                      {config.key}
                    </p>
                    {(config.description || config.min_value !== null) && (
                      <div className="mt-2">
                        <button
                          onClick={() => setExpandedDesc(
                            expandedDesc === config.key ? null : config.key
                          )}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {expandedDesc === config.key ? (
                            <ChevronUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-3 w-3" aria-hidden="true" />
                          )}
                          {config.description?.slice(0, 50)}
                          {config.description && config.description.length > 50 && '...'}
                        </button>
                        {expandedDesc === config.key && (
                          <div className="mt-2 rounded bg-muted p-2 text-xs">
                            <p>{config.description}</p>
                            {(config.min_value !== null || config.max_value !== null) && (
                              <p className="mt-1 text-muted-foreground">
                                有效范围: {config.min_value ?? '-'} ~ {config.max_value ?? '-'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingKey === config.key ? (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleSave(config.key)}
                          disabled={saving}
                        >
                          <Save className="mr-1 h-3 w-3" aria-hidden="true" />
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                        >
                          取消
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(config)}
                      >
                        编辑
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {renderConfigInput(config)}
                  {config.value_type === 'boolean' && editingKey !== config.key && (
                    config.value === 'true' ? (
                      <ToggleRight className="h-5 w-5 text-green-600" aria-hidden="true" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredConfigs.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              该分类暂无配置项
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
