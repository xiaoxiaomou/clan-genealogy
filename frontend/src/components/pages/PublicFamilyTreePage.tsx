import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  TreePine, Users, Lock, Calendar, MapPin, Clock, Eye, AlertCircle,
  Shield, ExternalLink,
} from 'lucide-react'
import { api } from '@/lib/api'

export function PublicFamilyTreePage() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [infoLoading, setInfoLoading] = useState(true)

  useEffect(() => {
    api.shareLinkInfo(token!)
      .then((d) => {
        setInfo(d)
        if (!d.has_password) {
          loadData()
        } else {
          setNeedsPassword(true)
          setInfoLoading(false)
        }
      })
      .catch((e) => {
        setError(e.message || '链接无效')
        setInfoLoading(false)
      })
  }, [token])

  const loadData = async (pwd?: string) => {
    setLoading(true)
    setError(null)
    try {
      const d = await api.accessShareLink(token!, pwd)
      setData(d)
      setNeedsPassword(false)
    } catch (err: any) {
      if (err.message?.includes('密码')) {
        setNeedsPassword(true)
      } else {
        setError(err.message || '访问失败')
      }
    } finally {
      setLoading(false)
    }
  }

  if (infoLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="text-sm text-muted-foreground">加载中…</div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4 dark:bg-stone-950">
        <div className="max-w-md rounded-2xl border border-border/30 bg-background p-8 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">无法访问</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          {error.includes('失效') && (
            <p className="mt-2 text-xs text-muted-foreground/70">链接可能已过期或被撤销，请联系分享者</p>
          )}
        </div>
      </div>
    )
  }

  if (needsPassword && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4 dark:bg-stone-950">
        <div className="w-full max-w-md rounded-2xl border border-border/30 bg-background p-8 shadow-2xl">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-700/10 text-amber-700">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">需要访问密码</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {info?.label && `「${info.label}」`} 请输入访问密码
            </p>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); loadData(password) }}
            className="space-y-3"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="访问密码"
              autoFocus
              className="w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-700/40"
            />
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '验证中…' : '查看族谱'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!data) return null

  const f = data.family
  const generations = Array.from(new Set(data.members.map((m: any) => m.generation).filter(Boolean))).sort((a, b) => (a as number) - (b as number))

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* 顶栏 */}
      <header className="border-b border-amber-700/20 bg-gradient-to-b from-amber-50/80 to-stone-50/80 py-6 backdrop-blur dark:from-stone-900/80 dark:to-stone-950/80">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-500">
            <Shield className="h-3.5 w-3.5" />
            <span>只读分享 · 公开访问</span>
          </div>
          <h1 className="flex items-center gap-3 font-serif text-3xl font-bold text-foreground">
            <TreePine className="h-7 w-7 text-amber-700" />
            {f.name}
          </h1>
          {(f.surname || f.origin) && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {f.surname && <span className="font-serif">{f.surname}氏</span>}
              {f.origin && <span className="ml-3">· 源于 {f.origin}</span>}
            </p>
          )}
          {f.motto && (
            <p className="mt-3 font-serif text-sm italic text-amber-700 dark:text-amber-500">
              「{f.motto}」
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* 统计 + 介绍 */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/20 bg-background p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> 成员
            </div>
            <p className="mt-1 text-2xl font-semibold text-foreground">{data.member_count}</p>
          </div>
          <div className="rounded-xl border border-border/20 bg-background p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TreePine className="h-3.5 w-3.5" /> 世代
            </div>
            <p className="mt-1 text-2xl font-semibold text-foreground">{generations.length}</p>
          </div>
          <div className="rounded-xl border border-border/20 bg-background p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> 浏览
            </div>
            <p className="mt-1 text-2xl font-semibold text-foreground">{data.view_count}</p>
          </div>
        </div>

        {f.intro && (
          <div className="mb-6 rounded-xl border border-amber-700/20 bg-amber-50/30 p-5 dark:bg-amber-950/10">
            <h2 className="mb-2 font-serif text-sm font-semibold text-amber-700 dark:text-amber-500">
              家族简介
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{f.intro}</p>
          </div>
        )}

        {/* 成员列表（按世代分组） */}
        <div className="space-y-5">
          {generations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/30 py-12 text-center text-sm text-muted-foreground">
              暂无可显示的成员
            </div>
          ) : (
            (generations as number[]).map((g) => {
              const genMembers = data.members.filter((m: any) => m.generation === g)
              if (genMembers.length === 0) return null
              return (
                <div key={g} className="rounded-xl border border-border/20 bg-background p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-serif text-base font-semibold text-foreground">
                    <span className="rounded-md bg-amber-700/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-500">
                      第 {g} 世
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {genMembers[0]?.generation_name && `（${genMembers[0].generation_name}字辈）`}
                    </span>
                    <span className="text-xs text-muted-foreground/70">· {genMembers.length} 人</span>
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {genMembers.map((m: any) => (
                      <div
                        key={m.id}
                        className="rounded-lg border border-border/15 bg-foreground/2 p-3 transition-colors hover:bg-foreground/4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-base font-medium text-foreground">{m.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.gender === 'male' ? '♂' : m.gender === 'female' ? '♀' : '·'}
                          </span>
                        </div>
                        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {m.birth_date && (
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {m.birth_date}{m.death_date && ` — ${m.death_date}`}
                            </p>
                          )}
                          {m.birth_place && (
                            <p className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {m.birth_place}
                            </p>
                          )}
                          {!m.is_alive && (
                            <p className="text-stone-500">已故</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 底部信息 */}
        <div className="mt-10 flex flex-col items-center gap-2 border-t border-border/15 pt-6 text-center">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            分享于 {new Date(data.shared_at).toLocaleString('zh-CN')}
            {data.expires_at && (
              <span className="ml-2">· 链接将于 {new Date(data.expires_at).toLocaleDateString('zh-CN')} 失效</span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            本页面为只读视图 · 数据来自 {f.name} 家族管理员分享
          </p>
          <Link
            to="/"
            className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-foreground"
          >
            访问主站 <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </main>
    </div>
  )
}

export default PublicFamilyTreePage
