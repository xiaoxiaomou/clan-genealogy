import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast, AvatarDisplay } from '@/components/ui'
import { PgPageHead, PgSectionHead, PgSeal, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { api } from '@/lib/api'
import { smartBack } from '@/lib/smartBack'
import { ArrowLeft, Crown, Shield, Edit3, Eye } from 'lucide-react'

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

const ROLE_META: Record<string, { label: string; sub: string; icon: any }> = {
  owner: { label: '族主', sub: '统摄全族', icon: Crown },
  admin: { label: '理事', sub: '协理族务', icon: Shield },
  editor: { label: '编辑', sub: '录牒修谱', icon: Edit3 },
  viewer: { label: '族人', sub: '参议族事', icon: Eye },
}

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
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    )
  }

  const surname = data.family?.surname || ''
  const familyName = data.family?.name || ''
  const titleText = surname ? `${surname}氏` : (familyName || '本族')
  const totalPeople = Object.values(data.roles).reduce((s: number, l: any) => s + (Array.isArray(l) ? l.length : 0), 0)

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 pg-rise">
        <div className="flex items-center gap-2">
          <button
            onClick={() => smartBack(navigate, `/family/${familyId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回族谱
          </button>
        </div>

        <PgPageHead
          eyebrow="谱 牒 · 族 政"
          title={`${titleText}·族政`}
          subtitle={`${totalPeople} 位族人共理族务`}
          actions={<PgSeal char="议" size={56} title="家族议事" />}
        />

        {/* 家族概况 — 四柱 */}
        <div>
          <PgSectionHead text="家 族 概 况" />
          <div className="pg-card p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Pillar label="丁口" value={data.stats.total_members} />
              <Pillar label="在世" value={data.stats.alive} />
              <Pillar label="世代" value={data.stats.generations} />
              <Pillar label="荣光" value={data.stats.honors} />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>男 <b className="font-medium text-foreground">{data.stats.male}</b></span>
              <span>女 <b className="font-medium text-foreground">{data.stats.female}</b></span>
            </div>
          </div>
        </div>

        <PgSectionHead text="族 务 分 工" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 人员分工 */}
          <div className="pg-card p-6">
            <h3 className="pg-title mb-4 text-sm text-muted-foreground">人员分工</h3>
            <div className="space-y-5">
              {Object.entries(ROLE_META).map(([key, meta]) => {
                const Icon = meta.icon
                const list = (data.roles as any)[key] || []
                return (
                  <div key={key}>
                    <h4 className="mb-2 flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span className="font-semibold" style={{ fontFamily: PG_SERIF, letterSpacing: '0.08em' }}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-muted-foreground">· {meta.sub}</span>
                      <span className="ml-auto text-xs text-muted-foreground">({list.length})</span>
                    </h4>
                    {list.length === 0 ? (
                      <p className="pl-6 text-xs italic text-muted-foreground">— 空缺 —</p>
                    ) : (
                      <div className="space-y-1.5 pl-6">
                        {list.map((u: any) => (
                          <div key={u.user_id} className="flex items-center gap-2 text-sm">
                            <AvatarDisplay avatar={u.avatar} name={u.display_name || u.username} size={26} />
                            <span style={{ fontFamily: PG_SERIF }}>{u.display_name || u.username}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 贡献榜：名次以朱印为记 */}
          <div className="pg-card p-6">
            <h3 className="pg-title mb-4 text-sm text-muted-foreground">贡献榜</h3>
            {data.contributors.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">尚无修谱记录，族务待众人共襄</p>
            ) : (
              <div className="space-y-2">
                {data.contributors.map((c, idx) => (
                  <div
                    key={c.user_id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / .3)' }}
                  >
                    <span
                      className="pg-seal pg-seal-sm"
                      style={{
                        width: 28,
                        height: 28,
                        fontSize: 13,
                        opacity: idx === 0 ? 1 : idx === 1 ? 0.85 : idx === 2 ? 0.75 : 0.6,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <AvatarDisplay
                      avatar={c.avatar}
                      name={c.display_name || c.username}
                      size={30}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm" style={{ fontFamily: PG_SERIF }}>
                        {c.display_name || c.username}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.action_count} 次操作</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p
          className="text-center text-xs text-muted-foreground"
          style={{ fontFamily: PG_SERIF, letterSpacing: '0.3em' }}
        >
          众志成城 · 族务共襄
        </p>
      </div>
    </Layout>
  )
}

function Pillar({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-lg border px-3 py-3 text-center"
      style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / .3)' }}
    >
      <div className="pg-title text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
