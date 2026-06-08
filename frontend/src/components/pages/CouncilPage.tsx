import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, useToast, AvatarDisplay } from '@/components/ui'
import { api } from '@/lib/api'
import { ArrowLeft, Crown, Shield, Edit3, Eye, Trophy, Medal, Users } from 'lucide-react'

interface CouncilData {
  family: any
  roles: {
    owner: any[]
    admin: any[]
    editor: any[]
    viewer: any[]
  }
  contributors: Array<{ user_id: number; display_name: string; username: string; avatar: string | null; action_count: number }>
  stats: {
    total_members: number
    male: number
    female: number
    alive: number
    generations: number
    honors: number
  }
}

const ROLE_META: Record<string, { label: string; sub: string; icon: any; accent: string }> = {
  owner: { label: '族主', sub: '统摄全族', icon: Crown, accent: '#d4a574' },
  admin: { label: '理事', sub: '协理族务', icon: Shield, accent: '#7ba6c7' },
  editor: { label: '编辑', sub: '录牒修谱', icon: Edit3, accent: '#7ba17b' },
  viewer: { label: '族人', sub: '参议族事', icon: Eye, accent: '#a8a29e' },
}

const BG = 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)'

export default function CouncilPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [data, setData] = useState<CouncilData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [familyId])

  async function load() {
    setLoading(true)
    try {
      const d = await api.getCouncil(familyId)
      setData(d)
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: BG }}>
        <p className="text-amber-100">清点候...</p>
      </div>
    )
  }

  const surname = data.family?.surname || ''
  const familyName = data.family?.name || ''
  const titleText = surname ? `${surname}氏` : (familyName || '本族')
  const totalPeople = Object.values(data.roles).reduce((s: number, l: any) => s + (Array.isArray(l) ? l.length : 0), 0)

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: BG }}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2 text-amber-100">
          <button
            onClick={() => navigate(`/family/${familyId}`)}
            className="flex items-center gap-1 text-sm hover:text-amber-300"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
        </div>

        {/* 匾额 */}
        <div className="relative overflow-hidden rounded-lg border-2 border-amber-700/40 bg-gradient-to-br from-amber-900/40 to-stone-900/60 p-8 text-center shadow-2xl">
          <div className="absolute inset-0 opacity-20" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(245, 230, 211, 0.1) 10px, rgba(245, 230, 211, 0.1) 11px)',
          }} />
          <div className="relative">
            <div className="mb-2 text-xs tracking-[0.5em] text-amber-300/60">族 委 会 · 理 事 会</div>
            <h1 className="font-serif text-5xl font-bold text-amber-100">
              {titleText}·族政
            </h1>
            <div className="mt-3 text-sm text-amber-200/70">
              {totalPeople} 位族人共理族务
            </div>
          </div>
        </div>

        {/* 家族概况 — 四柱 */}
        <Card className="border-amber-700/30 bg-stone-900/50">
          <CardContent className="p-6">
            <h2 className="mb-4 font-serif text-lg text-amber-200">家族概况</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Pillar label="丁口" value={data.stats.total_members} accent="#d4a574" />
              <Pillar label="在世" value={data.stats.alive} accent="#7ba17b" />
              <Pillar label="世代" value={data.stats.generations} accent="#7ba6c7" />
              <Pillar label="荣光" value={data.stats.honors} accent="#c08494" />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-amber-200/50">
              <span>男：<span className="text-amber-100">{data.stats.male}</span></span>
              <span>女：<span className="text-amber-100">{data.stats.female}</span></span>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 角色分工 — 古风官职榜 */}
          <Card className="border-amber-700/30 bg-stone-900/50">
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-2 font-serif text-lg text-amber-200">
                <Users className="h-4 w-4" />
                人员分工
              </h2>
              <div className="space-y-5">
                {Object.entries(ROLE_META).map(([key, meta]) => {
                  const Icon = meta.icon
                  const list = (data.roles as any)[key] || []
                  return (
                    <div key={key}>
                      <h3
                        className="mb-2 flex items-center gap-2 font-serif text-sm"
                        style={{ color: meta.accent }}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-semibold">{meta.label}</span>
                        <span className="text-xs opacity-60">· {meta.sub}</span>
                        <span className="ml-auto text-xs text-amber-200/40">({list.length})</span>
                      </h3>
                      {list.length === 0 ? (
                        <p className="text-xs italic text-amber-200/30 pl-6">— 空缺 —</p>
                      ) : (
                        <div className="space-y-1.5 pl-6">
                          {list.map((u: any) => (
                            <div key={u.user_id} className="flex items-center gap-2 text-sm text-amber-100">
                              <AvatarDisplay avatar={u.avatar} name={u.display_name || u.username} size={26} />
                              <span className="font-serif">{u.display_name || u.username}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 贡献者排行 — 科举榜 */}
          <Card className="border-amber-700/30 bg-stone-900/50">
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-2 font-serif text-lg text-amber-200">
                <Trophy className="h-4 w-4" style={{ color: '#d4a574' }} />
                贡献榜
              </h2>
              {data.contributors.length === 0 ? (
                <p className="text-sm italic text-amber-200/30">尚无记录</p>
              ) : (
                <div className="space-y-2">
                  {data.contributors.map((c, idx) => {
                    const isTop3 = idx < 3
                    return (
                      <div
                        key={c.user_id}
                        className="flex items-center gap-3 rounded border border-amber-700/20 bg-stone-950/30 px-3 py-2"
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif text-sm ${
                            idx === 0 ? 'bg-amber-200/90 text-amber-900 shadow-lg' :
                            idx === 1 ? 'bg-stone-300/80 text-stone-800' :
                            idx === 2 ? 'bg-amber-700/80 text-amber-50' :
                            'bg-stone-700/60 text-amber-100/70'
                          }`}
                          style={idx === 0 ? { boxShadow: '0 0 12px rgba(212,165,116,0.4)' } : {}}
                        >
                          {isTop3 ? <Medal className="h-4 w-4" /> : idx + 1}
                        </div>
                        <AvatarDisplay
                          avatar={c.avatar}
                          name={c.display_name || c.username}
                          size={30}
                        />
                        <div className="flex-1">
                          <div className="font-serif text-sm text-amber-100">
                            {c.display_name || c.username}
                          </div>
                          <div className="text-xs text-amber-200/50">{c.action_count} 次操作</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-amber-200/30">
          众志成城，族务共襄
        </p>
      </div>
    </div>
  )
}

function Pillar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-amber-700/30 bg-stone-950/40 p-3 text-center">
      <div className="font-serif text-3xl font-bold" style={{ color: accent }}>{value}</div>
      <div className="mt-1 text-xs text-amber-200/60">{label}</div>
    </div>
  )
}
