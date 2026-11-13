import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { FamilyEvent, Member } from '@/types'
import { formatDate } from '@/lib/date'
import {
  Button,
  Modal,
  Input,
  Label,
  useToast,
} from '@/components/ui'
import { PgPageHead, PgSectionHead, PgColophon } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import {
  ArrowLeft,
  Plus,
  MapPin,
  Trash2,
  Pencil,
  Baby,
  Heart,
  Home,
  Building2,
  MoreHorizontal,
  Clock,
  Upload,
  X,
  Users,
  BookOpen,
  Gift,
  TreePine,
} from 'lucide-react'

/* 谱事类型：图标 + 名称即可辨义，配色统一走主题令牌 */
const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  birth: { label: '出生', icon: <Baby className="h-3.5 w-3.5" /> },
  marriage: { label: '婚嫁', icon: <Heart className="h-3.5 w-3.5" /> },
  move: { label: '迁居', icon: <Home className="h-3.5 w-3.5" /> },
  build: { label: '修建', icon: <Building2 className="h-3.5 w-3.5" /> },
  ancestor_worship: { label: '祭祖', icon: <TreePine className="h-3.5 w-3.5" /> },
  genealogy_update: { label: '修谱', icon: <BookOpen className="h-3.5 w-3.5" /> },
  clan_gathering: { label: '宗亲会', icon: <Users className="h-3.5 w-3.5" /> },
  education: { label: '升学/科举', icon: <BookOpen className="h-3.5 w-3.5" /> },
  birthday: { label: '寿诞', icon: <Gift className="h-3.5 w-3.5" /> },
  other: { label: '其他', icon: <MoreHorizontal className="h-3.5 w-3.5" /> },
}

