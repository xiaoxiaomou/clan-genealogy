import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui'
import { PgPageHead, PgSectionHead, PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { ArrowLeft } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'

interface Stats {
  total: number
  gender: { male: number; female: number; unknown: number }
  alive_status: { alive: number; deceased: number }
  generation: Record<string, number>
  relationships: { parent: number; spouse: number; sibling: number }
  age_groups: Record<string, { male: number; female: number }>
  branch_distribution: Array<{
    branch_id: number
    branch_name: string
    count: number
    male: number
    female: number
    alive: number
  }>
  longevity: {
    count: number
    avg_age: number
    max_age: number
    min_age: number
    male_avg: number
    female_avg: number
    top_longest: Array<{ member_id: number; name: string; gender: string; age: number; birth_year: number; death_year: number }>
  }
  birth_decades: Array<{ decade: string; count: number }>
}

/* 图表数据色（数据编码，非页面装饰；跨主题可辨） */
const C_MALE = '#7ba6c7'
const C_FEMALE = '#c08494'
const C_JADE = '#7ba17b'
const C_SLATE = '#8a8a8a'
const C_BRONZE = '#b08d57'
const C_AMBER = '#d4a574'

/* 图表套用主题令牌，浅色/暗色均成立 */
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
  padding: '8px 12px',
}
const TOOLTIP_LABEL_STYLE = { color: 'hsl(var(--foreground))', fontWeight: 600 }
const AXIS_STYLE = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
const GRID_STROKE = 'hsl(var(--border))'
const SERIES_CYCLE = [C_AMBER, C_FEMALE, C_JADE, C_BRONZE, C_SLATE, '#a37ba5']

