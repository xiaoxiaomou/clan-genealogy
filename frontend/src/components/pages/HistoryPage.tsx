import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Input,
  Label,
  Modal,
  useToast,
} from '@/components/ui'
import { PgPageHead, PgSeal, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Edit2, History as HistoryIcon } from 'lucide-react'

interface HistoryEvent {
  id: number
  year: number
  month: number | null
  day: number | null
  title: string
  description: string
  category: string
  source: string
  related_member_ids: number[]
}

/* 分类色为数据编码（区分事件类别），非页面装饰 */
const CATEGORIES = [
  { value: 'politics', label: '政治', accent: '#c08494' },
  { value: 'military', label: '军事', accent: '#d97757' },
  { value: 'culture', label: '文化', accent: '#7ba6c7' },
  { value: 'disaster', label: '灾害', accent: '#8a8a8a' },
  { value: 'event', label: '事件', accent: '#7ba17b' },
]

const inputClass = 'mt-1 w-full rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring'

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [events, setEvents] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<HistoryEvent | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [familySurname, setFamilySurname] = useState('')
  const [familyName, setFamilyName] = useState('')

  useEffect(() => {
    load()
    api.getMyRole(familyId).then((r) => setCanEdit(r.can_edit)).catch(() => {})
    api.getFamily(familyId).then((r) => {
      setFamilySurname(r?.family?.surname || '')
      setFamilyName(r?.family?.name || '')
    }).catch(() => {})
  }, [familyId])

  async function load() {
    setLoading(true)
    try {
      const data = await api.listHistoricalEvents(familyId)
      setEvents(data.events || [])
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function remove(rid: number) {
    if (!confirm('确定要删除这条历史事件吗？')) return
    try {
      await api.deleteHistoricalEvent(familyId, rid)
      showToast('已删除', 'success')
      load()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const byCentury = useMemo(() => {
    const groups: Record<string, HistoryEvent[]> = {}
    for (const e of events) {
      const century = `${Math.floor(e.year / 100) * 100} - ${Math.floor(e.year / 100) * 100 + 99}`
      if (!groups[century]) groups[century] = []
      groups[century].push(e)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  const titleText = familySurname ? `${familySurname}氏` : (familyName || '本族')

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 pg-rise">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/family/${familyId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回族谱
          </button>
        </div>

        <PgPageHead
          eyebrow="谱 牒 · 史 海"
          title={`${titleText}·史录`}
          subtitle="与家族同代发生的历史大事，可与成员相互对照"
          actions={
            <>
              {canEdit && (
                <Button onClick={() => { setEditing(null); setShowEditor(true) }}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> 录入新事
                </Button>
              )}
              <PgSeal char="史" size={56} title="族史钩沉" />
            </>
          }
        />

        {loading ? (
          <div className="pg-card py-10 text-center text-sm text-muted-foreground">展卷候...</div>
        ) : events.length === 0 ? (
          <div className="pg-card py-12 text-center">
            <HistoryIcon className="mx-auto h-10 w-10 text-muted-foreground opacity-30" aria-hidden="true" />
            <p
              className="mt-3 text-sm"
              style={{ fontFamily: PG_SERIF, color: 'hsl(var(--muted-foreground))' }}
            >
              史录尚空，{canEdit ? '点击右上角「录入新事」' : '请联系管理员补录'}
            </p>
          </div>
        ) : (
          /* 世纪分组时间轴（分组与条目映射保持原逻辑，仅重构外围样式） */
          <div className="relative space-y-10 pl-10 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-border">
            {byCentury.map(([century, list]) => (
              <div key={century} className="relative">
                <div
                  className="absolute -left-10 top-1 flex h-8 w-8 items-center justify-center rounded-full border text-[10px]"
                  style={{
                    borderColor: 'hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    fontFamily: PG_SERIF,
                  }}
                >
                  {century.split(' ')[0].slice(2)}s
                </div>
                <h2 className="mb-4 text-sm" style={{ fontFamily: PG_SERIF, letterSpacing: '0.2em' }}>
                  {century}
                </h2>
                <div className="space-y-3">
                  {list.map((e) => {
                    const cat = CATEGORIES.find((c) => c.value === e.category) || CATEGORIES[4]
                    const date = [e.year, e.month, e.day].filter(Boolean).join('-')
                    return (
                      <div key={e.id} className="pg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{date}</span>
                              <span
                                className="rounded-full border px-2 py-0.5 text-[10px]"
                                style={{ borderColor: cat.accent + '60', color: cat.accent, backgroundColor: cat.accent + '15' }}
                              >
                                {cat.label}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold" style={{ fontFamily: PG_SERIF, letterSpacing: '0.04em' }}>
                              {e.title}
                            </h3>
                            {e.description && (
                              <p className="text-sm leading-relaxed text-muted-foreground">{e.description}</p>
                            )}
                            {e.source && (
                              <p className="text-xs italic text-muted-foreground opacity-70">来源：{e.source}</p>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex shrink-0 gap-1">
                              <button
                                onClick={() => { setEditing(e); setShowEditor(true) }}
                                className="rounded p-1 text-muted-foreground hover:text-foreground"
                                aria-label={`编辑 ${e.title}`}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => remove(e.id)}
                                className="rounded p-1 text-muted-foreground hover:text-destructive"
                                aria-label={`删除 ${e.title}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p
          className="text-center text-xs text-muted-foreground"
          style={{ fontFamily: PG_SERIF, letterSpacing: '0.3em' }}
        >
          以史为鉴 · 知家族兴替
        </p>
      </div>

      <HistoryEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        familyId={familyId}
        event={editing}
        onSaved={() => { setShowEditor(false); load() }}
      />
    </Layout>
  )
}

function HistoryEditor({
  open,
  onClose,
  familyId,
  event,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  familyId: number
  event: HistoryEvent | null
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    year: event?.year || new Date().getFullYear(),
    month: event?.month || '',
    day: event?.day || '',
    title: event?.title || '',
    description: event?.description || '',
    category: event?.category || 'event',
    source: event?.source || '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        year: event?.year || new Date().getFullYear(),
        month: event?.month || '',
        day: event?.day || '',
        title: event?.title || '',
        description: event?.description || '',
        category: event?.category || 'event',
        source: event?.source || '',
      })
    }
  }, [open, event])

  async function save() {
    if (!form.title.trim()) {
      showToast('标题不能为空', 'error')
      return
    }
    setSaving(true)
    try {
      const data = {
        year: form.year,
        month: form.month || null,
        day: form.day || null,
        title: form.title,
        description: form.description,
        category: form.category,
        source: form.source,
      }
      if (event) {
        await api.updateHistoricalEvent(familyId, event.id, data)
      } else {
        await api.createHistoricalEvent(familyId, data)
      }
      showToast(event ? '已更新' : '已添加', 'success')
      onSaved()
    } catch (err: any) {
      showToast(err.message || '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={event ? '编辑史录' : '录入史录'}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>年</Label>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>月</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={form.month}
              onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) || '' })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>日</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={form.day}
              onChange={(e) => setForm({ ...form, day: parseInt(e.target.value) || '' })}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label>标题</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>分类</Label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>描述</Label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <Label>资料来源</Label>
          <Input
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="mt-1"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
