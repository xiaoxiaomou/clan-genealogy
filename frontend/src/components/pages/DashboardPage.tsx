import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Family } from '@/types'
import {
  Button,
  Modal,
  Input,
  Label,
  useToast,
  useConfirm,
} from '@/components/ui'
import { Layout } from '@/components/layout/Layout'
import { PgPageHead, PgSeal, PgSectionHead } from '@/components/ui/pedigree'
import { solarToLunar } from '@/lib/lunar'
import {
  Plus,
  Globe,
  Lock,
  Shield,
  Trash2,
  ArrowRight,
  ListTree,
  Heart,
  Image,
  MessageSquare,
  MessageCircle,
  MapPin,
  Flame,
  Sparkles,
} from 'lucide-react'

/* ── 总目（我的族谱）：卷帙函套 + 常用直入 + 祠堂动态 ── */

const ROLE_LABELS: Record<string, string> = {
  owner: '所有者',
  admin: '管理员',
  editor: '编辑者',
  viewer: '族人',
}

interface PostLite {
  id: number
  content: string
  created_at?: string
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { ask, dialog } = useConfirm()
  const [families, setFamilies] = useState<Family[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userName, setUserName] = useState('')
  const [roles, setRoles] = useState<Record<number, string>>({})
  const [genSpan, setGenSpan] = useState<Record<number, number | null>>({})
  const [firstPosts, setFirstPosts] = useState<PostLite[]>([])
  const [todayMemorial, setTodayMemorial] = useState<{ count: number; names: string[] } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    surname: '',
    origin: '',
    description: '',
    is_public: false,
  })
  const [formErrors, setFormErrors] = useState<{ name?: string }>({})
  const loadTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        setIsAdmin(user.is_admin || false)
        setUserName(user.display_name || user.username || '')
      } catch {
        /* ignore */
      }
    }
    loadFamilies()
  }, [])

  useEffect(() => {
    return () => window.clearTimeout(loadTimer.current)
  }, [])

  const loadFamilies = async () => {
    try {
      const data = await api.getFamilies()
      const fams: Family[] = data.families || []
      setFamilies(fams)

      // 前 3 部：我的角色 + 世代跨度
      const head = fams.slice(0, 3)
      const roleResults = await Promise.all(head.map((f) => api.getMyRole(f.id).catch(() => null)))
      setRoles(Object.fromEntries(head.map((f, i) => [f.id, roleResults[i]?.role || ''])))
      const statsResults = await Promise.all(head.map((f) => api.getFamilyStats(f.id).catch(() => null)))
      setGenSpan(
        Object.fromEntries(
          head.map((f, i) => {
            const gs = statsResults[i]?.gen_stats || {}
            const nums = Object.keys(gs)
              .map((k) => Number(String(k).replace(/[^0-9]/g, '')))
              .filter((n) => !Number.isNaN(n))
            return [f.id, nums.length ? Math.max(...nums) : null]
          }),
        ),
      )

      // 第一部族谱：祠堂动态 + 今日忌日
      if (fams.length > 0) {
        const [pd, td] = await Promise.all([
          api.listPosts(fams[0].id).catch(() => null),
          api.getTodayMemorial(fams[0].id).catch(() => null),
        ])
        setFirstPosts((pd?.posts || []).slice(0, 3))
        setTodayMemorial({
          count: td?.count || 0,
          names: (td?.items || []).map((x: any) => x.member_name).slice(0, 4),
        })
      }
    } catch (err: any) {
      showToast(err.message || '加载族谱失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!createForm.name.trim()) {
      setFormErrors({ name: '请输入族谱名称' })
      return
    }

    setFormErrors({})

    try {
      const data = await api.createFamily(createForm)
      showToast('族谱创建成功', 'success')
      setShowCreate(false)
      setCreateForm({
        name: '',
        surname: '',
        origin: '',
        description: '',
        is_public: false,
      })
      await loadFamilies()
      navigate(`/family/${data.family.id}`)
    } catch (err: any) {
      showToast(err.message || '创建失败', 'error')
    }
  }

  const handleDeleteFamily = async (e: React.MouseEvent, familyId: number, familyName: string) => {
    e.stopPropagation()
    if (
      !(await ask({
        title: '删除族谱',
        message: `确定要删除「${familyName}」吗？此操作不可恢复，所有成员和关系数据也将被删除。`,
        confirmText: '确认删除',
        danger: true,
      }))
    )
      return
    try {
      await api.deleteFamily(familyId)
      showToast('族谱已删除', 'success')
      loadFamilies()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const today = new Date()
  const lunar = solarToLunar(today)
  const firstFamily = families[0]

  const QUICK_ITEMS = firstFamily
    ? [
        { icon: ListTree, title: '谱系树', desc: `${genSpan[firstFamily.id] || '?'} 代世系一览`, to: `/family/${firstFamily.id}?view=tree` },
        { icon: Heart, title: '家庙祭拜', desc: '牌位前上香叩首', to: `/family/${firstFamily.id}/temple` },
        { icon: Image, title: '家族相册', desc: '影像归集留存', to: `/family/${firstFamily.id}/album` },
        { icon: MessageSquare, title: '家族动态', desc: '宗亲近事', to: `/family/${firstFamily.id}/feed` },
        { icon: MessageCircle, title: '家族聊天', desc: '族人即时联络', to: `/family/${firstFamily.id}/chat` },
        { icon: MapPin, title: '家族地理', desc: '迁徙生息地图', to: `/family/${firstFamily.id}/map` },
      ]
    : []

  const renderSlip = (family: Family, index: number) => {
    const role = roles[family.id] || 'viewer'
    const gens = genSpan[family.id]
    return (
      <article
        key={family.id}
        className="pg-slip cursor-pointer"
        onClick={() => navigate(`/family/${family.id}/intro`)}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate(`/family/${family.id}/intro`)
          }
        }}
        aria-label={`进入 ${family.name}`}
      >
        <div className="pg-slip-main">
          <div className="pg-slip-eyebrow">卷 {index + 1} · {family.surname || ''}氏</div>
          <div className="pg-slip-title-row">
            <PgSeal char={family.surname || '谱'} size={58} title={`${family.name} · 姓氏印`} />
            <div className="pg-slip-tools" onClick={(e) => e.stopPropagation()}>
              {isAdmin && (
                <button
                  onClick={(e) => handleDeleteFamily(e, family.id, family.name)}
                  className="rounded p-2 text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive"
                  aria-label={`删除族谱：${family.name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              {family.is_public ? (
                <Globe className="h-4 w-4 text-muted-foreground" aria-label="公开族谱" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" aria-label="私有族谱" />
              )}
            </div>
            <div>
              <h2 className="pg-slip-name">{family.name}</h2>
              <p className="pg-slip-sub">耕读传家 · 敬宗睦族</p>
            </div>
          </div>
          <div className="pg-slip-stats">
            <span className="st"><b>{family.member_count}</b> 位族人</span>
            {gens ? <span className="sep" /> : null}
            {gens ? <span className="st"><b>{gens}</b> 代同堂</span> : null}
            {family.origin ? <span className="sep" /> : null}
            {family.origin ? <span className="st"><b>1</b> 处发祥 · {family.origin}</span> : null}
            <span className="sep" />
            <span className="role-chip"><i aria-hidden="true" />我的身份 · {ROLE_LABELS[role] || role}</span>
          </div>
          <div className="pg-slip-cta" onClick={(e) => e.stopPropagation()}>
            <button className="pg-btn-primary" onClick={() => navigate(`/family/${family.id}/intro`)}>
              <ArrowRight aria-hidden="true" />
              展卷入谱
            </button>
          </div>
        </div>
        <div className="pg-slip-scroll">
          <div className="pg-slip-motto-frame">
            <span className="pg-slip-motto-text">{family.motto || `${family.surname || '谱'}氏族谱`}</span>
            <span className="pg-slip-motto-seal" aria-hidden="true">训</span>
          </div>
          <span className="pg-slip-motto-caption">{family.motto ? '祖 训 挂 轴' : '宗 族 名 号'}</span>
        </div>
      </article>
    )
  }

  return (
    <Layout>
      <div className="pg-rise mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PgPageHead
          eyebrow="谱 牒 · 总 目"
          title="我的族谱"
          subtitle={`${userName || '族人'}，欢迎归谱 · 名下卷帙、祠堂动静，皆在此页`}
          actions={
            <>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/users')}
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  用户管理
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="apple"
                  onClick={() => setShowCreate(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  创建族谱
                </Button>
              )}
            </>
          }
        />

        {/* 卷帙 */}
        <PgSectionHead
          text="卷 帙"
          right={<span className="text-xs text-muted-foreground">{isLoading ? '' : `${families.length} 部在谱`}</span>}
        />

        {isLoading ? (
          <div className="pg-card animate-pulse p-8" aria-busy="true" aria-live="polite">
            <div className="h-14 w-14 rounded-lg bg-muted" />
            <div className="mt-4 h-6 w-1/3 rounded bg-muted" />
            <div className="mt-6 h-4 w-2/3 rounded bg-muted" />
            <div className="mt-3 h-4 w-1/2 rounded bg-muted" />
          </div>
        ) : families.length === 0 ? (
          <div className="pg-card pg-rise flex flex-col items-center justify-center py-16">
            <PgSeal char="谱" size={72} title="谱印" />
            <h2 className="pg-title mt-6 text-xl font-semibold">
              {isAdmin ? '开始创建您的第一个族谱' : '暂无族谱'}
            </h2>
            <p className="mt-2 mb-6 max-w-md text-center text-sm leading-7 text-muted-foreground">
              {isAdmin
                ? '族谱是记录家族传承的载体。点击下方按钮，创建属于您家族的族谱吧。'
                : '您暂未被授权访问任何族谱，请联系管理员授权，或凭族中长辈分享的邀请链接入谱。'}
            </p>
            {isAdmin && (
              <Button
                variant="apple"
                size="lg"
                onClick={() => setShowCreate(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                创建族谱
              </Button>
            )}
          </div>
        ) : (
          <div className="pg-rise flex flex-col gap-3.5">
            {families.map((family, i) => renderSlip(family, i))}
          </div>
        )}

        {/* 常用 + 今日祭日 */}
        {!isLoading && firstFamily && (
          <div className="mt-2 grid gap-4 md:grid-cols-[1.7fr_1fr] items-stretch">
            <div>
              <PgSectionHead text="常 用" right={<span className="text-xs text-muted-foreground">六处直入</span>} />
              <div className="pg-quick-grid">
                {QUICK_ITEMS.map((q) => (
                  <button key={q.title} className="pg-quick" onClick={() => navigate(q.to)}>
                    <span className="pg-quick-ic" aria-hidden="true">
                      <q.icon />
                    </span>
                    <span>
                      <span className="pg-quick-t">{q.title}</span>
                      <br />
                      <span className="pg-quick-d">{q.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <PgSectionHead text="祭 日" right={<span className="text-xs text-muted-foreground">追远</span>} />
              <div className="pg-mem-card flex-1 flex flex-col justify-center">
                <p className="pg-mem-date">{lunar?.fullStr || '农历推算中'}</p>
                <div className="pg-mem-flame" aria-hidden="true">
                  <Flame />
                </div>
                {todayMemorial && todayMemorial.count > 0 ? (
                  <>
                    <p className="pg-mem-state">今日 {todayMemorial.count} 位先祖忌日</p>
                    <p className="pg-mem-names">{todayMemorial.names.join(' · ')}</p>
                  </>
                ) : (
                  <>
                    <p className="pg-mem-state">今日无先祖忌日</p>
                    <p className="pg-mem-hint">忌日按农历自动推算，祭期前有提醒</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 祠堂动态 */}
        {!isLoading && firstFamily && (
          <div>
            <PgSectionHead
              text="祠 堂 动 态"
              right={<span className="text-xs text-muted-foreground">{firstFamily.name} · 最近三条</span>}
            />
            {firstPosts.length === 0 ? (
              <div className="pg-card py-10 text-center">
                <p className="pg-title text-sm tracking-[0.12em] text-foreground/70">祠 堂 静 悄</p>
                <p className="mt-1.5 text-xs text-muted-foreground">还没有族人发过动态，去「动态」里说点什么吧</p>
              </div>
            ) : (
              <div className="pg-feed">
                {firstPosts.map((post) => (
                  <article key={post.id} className="pg-feed-item">
                    <span className="pg-feed-ic" aria-hidden="true">
                      <Sparkles />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="pg-feed-text line-clamp-3">{post.content}</p>
                      <p className="pg-feed-meta">{firstFamily.name} · 今天</p>
                    </div>
                    <ArrowRight
                      className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform hover:translate-x-0.5"
                      onClick={() => navigate(`/family/${firstFamily.id}/feed`)}
                      aria-hidden="true"
                    />
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 尾行 */}
        {!isLoading && families.length > 0 && (
          <div className="pg-colophon mt-8">
            <b>总目</b>
            <span className="pg-colophon-sep" />
            {families.length} 部在谱 · 族人身份
            <span className="pg-colophon-sep" />
            卷帙即门径，展卷入谱
            <span className="pg-colophon-sep" />
            常用六处直入
            <span className="pg-colophon-sep" />
            祠堂动静收于总目
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false)
          setFormErrors({})
        }}
        title="创建族谱"
      >
        <form onSubmit={handleCreate} className="space-y-4" noValidate aria-label="创建族谱表单">
          <div className="space-y-2">
            <Label htmlFor="family-name">
              族谱名称 <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="family-name"
              placeholder="例如：张氏族谱"
              value={createForm.name}
              onChange={(e) => {
                setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                if (e.target.value.trim()) {
                  setFormErrors({})
                }
              }}
              onBlur={() => {
                if (!createForm.name.trim()) {
                  setFormErrors({ name: '请输入族谱名称' })
                }
              }}
              error={formErrors.name}
              aria-invalid={!!formErrors.name}
              required
              aria-required="true"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="surname">姓氏</Label>
              <Input
                id="surname"
                placeholder="张"
                value={createForm.surname}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, surname: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin">籍贯</Label>
              <Input
                id="origin"
                placeholder="山东济南"
                value={createForm.origin}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, origin: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">简介</Label>
            <textarea
              id="desc"
              placeholder="描述这个族谱的历史和来源..."
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="flex w-full rounded-lg border-0 bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={createForm.is_public}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  is_public: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="is_public" className="cursor-pointer">
              公开族谱（允许他人查看）
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowCreate(false)
                setFormErrors({})
              }}
            >
              取消
            </Button>
            <Button type="submit" variant="apple" glow className="flex-1">
              创建
            </Button>
          </div>
        </form>
      </Modal>
      {dialog}
    </Layout>
  )
}
