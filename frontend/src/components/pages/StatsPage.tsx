import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardContent, useToast } from '@/components/ui'
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import {
  ArrowLeft, Users, UserCheck, UserX, Baby, Heart, TrendingUp,
  Crown, Sparkles, Clock, ChevronUp,
} from 'lucide-react'

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

const AMBER = '#d4a574'
const ROSE = '#c08494'
const JADE = '#7ba17b'
const SLATE = '#8a8a8a'
const BRONZE = '#b08d57'

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(28, 20, 16, 0.96)',
  border: '1px solid rgba(176, 141, 87, 0.4)',
  borderRadius: 6,
  color: '#f5e6d3',
  fontSize: 12,
  padding: '8px 12px',
}
const TOOLTIP_LABEL_STYLE = { color: '#d4a574', fontWeight: 600 }
const AXIS_STYLE = { fontSize: 11, fill: 'rgba(245, 230, 211, 0.55)' }
const GRID_STROKE = 'rgba(176, 141, 87, 0.15)'

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
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)' }}
      >
        <p className="text-amber-100">执卷候...</p>
      </div>
    )
  }
  if (!stats) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)' }}
      >
        <p className="text-amber-100">暂无数据</p>
      </div>
    )
  }

  const genderData = [
    { name: '男', value: stats.gender.male, color: '#7ba6c7' },
    { name: '女', value: stats.gender.female, color: '#c08494' },
    { name: '未知', value: stats.gender.unknown, color: '#8a8a8a' },
  ]
  const aliveData = [
    { name: '在世', value: stats.alive_status.alive, color: '#7ba17b' },
    { name: '已故', value: stats.alive_status.deceased, color: '#8a8a8a' },
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
    <div
      className="min-h-screen p-4 sm:p-8"
      style={{
        background: 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)',
      }}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-2 text-amber-100">
          <button
            onClick={() => navigate(`/family/${familyId}/intro`)}
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
            <div className="mb-2 text-xs tracking-[0.5em] text-amber-300/60">族 谱 数 据</div>
            <h1 className="font-serif text-5xl font-bold text-amber-100">
              {titleText}·丁口图
            </h1>
            <div className="mt-3 text-sm text-amber-200/70">
              {origin && <>发祥于 {origin} · </>}
              {maxGen > 0 && <>历 {maxGen} 世 · </>}
              共 {stats.total} 丁
            </div>
          </div>
        </div>

        {/* 核心指标 — 四柱 */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiPillar
            icon={<Users className="h-4 w-4" />}
            label="总丁口"
            value={stats.total}
            color={AMBER}
          />
          <KpiPillar
            icon={<UserCheck className="h-4 w-4" />}
            label="在世"
            value={stats.alive_status.alive}
            color={JADE}
          />
          <KpiPillar
            icon={<UserX className="h-4 w-4" />}
            label="已故"
            value={stats.alive_status.deceased}
            color={SLATE}
          />
          <KpiPillar
            icon={<Crown className="h-4 w-4" />}
            label="世代"
            value={`${maxGen} 世`}
            color={BRONZE}
          />
        </div>

        {/* 性别 + 在世 + 世代 */}
        <div className="grid gap-4 md:grid-cols-3">
          <AncientCard title="男女丁口" icon={<Baby className="h-4 w-4" />} color={ROSE}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={genderData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                  label={(e) => `${e.name} ${e.value}`}
                  labelLine={false}
                >
                  {genderData.map((d, i) => <Cell key={i} fill={d.color} stroke="rgba(245,230,211,0.15)" />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </AncientCard>

          <AncientCard title="存殁" icon={<Heart className="h-4 w-4" />} color={JADE}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={aliveData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                  label={(e) => `${e.name} ${e.value}`}
                  labelLine={false}
                >
                  {aliveData.map((d, i) => <Cell key={i} fill={d.color} stroke="rgba(245,230,211,0.15)" />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </AncientCard>

          <AncientCard title="世代分布" icon={<TrendingUp className="h-4 w-4" />} color={BRONZE}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={generationData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} />
                <YAxis tick={AXIS_STYLE} allowDecimals={false} axisLine={{ stroke: GRID_STROKE }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ fill: 'rgba(176,141,87,0.08)' }} />
                <Bar dataKey="人数" fill={BRONZE} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AncientCard>
        </div>

        {/* 人口金字塔 */}
        <AncientCard title="丁口金锥（按年龄段 × 性别）" icon={<Users className="h-4 w-4" />} color={AMBER}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pyramidData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} />
              <YAxis dataKey="age" type="category" tick={AXIS_STYLE} width={50} axisLine={{ stroke: GRID_STROKE }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL_STYLE}
                cursor={{ fill: 'rgba(176,141,87,0.08)' }}
                formatter={(v: any) => Math.abs(Number(v))}
              />
              <Legend wrapperStyle={{ color: '#d4a574', fontSize: 12 }} />
              <Bar dataKey="男" fill="#7ba6c7" stackId="a" />
              <Bar dataKey="女" fill={ROSE} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-center text-[11px] text-amber-200/40">横轴负值表示男性人数（取绝对值）</p>
        </AncientCard>

        {/* 分支 + 出生年代 */}
        <div className="grid gap-4 md:grid-cols-2">
          <AncientCard title="房支分布" icon={<Sparkles className="h-4 w-4" />} color={BRONZE}>
            {branchData.length === 0 ? (
              <p className="py-10 text-center text-sm text-amber-200/40">暂无分支数据</p>
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
                      <Cell key={i} fill={[AMBER, ROSE, JADE, BRONZE, SLATE, '#a37ba5'][i % 6]} stroke="rgba(245,230,211,0.15)" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </AncientCard>

          <AncientCard title="生年分布" icon={<Clock className="h-4 w-4" />} color={JADE}>
            {decadeData.length === 0 ? (
              <p className="py-10 text-center text-sm text-amber-200/40">暂无出生日期数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={decadeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="decade" tick={AXIS_STYLE} axisLine={{ stroke: GRID_STROKE }} />
                  <YAxis tick={AXIS_STYLE} allowDecimals={false} axisLine={{ stroke: GRID_STROKE }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ stroke: GRID_STROKE }} />
                  <Line type="monotone" dataKey="人数" stroke={AMBER} strokeWidth={2} dot={{ r: 4, fill: AMBER }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </AncientCard>
        </div>

        {/* 长寿榜 */}
        <AncientCard title="寿星榜" icon={<Heart className="h-4 w-4" />} color={ROSE}>
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
                  className="flex items-center justify-between rounded border border-amber-700/30 bg-stone-950/40 px-3 py-2"
                >
                  <span className="flex items-center gap-3">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-serif text-sm ${
                      i === 0 ? 'bg-amber-200/90 text-amber-900' :
                      i === 1 ? 'bg-stone-300/80 text-stone-800' :
                      i === 2 ? 'bg-amber-700/80 text-amber-50' :
                      'bg-stone-700/60 text-amber-100/80'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="font-serif text-base text-amber-100">{p.name}</span>
                    <span className="text-xs text-amber-200/50">{p.birth_year}–{p.death_year}</span>
                  </span>
                  <span className="font-serif text-base font-semibold text-rose-300">{p.age} 岁</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-6 text-center text-sm text-amber-200/40">尚无完整生卒记录</p>
          )}
        </AncientCard>

        <p className="text-center text-xs text-amber-200/30">
          愿家族昌盛，子孙兴旺
        </p>
      </div>
    </div>
  )
}

function KpiPillar({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div
      className="rounded-lg border border-amber-700/30 bg-stone-900/50 p-4 text-center shadow-sm"
    >
      <div className="flex items-center justify-center gap-1.5 text-xs text-amber-200/60">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 font-serif text-3xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

function SmallStat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="rounded border border-amber-700/20 bg-stone-950/30 px-3 py-2 text-center">
      <div className="text-[11px] text-amber-200/50">{label}</div>
      <div className={`font-serif text-lg font-semibold ${highlight ? 'text-rose-300' : 'text-amber-100'}`}>{value}</div>
    </div>
  )
}

function AncientCard({ title, icon, color, children }: { title: string; icon?: React.ReactNode; color?: string; children: React.ReactNode }) {
  return (
    <Card className="border-amber-700/30 bg-stone-900/50">
      <CardContent className="p-5">
        <h3
          className="mb-4 flex items-center gap-2 font-serif text-base"
          style={{ color: color || AMBER }}
        >
          {icon}
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  )
}
