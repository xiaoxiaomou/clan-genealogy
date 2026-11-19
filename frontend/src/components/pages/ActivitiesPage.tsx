import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { User } from '@/types'
import {
  Button,
  Input,
  Label,
  Modal,
  useToast,
} from '@/components/ui'
import { useConfirm } from '@/components/ui'
import { PgPageHead, PgSectionHead } from '@/components/ui/pedigree'
import { smartBack } from '@/lib/smartBack'
import { Layout } from '@/components/layout/Layout'
import { MapPin, Calendar, Users, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'

/* ═══ 谱页 · 雅集 —— 家族活动（祭祖 / 颁谱 / 聚会） ═══ */

interface RsvpItem {
  id: number
  user_id: number
  status: 'join' | 'maybe' | 'no'
  guests: number
  note: string | null
  user_name?: string
  created_at?: string
}

interface ActivityItem {
  id: number
  title: string
  type: string
  activity_date: string | null
  location: string | null
  description: string | null
  created_by: number
  joining_count: number
  my_rsvp: RsvpItem | null
  rsvps: RsvpItem[]
  is_past?: boolean
}

const TYPES = ['祭祖', '颁谱', '聚会', '其他']
const STATUS_LABEL: Record<string, string> = { join: '参加', maybe: '待定', no: '不参加' }

export default function ActivitiesPage() {
  const { id } = useParams<{ id: string }>()
  const familyId = Number(id)
  const navigate = useNavigate()
  const { ask, dialog } = useConfirm()
  const { showToast } = useToast()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [me, setMe] = useState<User | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ActivityItem | null>(null)
  const [form, setForm] = useState({ title: '', type: '聚会', activity_date: '', location: '', description: '' })
  const [rsvpTarget, setRsvpTarget] = useState<ActivityItem | null>(null)
  const [rsvpStatus, setRsvpStatus] = useState<'join' | 'maybe' | 'no'>('join')
  const [rsvpGuests, setRsvpGuests] = useState(0)
  const [rsvpNote, setRsvpNote] = useState('')
  const [processing, setProcessing] = useState(false)

  const load = useCallback(async () => {
    if (!familyId) return
    setLoading(true)
    try {
      const [list, roleRes, meRes] = await Promise.all([
        api.listActivities(familyId),
        api.getMyRole(familyId).catch(() => null),
        api.getProfile().catch(() => null),
      ])
      setActivities(list.activities || [])
      setCanEdit(roleRes?.can_edit === true)
      setMe(meRes?.user || meRes || null)
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [familyId, showToast])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', type: '聚会', activity_date: '', location: '', description: '' })
    setShowForm(true)
  }

  const openEdit = (a: ActivityItem) => {
    setEditing(a)
    setForm({
      title: a.title,
      type: a.type,
      activity_date: a.activity_date || '',
      location: a.location || '',
      description: a.description || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('请填写活动标题', 'error')
      return
    }
    setProcessing(true)
    try {
      if (editing) {
        await api.updateActivity(familyId, editing.id, form)
        showToast('活动已更新', 'success')
      } else {
        await api.createActivity(familyId, form)
        showToast('活动已创建', 'success')
      }
      setShowForm(false)
      load()
    } catch (err: any) {
      showToast(err.message || '保存失败', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (a: ActivityItem) => {
    if (!(await ask({ title: '删除活动', message: `确定删除活动「${a.title}」吗？报名记录也会一并删除。`, confirmText: '确认删除', danger: true }))) return
    try {
      await api.deleteActivity(familyId, a.id)
      showToast('活动已删除', 'success')
      load()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const openRsvp = (a: ActivityItem) => {
    setRsvpTarget(a)
    setRsvpStatus(a.my_rsvp?.status || 'join')
    setRsvpGuests(a.my_rsvp?.guests || 0)
    setRsvpNote(a.my_rsvp?.note || '')
  }

  const handleRsvp = async () => {
    if (!rsvpTarget) return
    setProcessing(true)
    try {
      await api.rsvpActivity(familyId, rsvpTarget.id, {
        status: rsvpStatus,
        guests: rsvpGuests,
        note: rsvpNote,
      })
      showToast('已登记', 'success')
      setRsvpTarget(null)
      load()
    } catch (err: any) {
      showToast(err.message || '登记失败', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const upcoming = activities.filter((a) => !a.is_past)
  const past = activities.filter((a) => a.is_past)

  const renderCard = (a: ActivityItem) => {
    const mine = a.created_by === me?.id
    const canManage = canEdit || mine
    return (
      <div key={a.id} className="pg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="rounded px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
              >
                {a.type}
              </span>
              <h3 className="truncate font-serif text-lg font-semibold">{a.title}</h3>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {a.activity_date}
              </span>
              {a.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {a.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {a.joining_count} 人报名
              </span>
            </div>
            {a.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.description}</p>
            )}
          </div>
          {canManage && (
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="outline" onClick={() => openEdit(a)} aria-label={`编辑 ${a.title}`}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleDelete(a)}
                aria-label={`删除 ${a.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* 我的报名状态 + 报名按钮 */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3" style={{ borderColor: 'hsl(var(--border))' }}>
          <span className="text-xs text-muted-foreground">
            {a.my_rsvp ? (
              <>
                我的登记：<b className="text-foreground">{STATUS_LABEL[a.my_rsvp.status]}</b>
                {a.my_rsvp.guests > 0 && ` · 携 ${a.my_rsvp.guests} 人`}
                {a.my_rsvp.note && ` · ${a.my_rsvp.note}`}
              </>
            ) : (
              '尚未登记'
            )}
          </span>
          <Button size="sm" variant="outline" onClick={() => openRsvp(a)}>
            {a.my_rsvp ? '修改登记' : '我要登记'}
          </Button>
        </div>

        {/* 接龙名单 */}
        {a.rsvps.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {a.rsvps.map((r) => (
              <span
                key={r.id}
                className="rounded-full border px-2.5 py-0.5 text-xs"
                style={{ borderColor: 'hsl(var(--border))', color: 'var(--muted)' }}
              >
                {r.user_name || `#${r.user_id}`}
                {r.guests > 0 && ` +${r.guests}`}
                {r.status !== 'join' && `（${STATUS_LABEL[r.status]}）`}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 pg-rise">
        <div className="flex items-center gap-2">
          <button
            onClick={() => smartBack(navigate, `/family/${familyId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回族谱
          </button>
        </div>
        <div className="flex items-center justify-between">
          <PgPageHead
            eyebrow="谱 局 · 雅 集"
            title="家族活动"
            subtitle="祭祖、颁谱、聚会的报名与接龙"
            actions={
              canEdit && (
                <Button onClick={openCreate} className="gap-1">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  新建活动
                </Button>
              )
            }
          />
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">加载中…</p>
        ) : activities.length === 0 ? (
          <div className="pg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {canEdit ? '尚无活动，点击右上角「新建活动」开始' : '家族暂无活动'}
            </p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <PgSectionHead text="即 将 开 展" />
                <div className="space-y-4">{upcoming.map(renderCard)}</div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <PgSectionHead text="往 期" />
                <div className="space-y-4 opacity-75">{past.map(renderCard)}</div>
              </div>
            )}
          </>
        )}

        {/* 新建/编辑弹窗 */}
        {showForm && (
          <Modal
            isOpen={showForm}
            onClose={() => setShowForm(false)}
            title={editing ? '编辑活动' : '新建活动'}
          >
            <div className="space-y-4">
              <div>
                <Label>活动标题 *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="如：清明祭祖 / 颁谱仪式 / 年度聚会"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>类型</Label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>日期</Label>
                  <Input
                    type="date"
                    value={form.activity_date}
                    onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>地点</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="如：祖祠大院"
                />
              </div>
              <div>
                <Label>说明</Label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder="活动安排、注意事项…"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
                <Button onClick={handleSave} disabled={processing}>
                  {processing ? '保存中…' : editing ? '保存' : '创建'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* 登记弹窗 */}
        {rsvpTarget && (
          <Modal
            isOpen={!!rsvpTarget}
            onClose={() => setRsvpTarget(null)}
            title={`登记 — ${rsvpTarget.title}`}
          >
            <div className="space-y-4">
              <div>
                <Label>是否参加</Label>
                <div className="mt-1 flex gap-2">
                  {(['join', 'maybe', 'no'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setRsvpStatus(s)}
                      className="flex-1 rounded-md border px-3 py-2 text-sm transition-colors"
                      style={
                        rsvpStatus === s
                          ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }
                          : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                      }
                      aria-pressed={rsvpStatus === s}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>携带人数（不含自己）</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={rsvpGuests}
                  onChange={(e) => setRsvpGuests(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
              <div>
                <Label>备注</Label>
                <Input
                  value={rsvpNote}
                  onChange={(e) => setRsvpNote(e.target.value)}
                  placeholder="如：带两位小孩 / 需安排住宿"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setRsvpTarget(null)}>取消</Button>
                <Button onClick={handleRsvp} disabled={processing}>
                  确认登记
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
      {dialog}
    </Layout>
  )
}
