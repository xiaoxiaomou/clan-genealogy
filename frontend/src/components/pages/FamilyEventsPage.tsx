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
  BorderGlow,
} from '@/components/ui'
import { Layout } from '@/components/layout/Layout'
import {
  ArrowLeft,
  Plus,
  Calendar,
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

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  birth: { label: '出生', icon: <Baby className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700 border-green-200' },
  marriage: { label: '婚嫁', icon: <Heart className="h-3.5 w-3.5" />, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  move: { label: '迁居', icon: <Home className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  build: { label: '修建', icon: <Building2 className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ancestor_worship: { label: '祭祖', icon: <TreePine className="h-3.5 w-3.5" />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  genealogy_update: { label: '修谱', icon: <BookOpen className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  clan_gathering: { label: '宗亲会', icon: <Users className="h-3.5 w-3.5" />, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  education: { label: '升学/科举', icon: <BookOpen className="h-3.5 w-3.5" />, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  birthday: { label: '寿诞', icon: <Gift className="h-3.5 w-3.5" />, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  other: { label: '其他', icon: <MoreHorizontal className="h-3.5 w-3.5" />, color: 'bg-gray-100 text-gray-700 border-gray-200' },
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
      

      <BorderGlow
        backgroundColor="transparent"
        className="!bg-transparent border-0 p-0"
        colors={['#4facfe', '#00f2fe', '#43e97b']}
        glowIntensity={0.3}
        edgeSensitivity={35}
      >
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* 页面头部 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/family/${familyId}`)}
              className="rounded"
              aria-label="返回族谱"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">家族大事记</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                记录家族中的重要时刻和事件
              </p>
            </div>
          </div>
          <Button variant="apple" glow onClick={openAddForm} className="gap-2">
            <Plus className="h-4 w-4" />
            添加事件
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-6" aria-busy="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-6 animate-pulse">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-24 rounded bg-muted" />
                  <div className="mt-2 h-6 w-0.5 bg-muted" />
                </div>
                <div className="flex-1 rounded-lg border bg-white dark:bg-[#262628] p-5">
                  <div className="mb-2 h-5 w-2/3 rounded bg-muted" />
                  <div className="mb-2 h-4 w-1/3 rounded bg-muted" />
                  <div className="h-4 w-full rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/8 border border-primary/15">
              <Calendar className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-semibold tracking-tight">暂无大事记</h2>
            <p className="mb-8 max-w-md text-center text-muted-foreground">
              家族大事记记录了家族历史中的重要时刻。点击上方按钮添加第一条记录。
            </p>
          <Button variant="apple" glow onClick={openAddForm} className="gap-2">
              <Plus className="h-4 w-4" />
              添加第一条大事记
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* 时间轴线 */}
            <div className="absolute left-[140px] top-0 h-full w-0.5 bg-border/60" aria-hidden="true" />

            <div className="space-y-6">
              {sortedEvents.map((event, index) => {
                const config = getEventTypeConfig(event.event_type)
                return (
                  <div
                    key={event.id}
                    className="relative flex gap-6 animate-fade-in group"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    {/* 左侧日期 */}
                    <div className="w-[120px] shrink-0 pt-2 text-right">
                      <p className="text-sm font-bold text-foreground">
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

                    {/* 时间点圆点 */}
                    <div className="absolute left-[133px] top-4 z-10 h-4 w-4 rounded-full border-2 border-primary bg-card" aria-hidden="true" />

                    {/* 事件卡片 */}
                    <div className="flex-1 rounded-lg border bg-white dark:bg-[#262628] p-5 transition-all duration-200 hover:shadow-md cursor-pointer"
                      onClick={() => openEditForm(event)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="mb-2 flex items-center gap-2">
                            <h3 className="text-base font-semibold text-foreground truncate">
                              {event.title}
                            </h3>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
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
                            <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-2">
                              {event.description}
                            </p>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
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
        )}
      </div>
      </BorderGlow>

      {/* 添加/编辑事件弹窗 */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          resetForm()
        }}
        title={editingEvent ? '编辑事件' : '添加事件'}
      >
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
                className="flex h-11 w-full rounded-lg border-0 bg-[#fafafc] dark:bg-[#2a2a2d] px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
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
              className="flex w-full rounded-lg border-0 bg-[#fafafc] dark:bg-[#2a2a2d] px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>事件图片（最多9张）</Label>
            <div className="grid grid-cols-4 gap-2">
              {formData.images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border group">
                  <img src={img} alt={`图片${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {formData.images.length < 9 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
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
            <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">暂无成员数据</p>
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