export default function FamilyEventsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [events, setEvents] = useState<FamilyEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    event_date: '',
    event_type: 'other',
    location: '',
    description: '',
    images: [] as string[],
    related_member_ids: [] as number[],
  })

  const loadEvents = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.getEvents(familyId)
      setEvents(data.events || [])
    } catch (err: any) {
      showToast(err.message || '加载大事记失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [familyId, showToast])

  useEffect(() => {
    if (familyId) loadEvents()
  }, [familyId, loadEvents])

  const loadMembers = async () => {
    try {
      const data = await api.getMembers(familyId)
      setMembers(data.members || [])
    } catch (err) {
      console.error('加载成员失败', err)
    }
  }

  const resetForm = () => {
    setFormData({ title: '', event_date: '', event_type: 'other', location: '', description: '', images: [], related_member_ids: [] })
    setFormErrors({})
    setEditingEvent(null)
  }

  const openAddForm = () => {
    resetForm()
    loadMembers()
    setShowForm(true)
  }

  const openEditForm = (event: FamilyEvent) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      event_date: event.event_date?.substring(0, 10) || '',
      event_type: event.event_type || 'other',
      location: event.location || '',
      description: event.description || '',
      images: (event as any).images || [],
      related_member_ids: (event as any).related_member_ids || [],
    })
    setFormErrors({})
    loadMembers()
    setShowForm(true)
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!formData.title.trim()) errors.title = '请输入事件标题'
    if (!formData.event_date) errors.event_date = '请选择日期'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const payload = {
        title: formData.title.trim(),
        event_date: formData.event_date,
        event_type: formData.event_type,
        location: formData.location.trim() || undefined,
        description: formData.description.trim() || undefined,
        images: formData.images.length > 0 ? formData.images : undefined,
        related_member_ids: formData.related_member_ids.length > 0 ? formData.related_member_ids : undefined,
      }

      if (editingEvent) {
        await api.updateEvent(familyId, editingEvent.id, payload)
        showToast('大事记已更新', 'success')
      } else {
        await api.createEvent(familyId, payload)
        showToast('大事记已创建', 'success')
      }

      setShowForm(false)
      resetForm()
      loadEvents()
    } catch (err: any) {
      showToast(err.message || '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (eventId: number) => {
    if (!confirm('确定要删除这条大事记吗？')) return
    try {
      await api.deleteEvent(familyId, eventId)
      showToast('大事记已删除', 'success')
      loadEvents()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (formData.images.length >= 9) {
          showToast('最多只能上传9张图片', 'info')
          break
        }
        const result = await api.uploadEventImage(familyId, file)
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, result.url],
        }))
      }
    } catch (err: any) {
      showToast(err.message || '图片上传失败', 'error')
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleMemberToggle = (memberId: number) => {
    setFormData((prev) => ({
      ...prev,
      related_member_ids: prev.related_member_ids.includes(memberId)
        ? prev.related_member_ids.filter((id) => id !== memberId)
        : [...prev.related_member_ids, memberId],
    }))
  }

  const getEventTypeConfig = (type: string) => {
    return EVENT_TYPE_CONFIG[type] || EVENT_TYPE_CONFIG.other
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  )

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 pg-rise">
        <div className="mb-5 flex items-center gap-2">
          <button
            onClick={() => navigate(`/family/${familyId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回族谱
          </button>
        </div>

        {/* 页头 */}
        <PgPageHead
          eyebrow="谱 牒 · 谱 事"
          title="家族大事记"
          subtitle="族中大情小事，按年编次，以备查考"
          actions={
            <Button variant="apple" glow onClick={openAddForm} className="gap-2">
              <Plus className="h-4 w-4" />
              添加事件
            </Button>
          }
        />

        {isLoading ? (
          <div className="space-y-6" aria-busy="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-6 animate-pulse">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-24 rounded bg-muted" />
                  <div className="mt-2 h-6 w-0.5 bg-muted" />
                </div>
                <div className="pg-card flex-1 p-5">
                  <div className="mb-2 h-5 w-2/3 rounded bg-muted" />
                  <div className="mb-2 h-4 w-1/3 rounded bg-muted" />
                  <div className="h-4 w-full rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="pg-card flex flex-col items-center justify-center py-20">
            <h2 className="mb-2 text-xl font-semibold pg-title">谱事尚空</h2>
            <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
              家族大事记记录了族中的重要时刻。点击右上「添加事件」，先记下第一则。
            </p>
            <Button variant="apple" glow onClick={openAddForm} className="gap-2">
              <Plus className="h-4 w-4" />
              添加第一条大事记
            </Button>
          </div>
        ) : (
          <div>
            <PgSectionHead text="谱 事 编 年" />

            <div className="relative mt-5">
              {/* 时间轴线 */}
              <div
                className="absolute left-[140px] top-0 h-full w-px"
                style={{ background: 'hsl(var(--border))' }}
                aria-hidden="true"
              />

              <div className="space-y-6">
                {sortedEvents.map((event, index) => {
                  const config = getEventTypeConfig(event.event_type)
                  return (
                    <div
                      key={event.id}
                      className="pg-rise relative flex gap-6 group"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      {/* 左侧日期 */}
                      <div className="w-[120px] shrink-0 pt-2 text-right">
                        <p className="text-sm font-semibold pg-title">
                          {new Date(event.event_date).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.event_date).toLocaleDateString('zh-CN', {
                            weekday: 'short',
                          })}
                        </p>
                      </div>

                      {/* 时间点：朱点 */}
                      <div
                        className="pg-stamp absolute left-[137px] top-4 z-10 h-2.5 w-2.5 rounded-full"
                        style={{ background: 'var(--pg-red)', boxShadow: '0 0 0 4px hsl(var(--card))' }}
                        aria-hidden="true"
                      />

                      {/* 事件卡片 */}
                      <div
                        className="pg-card flex-1 cursor-pointer p-5 transition-shadow duration-200 hover:shadow-md"
                        onClick={() => openEditForm(event)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="pg-title truncate text-base font-semibold">
                                {event.title}
                              </h3>
                              <span
                                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
                                style={{
                                  borderColor: 'hsl(var(--border))',
                                  background: 'hsl(var(--muted) / 0.4)',
                                  color: 'hsl(var(--muted-foreground))',
                                }}
                              >
                                {config.icon}
                                {config.label}
                              </span>
                            </div>

                            {event.location && (
                              <p className="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                {event.location}
                              </p>
                            )}

                            {event.description && (
                              <p className="text-sm leading-relaxed line-clamp-2 text-muted-foreground/80">
                                {event.description}
                              </p>
                            )}
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditForm(event)
                              }}
                              aria-label="编辑事件"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(event.id)
                              }}
                              aria-label="删除事件"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(event.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 卷末：记事总数 */}
            <div className="mt-8">
              <PgColophon
                items={[
                  ['所记谱事', `${sortedEvents.length} 则`],
                  ['编次', '由近及远'],
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* 添加/编辑事件弹窗（保留 Modal 组件，标题套谱牒页头风格） */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          resetForm()
        }}
        title={editingEvent ? '编辑事件' : '添加事件'}
        className="fe-modal"
      >
        <style>{`
          .fe-modal h2 {
            font-family: var(--pg-serif);
            letter-spacing: 0.06em;
          }
          .fe-modal h2::before {
            content: '';
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 2px;
            background: var(--pg-red);
            margin-right: 10px;
            vertical-align: 2px;
          }
        `}</style>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="event-title">
              事件标题 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="event-title"
              placeholder="例如：张氏宗祠奠基仪式"
              value={formData.title}
              onChange={(e) => {
                setFormData((p) => ({ ...p, title: e.target.value }))
                if (e.target.value.trim()) setFormErrors((p) => ({ ...p, title: '' }))
              }}
              error={formErrors.title}
              aria-invalid={!!formErrors.title}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-date">
                日期 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="event-date"
                type="date"
                value={formData.event_date}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, event_date: e.target.value }))
                  if (e.target.value) setFormErrors((p) => ({ ...p, event_date: '' }))
                }}
                error={formErrors.event_date}
                aria-invalid={!!formErrors.event_date}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-type">事件类型</Label>
              <select
                id="event-type"
                value={formData.event_type}
                onChange={(e) => setFormData((p) => ({ ...p, event_type: e.target.value }))}
                className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location">地点</Label>
            <Input
              id="event-location"
              placeholder="如：山东省济南市历下区"
              value={formData.location}
              onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-desc">详细描述</Label>
            <textarea
              id="event-desc"
              placeholder="描述事件的详细经过..."
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>事件图片（最多9张）</Label>
            <div className="grid grid-cols-4 gap-2">
              {formData.images.map((img, idx) => (
                <div key={idx} className="pg-card-soft relative aspect-square overflow-hidden group">
                  <img src={img} alt={`图片${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`移除图片${idx + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {formData.images.length < 9 && (
                <label className="pg-card-soft aspect-square flex flex-col items-center justify-center border-dashed cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">上传</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImages}
                  />
                </label>
              )}
            </div>
            {uploadingImages && <p className="text-xs text-muted-foreground">上传中...</p>}
          </div>

          <div className="space-y-2">
            <Label>关联成员</Label>
            <div className="pg-card-soft max-h-40 overflow-y-auto p-2 space-y-1">
              {members.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">暂无成员数据</p>
              ) : (
                members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.related_member_ids.includes(m.id)}
                      onChange={() => handleMemberToggle(m.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.gender === 'male' ? '男' : m.gender === 'female' ? '女' : '未知'}
                    </span>
                  </label>
                ))
              )}
            </div>
            {formData.related_member_ids.length > 0 && (
              <p className="text-xs text-muted-foreground">
                已选择 {formData.related_member_ids.length} 名成员
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowForm(false)
                resetForm()
              }}
            >
              取消
            </Button>
            <Button type="submit" variant="apple" glow className="flex-1" disabled={saving}>
              {saving ? '保存中...' : editingEvent ? '更新' : '创建'}
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
