import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import type { SystemConfig } from '@/types'
import { Layout } from '@/components/layout/Layout'
import { Button, Input, useToast, ToggleSwitch } from '@/components/ui'
import { PgPageHead } from '@/components/ui/pedigree'
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

/* 分类图记：色彩走主题令牌，谱局页面从素 */
const CATEGORY_CONFIG = {
  user: { label: '用户管理', icon: Users, color: 'hsl(var(--muted-foreground))' },
  family: { label: '族谱功能', icon: BookOpen, color: 'hsl(var(--muted-foreground))' },
  content: { label: '家族内容', icon: UserCircle, color: 'hsl(var(--muted-foreground))' },
  notification: { label: '通知系统', icon: Bell, color: 'hsl(var(--muted-foreground))' },
  ui: { label: '界面定制', icon: Palette, color: 'hsl(var(--muted-foreground))' },
}

const ALL_CATEGORIES = ['user', 'family', 'content', 'notification', 'ui'] as const

export function AdminConfigPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [activeCategory, setActiveCategory] = useState<string>(
    searchParams.get('category') || 'user'
  )
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedDesc, setExpandedDesc] = useState<string | null>(null)
  // 正在切换中的布尔开关 key 集合：用于防重复点击 + 禁用态
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const res = await api.getConfigs()
      setConfigs(res.configs || [])
    } catch (error) {
      showToast('加载失败：无法获取配置数据', 'error')
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
      await api.updateConfig(key, editValue)
      showToast(`配置项 ${key} 已更新`, 'success')
      setEditingKey(null)
      fetchConfigs()
    } catch (error: any) {
      showToast(`保存失败：${error.message || '保存配置时出错'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingKey(null)
    setEditValue('')
  }

  // 布尔开关：点击就地切换，状态可被后端与各业务逻辑读取
  const handleToggleBool = async (config: SystemConfig) => {
    if (togglingKeys.has(config.key)) return // 防重复点击
    const next = config.value === 'true' ? 'false' : 'true'
    setTogglingKeys((prev) => new Set(prev).add(config.key))
    // 乐观更新：界面显示/文案/样式立即同步
    setConfigs((prev) => prev.map((c) => (c.key === config.key ? { ...c, value: next } : c)))
    try {
      await api.updateConfig(config.key, next)
      showToast(`${config.label} 已${next === 'true' ? '开启' : '关闭'}`, 'success')
    } catch (error: any) {
      // 失败回滚
      setConfigs((prev) => prev.map((c) => (c.key === config.key ? { ...c, value: config.value } : c)))
      showToast(`切换失败：${error.message || '请重试'}`, 'error')
    } finally {
      setTogglingKeys((prev) => {
        const s = new Set(prev)
        s.delete(config.key)
        return s
      })
    }
  }

  const handleResetCategory = async () => {
    if (!confirm(`确定要重置 ${CATEGORY_CONFIG[activeCategory as keyof typeof CATEGORY_CONFIG]?.label} 下的所有配置吗？`)) {
      return
    }
    try {
      await api.resetConfig(activeCategory)
      showToast('重置成功：配置已恢复到默认值', 'success')
      fetchConfigs()
    } catch (error) {
      showToast('重置失败', 'error')
    }
  }

  const filteredConfigs = configs.filter(c => c.category === activeCategory)

  const renderConfigInput = (config: SystemConfig) => {
    // 布尔项：谱牒风格开关控件
    if (config.value_type === 'boolean') {
      const on = config.value === 'true'
      return (
        <ToggleSwitch
          checked={on}
          onChange={() => handleToggleBool(config)}
          ariaLabel={`${config.label}，当前${on ? '已开启' : '已关闭'}`}
          busy={togglingKeys.has(config.key)}
        />
      )
    }

    if (editingKey !== config.key) {
      return (
        <span className="text-sm text-muted-foreground">{config.value || '-'}</span>
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
          eyebrow="谱 局 · 配 置"
          title="系统配置"
          subtitle="平台各功能项的参数设定"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetCategory}
            >
              <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
              重置当前分类
            </Button>
          }
        />

        {/* Category Tabs */}
        <div className="mb-6 flex gap-2 border-b overflow-x-auto" style={{ borderColor: 'hsl(var(--border))' }}>
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
            <div key={config.key} className="pg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{config.label}</h3>
                    {config.is_public && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
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
                        variant="primary"
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
                  ) : config.value_type === 'boolean' ? null : (
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
              </div>
            </div>
          ))}

          {filteredConfigs.length === 0 && (
            <div className="pg-card py-12 text-center">
              <p className="pg-title text-sm text-muted-foreground" style={{ letterSpacing: '0.1em' }}>
                此类目下暂无配置项。
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">切换其他分类，或由谱局先行增设</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default AdminConfigPage
