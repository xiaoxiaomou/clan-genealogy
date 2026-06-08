import { useEffect, useState } from 'react'
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
import { ArrowLeft, Plus, Trash2, Edit2, Award, BookOpen, Briefcase, Heart, HandHeart, Sparkles } from 'lucide-react'

interface Honor {
  id: number
  member_id: number
  member_name: string
  title: string
  category: string
  year: number | null
  description: string | null
  awarder: string | null
}

const CATEGORIES: { value: string; label: string; icon: any; glow: string; accent: string }[] = [
  { value: 'education', label: '学业', icon: BookOpen, glow: '#7ba6c7', accent: '#a8c5dc' },
  { value: 'career', label: '事业', icon: Briefcase, glow: '#7ba17b', accent: '#a5c4a5' },
  { value: 'virtue', label: '品德', icon: Heart, glow: '#c08494', accent: '#d4a8b3' },
  { value: 'donation', label: '捐赠', icon: HandHeart, glow: '#d4a574', accent: '#e0bf95' },
  { value: 'other', label: '其他', icon: Sparkles, glow: '#a8a29e', accent: '#c4c0bb' },
]

const BG = 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)'

const inputClass = "mt-1 w-full rounded-md border border-amber-700/30 bg-stone-950/40 px-3 py-2 text-sm text-amber-100 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:outline-none focus:ring-1 focus:ring-amber-600/30"

