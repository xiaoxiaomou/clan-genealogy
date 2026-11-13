import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Input,
  Label,
  Modal,
  useToast,
} from '@/components/ui'
import { PgPageHead, PgSectionHead, PgSeal, PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { api } from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Edit2, BookOpen, Briefcase, Heart, HandHeart, Sparkles } from 'lucide-react'

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

/* 类别：以一枚小印表功名，不再另配彩色 */
const CATEGORIES: { value: string; label: string; icon: any; seal: string }[] = [
  { value: 'education', label: '学业', icon: BookOpen, seal: '学' },
  { value: 'career', label: '事业', icon: Briefcase, seal: '业' },
  { value: 'virtue', label: '品德', icon: Heart, seal: '德' },
  { value: 'donation', label: '捐赠', icon: HandHeart, seal: '捐' },
  { value: 'other', label: '其他', icon: Sparkles, seal: '荣' },
]

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
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 pg-rise">
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
          eyebrow="谱 牒 · 功 德"
          title={`${titleText}·功德榜`}
          subtitle={
            honors.length > 0
              ? `彰家族之荣光 · 励后世之来者 · 共 ${honors.length} 项`
              : '彰家族之荣光 · 励后世之来者'
          }
          actions={
            canEdit && (
              <Button
                onClick={() => { setEditing(null); setShowEditor(true) }}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> 镌刻新荣
              </Button>
            )
          }
        />

        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCat('all')}
            className="rounded-full border px-3 py-1 text-xs transition-colors"
            style={
              filterCat === 'all'
                ? { borderColor: PG_RED, color: PG_RED, background: 'rgb(166 58 46 / 0.08)' }
                : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
            }
          >
            全部 ({honors.length})
          </button>
          {CATEGORIES.map((c) => {
            const cnt = honors.filter((h) => h.category === c.value).length
            const active = filterCat === c.value
            return (
              <button
                key={c.value}
                onClick={() => setFilterCat(c.value)}
                className="rounded-full border px-3 py-1 text-xs transition-colors"
                style={
                  active
                    ? { borderColor: PG_RED, color: PG_RED, background: 'rgb(166 58 46 / 0.08)' }
                    : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                }
              >
                {c.label} ({cnt})
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="pg-card mt-6 py-10 text-center text-sm text-muted-foreground">
            <span style={{ fontFamily: PG_SERIF, letterSpacing: '0.2em' }}>展卷候…</span>
          </div>
        ) : honors.length === 0 ? (
          <div className="pg-card mt-6 py-14 text-center">
            <p className="pg-title text-base">功德榜尚空，待后人书写</p>
            {canEdit && (
              <p className="mt-2 text-xs text-muted-foreground">点击右上「镌刻新荣」，记下族中第一位功名。</p>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {grouped.map((g) => {
              const Icon = g.icon
              return (
                <div key={g.value}>
                  <PgSectionHead
                    text={
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {g.label} · {g.items.length} 项
                      </span>
                    }
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.items.map((h) => (
                      <div key={h.id} className="pg-card group p-4 transition-shadow hover:shadow-md">
                        <div className="flex items-start gap-3">
                          <PgSeal char={g.seal} size={40} small title={`${g.label}类功名`} />
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              {h.year && (
                                <span className="text-xs text-muted-foreground">{h.year}</span>
                              )}
                            </div>
                            <h3 className="pg-title truncate text-lg font-semibold">{h.title}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {h.member_name}
                              {h.awarder && ` · ${h.awarder}`}
                            </p>
                            {h.description && (
                              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground/80">
                                {h.description}
                              </p>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                onClick={() => { setEditing(h); setShowEditor(true) }}
                                className="rounded p-1 text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
                                aria-label={`编辑 ${h.title}`}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => remove(h)}
                                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`删除 ${h.title}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground" style={{ fontFamily: PG_SERIF, letterSpacing: '0.3em' }}>
          愿积善之家 · 必有余庆
        </p>
      </div>

      <HonorEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        familyId={familyId}
        honor={editing}
        onSaved={() => { setShowEditor(false); load() }}
      />
    </Layout>
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
    >
      <div className="space-y-3">
        <div>
          <Label>获荣誉成员</Label>
          <select
            value={form.member_id}
            onChange={(e) => setForm({ ...form, member_id: parseInt(e.target.value) || 0 })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value={0}>— 请选择 —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>荣誉标题</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>类别</Label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>年份</Label>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || new Date().getFullYear() })}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label>颁奖机构</Label>
          <Input
            value={form.awarder}
            onChange={(e) => setForm({ ...form, awarder: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>详细说明</Label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
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
