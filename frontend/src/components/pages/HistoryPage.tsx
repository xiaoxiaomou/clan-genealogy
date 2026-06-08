import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Modal,
  useToast,
} from '@/components/ui'
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

const CATEGORIES = [
  { value: 'politics', label: '政治', accent: '#c08494' },
  { value: 'military', label: '军事', accent: '#d97757' },
  { value: 'culture', label: '文化', accent: '#7ba6c7' },
  { value: 'disaster', label: '灾害', accent: '#8a8a8a' },
  { value: 'event', label: '事件', accent: '#7ba17b' },
]

const BG = 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)'

const inputClass = "mt-1 w-full rounded-md border border-amber-700/30 bg-stone-950/40 px-3 py-2 text-sm text-amber-100 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:outline-none focus:ring-1 focus:ring-amber-600/30"

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
    <div className="min-h-screen p-4 sm:p-8" style={{ background: BG }}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between text-amber-100">
          <button
            onClick={() => navigate(`/family/${familyId}`)}
            className="flex items-center gap-1 text-sm hover:text-amber-300"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
          {canEdit && (
            <Button
              onClick={() => { setEditing(null); setShowEditor(true) }}
              className="bg-amber-700/80 text-amber-50 hover:bg-amber-600"
            >
              <Plus className="mr-1 h-4 w-4" /> 录入新事
            </Button>
          )}
        </div>

        {/* 匾额 */}
        <div className="relative overflow-hidden rounded-lg border-2 border-amber-700/40 bg-gradient-to-br from-amber-900/40 to-stone-900/60 p-8 text-center shadow-2xl">
          <div className="absolute inset-0 opacity-20" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(245, 230, 211, 0.1) 10px, rgba(245, 230, 211, 0.1) 11px)',
          }} />
          <div className="relative">
            <div className="mb-2 text-xs tracking-[0.5em] text-amber-300/60">史 海 钩 沉</div>
            <h1 className="font-serif text-5xl font-bold text-amber-100">
              {titleText}·历史事实
            </h1>
            <div className="mt-3 text-sm text-amber-200/70">
              与家族同代发生的历史大事 · 可与成员关联
            </div>
            {events.length > 0 && (
              <div className="mt-2 text-xs text-amber-200/40">共 {events.length} 件史录</div>
            )}
          </div>
        </div>

        {loading ? (
          <Card className="border-amber-700/30 bg-stone-900/50">
            <CardContent className="py-10 text-center text-sm text-amber-200/60">展卷候...</CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card className="border-amber-700/30 bg-stone-900/50">
            <CardContent className="py-10 text-center">
              <HistoryIcon className="mx-auto h-10 w-10 text-amber-200/20" />
              <p className="mt-3 font-serif text-sm text-amber-200/50">
                暂无史录，{canEdit ? '点击右上角录入' : '请联系管理员'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative space-y-10 pl-10 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:bg-gradient-to-b before:from-amber-700/40 before:via-amber-700/20 before:to-transparent">
            {byCentury.map(([century, list]) => (
              <div key={century} className="relative">
                <div
                  className="absolute -left-10 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-700/50 bg-amber-900/60 font-serif text-[10px] text-amber-100 shadow-md"
                  style={{ boxShadow: '0 0 12px rgba(212,165,116,0.25)' }}
                >
                  {century.split(' ')[0].slice(2)}s
                </div>
                <h2 className="mb-4 font-serif text-base text-amber-200">
                  {century}
                </h2>
                <div className="space-y-3">
                  {list.map((e) => {
                    const cat = CATEGORIES.find((c) => c.value === e.category) || CATEGORIES[4]
                    const date = [e.year, e.month, e.day].filter(Boolean).join('-')
                    return (
                      <Card
                        key={e.id}
                        className="border-amber-700/30 bg-stone-900/50 transition-colors hover:border-amber-600/50 hover:bg-stone-900/70"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-amber-200/50">{date}</span>
                                <span
                                  className="rounded-full border px-2 py-0.5 text-[10px]"
                                  style={{ borderColor: cat.accent + '60', color: cat.accent, backgroundColor: cat.accent + '15' }}
                                >
                                  {cat.label}
                                </span>
                              </div>
                              <h3 className="font-serif text-lg font-semibold text-amber-100">{e.title}</h3>
                              {e.description && (
                                <p className="text-sm leading-relaxed text-amber-200/70">{e.description}</p>
                              )}
                              {e.source && (
                                <p className="text-xs italic text-amber-200/40">来源：{e.source}</p>
                              )}
                            </div>
                            {canEdit && (
                              <div className="flex shrink-0 gap-1">
                                <button
                                  onClick={() => { setEditing(e); setShowEditor(true) }}
                                  className="rounded p-1 text-amber-200/50 hover:bg-amber-700/20 hover:text-amber-100"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => remove(e.id)}
                                  className="rounded p-1 text-amber-200/50 hover:bg-rose-700/30 hover:text-rose-300"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-amber-200/30">
          以史为鉴，知家族兴替
        </p>
      </div>

      <HistoryEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        familyId={familyId}
        event={editing}
        onSaved={() => { setShowEditor(false); load() }}
      />
    </div>
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
      className="border-amber-700/40 bg-stone-900 [&_.text-foreground]:text-amber-100"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-amber-200/80">年</Label>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || 0 })}
              className="mt-1 border-amber-700/30 bg-stone-950/40 text-amber-100"
            />
          </div>
          <div>
            <Label className="text-amber-200/80">月</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={form.month}
              onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) || '' })}
              className="mt-1 border-amber-700/30 bg-stone-950/40 text-amber-100"
            />
          </div>
          <div>
            <Label className="text-amber-200/80">日</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={form.day}
              onChange={(e) => setForm({ ...form, day: parseInt(e.target.value) || '' })}
              className="mt-1 border-amber-700/30 bg-stone-950/40 text-amber-100"
            />
          </div>
        </div>
        <div>
          <Label className="text-amber-200/80">标题</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 border-amber-700/30 bg-stone-950/40 text-amber-100"
          />
        </div>
        <div>
          <Label className="text-amber-200/80">分类</Label>
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
          <Label className="text-amber-200/80">描述</Label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <Label className="text-amber-200/80">资料来源</Label>
          <Input
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="mt-1 border-amber-700/30 bg-stone-950/40 text-amber-100"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-amber-700/40 text-amber-200 hover:bg-amber-900/30"
          >
            取消
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-amber-700/80 text-amber-50 hover:bg-amber-600"
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