export default function StatsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [familyName, setFamilyName] = useState('')
  const [surname, setSurname] = useState('')
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    if (!familyId) return
    load()
  }, [familyId])

  async function load() {
    setLoading(true)
    try {
      const [s, f] = await Promise.all([
        api.getFamilyStats(familyId),
        api.getFamily(familyId).catch(() => null),
      ])
      setStats(s)
      if (f?.family) {
        setFamilyName(f.family.name || '')
        setSurname(f.family.surname || '')
        setOrigin(f.family.origin || '')
      }
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    )
  }
  if (!stats) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">暂无数据</p>
        </div>
      </Layout>
    )
  }

  const genderData = [
    { name: '男', value: stats.gender.male, color: C_MALE },
    { name: '女', value: stats.gender.female, color: C_FEMALE },
    { name: '未知', value: stats.gender.unknown, color: C_SLATE },
  ]
  const aliveData = [
    { name: '在世', value: stats.alive_status.alive, color: C_JADE },
    { name: '已故', value: stats.alive_status.deceased, color: C_SLATE },
  ]
  const generationData = Object.entries(stats.generation)
    .sort(([a], [b]) => {
      const an = parseInt(a.replace(/\D/g, ''), 10)
      const bn = parseInt(b.replace(/\D/g, ''), 10)
      return an - bn
    })
    .map(([k, v]) => ({ name: k, 人数: v }))

  const pyramidData = Object.entries(stats.age_groups).map(([age, g]) => ({
    age,
    男: -g.male,
    女: g.female,
  }))

  const branchData = stats.branch_distribution.map((b) => ({
    name: b.branch_name,
    value: b.count,
  }))

  const decadeData = stats.birth_decades.map((d) => ({
    decade: d.decade,
    人数: d.count,
  }))

  const genCount = Object.keys(stats.generation).length
  const maxGen = genCount > 0
    ? Math.max(...Object.keys(stats.generation).map(k => parseInt(k.replace(/\D/g, ''), 10)).filter(n => !isNaN(n)))
    : 0
  const titleText = surname ? `${surname}氏` : (familyName || '家族')

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 pg-rise">
        <div className="mb-5 flex items-center gap-2">
          <button
            onClick={() => navigate(`/family/${familyId}/intro`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回卷首
          </button>
        </div>

        <PgPageHead
          eyebrow="谱 牒 · 丁 口"
          title={`${titleText} · 丁口图`}
          subtitle={
            <>
              {origin && <>发祥于 {origin} · </>}
              {maxGen > 0 && <>历 {maxGen} 世 · </>}
              共 {stats.total} 丁
            </>
          }
        />

        {/* 核心指标 — 四柱 */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiPillar label="总丁口" value={stats.total} />
          <KpiPillar label="在世" value={stats.alive_status.alive} accent={C_JADE} />
          <KpiPillar label="已故" value={stats.alive_status.deceased} accent={C_SLATE} />
          <KpiPillar label="世代" value={maxGen > 0 ? `${maxGen} 世` : '—'} />
        </div>

        {/* 性别 + 存殁 + 世代 */}
        <div className="mt-8">
          <PgSectionHead text="丁 口 构 成" />
          <div className="grid gap-4 md:grid-cols-3">
            <ChartCard title="男女丁口">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={genderData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                    label={(e) => `${e.name} ${e.value}`}
                    labelLine={false}
                  >
                    {genderData.map((d, i) => <Cell key={i} fill={d.color} stroke="hsl(var(--card))" />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="存殁">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={aliveData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                    label={(e) => `${e.name} ${e.value}`}
                    labelLine={false}
                  >
                    {aliveData.map((d, i) => <Cell key={i} fill={d.color} stroke="hsl(var(--card))" />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="世代分布">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={generationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} />
                  <YAxis tick={AXIS_STYLE} allowDecimals={false} axisLine={{ stroke: GRID_STROKE }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: 'hsl(var(--muted) / .4)' }} />
                  <Bar dataKey="人数" fill={C_BRONZE} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* 人口金字塔 */}
        <div className="mt-8">
          <PgSectionHead text="年 齿 金 锥" />
          <ChartCard title="按年龄段 × 性别">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pyramidData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis type="number" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} />
                <YAxis dataKey="age" type="category" tick={AXIS_STYLE} width={50} axisLine={{ stroke: GRID_STROKE }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  cursor={{ fill: 'hsl(var(--muted) / .4)' }}
                  formatter={(v: any) => Math.abs(Number(v))}
                />
                <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Bar dataKey="男" fill={C_MALE} stackId="a" />
                <Bar dataKey="女" fill={C_FEMALE} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">横轴负值表示男性人数（取绝对值）</p>
          </ChartCard>
        </div>

        {/* 分支 + 出生年代 */}
        <div className="mt-8">
          <PgSectionHead text="支 系 与 生 息" />
          <div className="grid gap-4 md:grid-cols-2">
            <ChartCard title="房支分布">
              {branchData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">暂无分支数据</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={branchData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={80}
                      label={(e) => `${e.name} ${e.value}`}
                      labelLine={false}
                    >
                      {branchData.map((_, i) => (
                        <Cell key={i} fill={SERIES_CYCLE[i % SERIES_CYCLE.length]} stroke="hsl(var(--card))" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="生年分布">
              {decadeData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">暂无出生日期数据</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={decadeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="decade" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} />
                    <YAxis tick={AXIS_STYLE} allowDecimals={false} axisLine={{ stroke: GRID_STROKE }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ stroke: GRID_STROKE }} />
                    <Line type="monotone" dataKey="人数" stroke={C_AMBER} strokeWidth={2} dot={{ r: 4, fill: C_AMBER }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>

        {/* 长寿榜 */}
        <div className="mt-8">
          <PgSectionHead text="寿 星 榜" />
          <div className="pg-card p-5">
            <div className="mb-4 grid gap-2 grid-cols-2 sm:grid-cols-4">
              <SmallStat label="统计样本" value={stats.longevity.count} />
              <SmallStat label="平均寿" value={`${stats.longevity.avg_age} 岁`} />
              <SmallStat label="男 / 女 均" value={`${stats.longevity.male_avg} / ${stats.longevity.female_avg}`} />
              <SmallStat label="最长" value={`${stats.longevity.max_age} 岁`} highlight />
            </div>
            {stats.longevity.top_longest.length > 0 ? (
              <ol className="space-y-1.5">
                {stats.longevity.top_longest.map((p, i) => (
                  <li
                    key={p.member_id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                    style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / .3)' }}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="pg-seal pg-seal-sm"
                        style={{
                          width: 28, height: 28, fontSize: 13,
                          opacity: i === 0 ? 1 : i === 1 ? 0.85 : i === 2 ? 0.75 : 0.6,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-base" style={{ fontFamily: PG_SERIF }}>{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.birth_year}–{p.death_year}</span>
                    </span>
                    <span className="text-base font-semibold" style={{ fontFamily: PG_SERIF, color: PG_RED }}>{p.age} 岁</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">尚无完整生卒记录</p>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground" style={{ fontFamily: PG_SERIF, letterSpacing: '0.3em' }}>
          愿家族昌盛 · 子孙兴旺
        </p>
      </div>
    </Layout>
  )
}

function KpiPillar({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="pg-card p-4 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="pg-title mt-2 text-3xl font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  )
}

function SmallStat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border px-3 py-2 text-center" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / .3)' }}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="pg-title text-lg font-semibold" style={highlight ? { color: PG_RED } : undefined}>{value}</div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pg-card p-5">
      <h3 className="pg-title mb-4 text-sm text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}