export default function HonorWallPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [honors, setHonors] = useState<Honor[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Honor | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('all')
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
      const data = await api.listHonors(familyId)
      setHonors(data.honors || [])
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function remove(h: Honor) {
    if (!confirm(`确定要删除「${h.title}」吗？`)) return
    try {
      await api.deleteHonor(familyId, h.id)
      showToast('已删除', 'success')
      load()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const filtered = filterCat === 'all' ? honors : honors.filter((h) => h.category === filterCat)
  const grouped = CATEGORIES.map((c) => ({
    ...c,
    items: filtered.filter((h) => h.category === c.value),
  })).filter((g) => g.items.length > 0)

  const titleText = familySurname ? `${familySurname}氏` : (familyName || '本族')

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: BG }}>
      <div className="mx-auto max-w-5xl space-y-6">
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
              <Plus className="mr-1 h-4 w-4" /> 镌刻新荣
            </Button>
          )}
        </div>

        {/* 匾额 */}
        <div className="relative overflow-hidden rounded-lg border-2 border-amber-700/40 bg-gradient-to-br from-amber-900/40 to-stone-900/60 p-8 text-center shadow-2xl">
          <div className="absolute inset-0 opacity-20" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(245, 230, 211, 0.1) 10px, rgba(245, 230, 211, 0.1) 11px)',
          }} />
          <div className="relative">
            <div className="mb-2 text-xs tracking-[0.5em] text-amber-300/60">功 德 荣 誉</div>
            <h1 className="font-serif text-5xl font-bold text-amber-100">
              {titleText}·功德榜
            </h1>
            <div className="mt-3 text-sm text-amber-200/70">
              彰家族之荣光 · 励后世之来者
            </div>
            {honors.length > 0 && (
              <div className="mt-2 text-xs text-amber-200/40">共 {honors.length} 项荣光</div>
            )}
          </div>
        </div>

        {/* 分类筛选 */}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setFilterCat('all')}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filterCat === 'all'
                ? 'border-amber-500 bg-amber-700/40 text-amber-100'
                : 'border-amber-700/30 bg-stone-900/40 text-amber-200/60 hover:border-amber-600/50'
            }`}
          >
            全部 ({honors.length})
          </button>
          {CATEGORIES.map((c) => {
            const cnt = honors.filter((h) => h.category === c.value).length
            return (
              <button
                key={c.value}
                onClick={() => setFilterCat(c.value)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  filterCat === c.value
                    ? 'border-amber-500 bg-amber-700/40 text-amber-100'
                    : 'border-amber-700/30 bg-stone-900/40 text-amber-200/60 hover:border-amber-600/50'
                }`}
              >
                {c.label} ({cnt})
              </button>
            )
          })}
        </div>

        {loading ? (
          <Card className="border-amber-700/30 bg-stone-900/50">
            <CardContent className="py-10 text-center text-sm text-amber-200/60">展卷候...</CardContent>
          </Card>
        ) : honors.length === 0 ? (
          <Card className="border-amber-700/30 bg-stone-900/50">
            <CardContent className="py-12 text-center">
              <Award className="mx-auto h-12 w-12 text-amber-200/20" />
              <p className="mt-3 font-serif text-sm text-amber-200/50">功德榜尚空，待后人书写</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => {
              const Icon = g.icon
              return (
                <div key={g.value}>
                  <h2
                    className="mb-3 flex items-center gap-2 font-serif text-base"
                    style={{ color: g.accent }}
                  >
                    <Icon className="h-4 w-4" />
                    {g.label} · {g.items.length} 项
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((h) => (
                      <Card
                        key={h.id}
                        className="group border-amber-700/30 bg-stone-900/50 transition-all hover:border-amber-500/60 hover:bg-stone-900/70"
                        style={{ boxShadow: `inset 0 1px 0 ${g.glow}20` }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <Icon className="h-4 w-4" style={{ color: g.accent }} />
                                {h.year && (
                                  <span className="font-mono text-xs text-amber-200/50">{h.year}</span>
                                )}
                              </div>
                              <h3 className="font-serif text-lg font-semibold text-amber-100">{h.title}</h3>
                              <p className="mt-1 text-xs text-amber-200/60">
                                {h.member_name}
                                {h.awarder && ` · ${h.awarder}`}
                              </p>
                              {h.description && (
                                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-amber-200/50">
                                  {h.description}
                                </p>
                              )}
                            </div>
                            {canEdit && (
                              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button
                                  onClick={() => { setEditing(h); setShowEditor(true) }}
                                  className="rounded p-1 text-amber-200/50 hover:bg-amber-700/20 hover:text-amber-100"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => remove(h)}
                                  className="rounded p-1 text-amber-200/50 hover:bg-rose-700/30 hover:text-rose-300"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs text-amber-200/30">
          愿积善之家，必有余庆
        </p>
      </div>

      <HonorEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        familyId={familyId}
        honor={editing}
        onSaved={() => { setShowEditor(false); load() }}
      />
    </div>
  )
}

function HonorEditor({
  open,
  onClose,
  familyId,
  honor,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  familyId: number
  honor: Honor | null
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [members, setMembers] = useState<any[]>([])
  const [form, setForm] = useState({
    member_id: honor?.member_id || 0,
    title: honor?.title || '',
    category: honor?.category || 'education',
    year: honor?.year || new Date().getFullYear(),
    description: honor?.description || '',
    awarder: honor?.awarder || '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      api.getMembers(familyId).then((data) => {
        const list = Array.isArray(data) ? data : data.members || []
        setMembers(list)
      })
      setForm({
        member_id: honor?.member_id || 0,
        title: honor?.title || '',
        category: honor?.category || 'education',
        year: honor?.year || new Date().getFullYear(),
        description: honor?.description || '',
        awarder: honor?.awarder || '',
      })
    }
  }, [open, honor, familyId])

  async function save() {
    if (!form.member_id || !form.title.trim()) {
      showToast('请选择成员并填写荣誉标题', 'error')
      return
    }
    setSaving(true)
    try {
      const data = {
        member_id: form.member_id,
        title: form.title,
        category: form.category,
        year: form.year,
        description: form.description,
        awarder: form.awarder,
      }
      if (honor) {
        await api.updateHonor(familyId, honor.id, data)
      } else {
        await api.createHonor(familyId, data)
      }
      showToast(honor ? '已更新' : '已添加', 'success')
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
      title={honor ? '编辑荣誉' : '添加荣誉'}
      className="border-amber-700/40 bg-stone-900 [&_.text-foreground]:text-amber-100"
    >
      <div className="space-y-3">
        <div>
          <Label className="text-amber-200/80">获荣誉成员</Label>
          <select
            value={form.member_id}
            onChange={(e) => setForm({ ...form, member_id: parseInt(e.target.value) || 0 })}
            className={inputClass}
          >
            <option value={0}>— 请选择 —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-amber-200/80">荣誉标题</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="border-amber-700/30 bg-stone-950/40 text-amber-100"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-amber-200/80">类别</Label>
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
            <Label className="text-amber-200/80">年份</Label>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || new Date().getFullYear() })}
              className="border-amber-700/30 bg-stone-950/40 text-amber-100"
            />
          </div>
        </div>
        <div>
          <Label className="text-amber-200/80">颁奖机构</Label>
          <Input
            value={form.awarder}
            onChange={(e) => setForm({ ...form, awarder: e.target.value })}
            className="border-amber-700/30 bg-stone-950/40 text-amber-100"
          />
        </div>
        <div>
          <Label className="text-amber-200/80">详细说明</Label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
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
