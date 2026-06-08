import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, useToast } from '@/components/ui'
import { SvgZoomPan } from '@/components/ui/SvgZoomPan'
import { api } from '@/lib/api'
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw, Loader2, GitBranch } from 'lucide-react'

type Style = 'ou' | 'su' | 'baota'

interface Node {
  id: number
  name: string
  gender: string
  is_alive: boolean
  generation: number
  birth_year?: number | null
  death_year?: number | null
  x: number
  y: number
  depth?: number
  is_root?: boolean
}

interface Edge {
  from: number
  to: number
  rel_type?: string
  is_reverse?: boolean
}

const NODE_W = 80
const NODE_H = 40
const H_GAP = 30
const V_GAP = 70

const BG = 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)'
const STYLE_META: Record<Style, { label: string; sub: string }> = {
  ou: { label: '欧式', sub: '始祖居上，子嗣垂直向下' },
  su: { label: '苏式', sub: '始祖居中，子嗣左右横展' },
  baota: { label: '宝塔式', sub: '始祖居中，左右镜像对称' },
}

export default function LineageChartPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [style, setStyle] = useState<Style>('ou')
  const [data, setData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [familySurname, setFamilySurname] = useState('')
  const [familyName, setFamilyName] = useState('')

  useEffect(() => {
    if (familyId) {
      load()
      api.getFamily(familyId).then((r) => {
        setFamilySurname(r?.family?.surname || '')
        setFamilyName(r?.family?.name || '')
      }).catch(() => {})
    }
  }, [familyId, style])

  async function load() {
    setLoading(true)
    try {
      const chart = await api.getLineageChart(familyId, style)
      setData(chart)
    } catch (err: any) {
      showToast(err.message || '加载世系图失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const viewBox = useMemo(() => {
    if (!data || data.nodes.length === 0) return '0 0 800 400'
    const xs = data.nodes.map((n) => n.x)
    const ys = data.nodes.map((n) => n.y)
    const minX = Math.min(...xs) - 1
    const maxX = Math.max(...xs) + 1
    const minY = Math.min(...ys) - 1
    const maxY = Math.max(...ys) + 1
    const w = (maxX - minX) * (NODE_W + H_GAP)
    const h = (maxY - minY) * (NODE_H + V_GAP)
    return `${minX * (NODE_W + H_GAP) - NODE_W / 2} ${minY * (NODE_H + V_GAP) - NODE_H / 2} ${w} ${h}`
  }, [data])

  function resetView() {
    setZoom(1)
  }

  const titleText = familySurname ? `${familySurname}氏` : (familyName || '本族')

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: BG }}>
      <div className="mx-auto max-w-7xl space-y-6">
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
        <div className="relative overflow-hidden rounded-lg border-2 border-amber-700/40 bg-gradient-to-br from-amber-900/40 to-stone-900/60 p-6 text-center shadow-2xl sm:p-8">
          <div className="absolute inset-0 opacity-20" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(245, 230, 211, 0.1) 10px, rgba(245, 230, 211, 0.1) 11px)',
          }} />
          <div className="relative">
            <div className="mb-2 text-xs tracking-[0.5em] text-amber-300/60">世 系 全 图</div>
            <h1 className="font-serif text-4xl font-bold text-amber-100 sm:text-5xl">
              {titleText}·世系图
            </h1>
            <div className="mt-3 text-sm text-amber-200/70">
              {STYLE_META[style].sub}
            </div>
          </div>
        </div>

        <Card className="border-amber-700/30 bg-stone-900/50">
          {/* 工具栏 */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-700/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-200/60">样式：</span>
              <div className="flex overflow-hidden rounded border border-amber-700/30">
                {(['ou', 'su', 'baota'] as Style[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`px-3 py-1 text-xs transition-colors ${
                      style === s
                        ? 'bg-amber-700/60 text-amber-50'
                        : 'text-amber-200/60 hover:bg-amber-900/30 hover:text-amber-100'
                    }`}
                  >
                    {STYLE_META[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden items-center gap-1 sm:flex">
              <span className="min-w-[3rem] text-center font-mono text-xs text-amber-200/60">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={resetView}
                className="ml-1 rounded border border-amber-700/30 p-1.5 text-amber-200/70 hover:bg-amber-900/30 hover:text-amber-100"
                title="重置视图"
                aria-label="重置视图"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-[500px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-amber-200/50" />
              </div>
            ) : !data || data.nodes.length === 0 ? (
              <div className="flex h-[500px] flex-col items-center justify-center gap-2 text-amber-200/40">
                <GitBranch className="h-10 w-10 opacity-30" />
                <p className="font-serif text-sm">暂无成员数据</p>
              </div>
            ) : (
              <div
                className="relative h-[60vh] sm:h-[600px] overflow-hidden"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(176,141,87,0.04) 24px, rgba(176,141,87,0.04) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(176,141,87,0.04) 24px, rgba(176,141,87,0.04) 25px)',
                }}
              >
                <SvgZoomPan
                  viewBox={viewBox}
                  onZoomChange={setZoom}
                  className="h-full w-full"
                >
                  {/* 边 */}
                  {data.edges.map((e, idx) => {
                    const from = data.nodes.find((n) => n.id === e.from)
                    const to = data.nodes.find((n) => n.id === e.to)
                    if (!from || !to) return null
                    const x1 = from.x * (NODE_W + H_GAP)
                    const y1 = from.y * (NODE_H + V_GAP)
                    const x2 = to.x * (NODE_W + H_GAP)
                    const y2 = to.y * (NODE_H + V_GAP)
                    if (style === 'ou') {
                      const midY = (y1 + y2) / 2
                      return (
                        <path
                          key={idx}
                          d={`M ${x1} ${y1 + NODE_H / 2} C ${x1} ${midY} ${x2} ${midY} ${x2} ${y2 - NODE_H / 2}`}
                          fill="none"
                          stroke="#b08d57"
                          strokeWidth={1.2}
                          opacity={0.7}
                        />
                      )
                    }
                    const midX = (x1 + x2) / 2
                    return (
                      <path
                        key={idx}
                        d={`M ${x1 + NODE_W / 2} ${y1} C ${midX} ${y1} ${midX} ${y2} ${x2 + NODE_W / 2} ${y2}`}
                        fill="none"
                        stroke="#b08d57"
                        strokeWidth={1.2}
                        opacity={0.7}
                      />
                    )
                  })}
                  {/* 节点 */}
                  {data.nodes.map((n) => {
                    const x = n.x * (NODE_W + H_GAP) - NODE_W / 2
                    const y = n.y * (NODE_H + V_GAP) - NODE_H / 2
                    const isFemale = n.gender === 'female'
                    return (
                      <g
                        key={n.id}
                        transform={`translate(${x}, ${y})`}
                        className="cursor-pointer"
                        onClick={() => navigate(`/family/${familyId}/member/${n.id}`)}
                      >
                        <rect
                          width={NODE_W}
                          height={NODE_H}
                          rx={4}
                          fill={isFemale ? '#4a2a35' : '#1f2a3a'}
                          stroke={isFemale ? '#c08494' : '#7ba6c7'}
                          strokeWidth={1.5}
                          opacity={n.is_alive ? 1 : 0.45}
                        />
                        <text
                          x={NODE_W / 2}
                          y={NODE_H / 2 - 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#f5e6d3"
                          style={{ fontSize: 12, fontFamily: 'serif' }}
                        >
                          {n.name}
                        </text>
                        <text
                          x={NODE_W / 2}
                          y={NODE_H / 2 + 12}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="rgba(245, 230, 211, 0.5)"
                          style={{ fontSize: 9 }}
                        >
                          第{n.generation || '?'}代
                        </text>
                      </g>
                    )
                  })}
                </SvgZoomPan>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between px-2 text-xs text-amber-200/50">
          <p>共 {data?.nodes.length || 0} 位成员，{data?.edges.length || 0} 段父子连线。点击成员进入详情。</p>
          <p className="text-amber-200/30">可拖拽平移 · 滚轮缩放</p>
        </div>
      </div>
    </div>
  )
}
