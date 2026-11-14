import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui'
import { MemberTooltip } from '@/components/tree-engine/nodes/MemberTooltip'
import type { TreeNode } from '@/types'
import { PgPageHead, PgColophon } from '@/components/ui/pedigree'
import { SvgZoomPan } from '@/components/ui/SvgZoomPan'
import { Layout } from '@/components/layout/Layout'
import { api } from '@/lib/api'
import { ArrowLeft, RotateCcw, Loader2, GitBranch } from 'lucide-react'

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
  const [hovered, setHovered] = useState<{ node: Node; x: number; y: number } | null>(null)

  /** 世系图节点字段精简，映射为 TreeNode 供名帖浮层使用 */
  function toTreeNode(n: Node): TreeNode {
    return {
      id: n.id,
      name: n.name,
      gender: n.gender,
      generation: n.generation,
      is_alive: n.is_alive,
      birth_date: n.birth_year ? String(n.birth_year) : null,
      death_date: n.death_year ? String(n.death_year) : null,
    } as TreeNode
  }
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
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 pg-rise">
        <div className="mb-5">
          <button
            onClick={() => navigate(`/family/${familyId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
        </div>

        <PgPageHead
          eyebrow="谱 牒 · 世 系"
          title={`${titleText} · 世系图`}
          subtitle={STYLE_META[style].sub}
        />

        <div className="mt-6 space-y-6">
          <div className="pg-card">
            {/* 工具栏 */}
            <div
              className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
              style={{ borderColor: 'hsl(var(--border))' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">样式</span>
                <div className="flex overflow-hidden rounded-md border" style={{ borderColor: 'hsl(var(--border))' }}>
                  {(['ou', 'su', 'baota'] as Style[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`px-3 py-1 text-xs transition-colors ${
                        style === s
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {STYLE_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                <span className="min-w-[3rem] text-center font-mono text-xs text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={resetView}
                  className="ml-1 rounded border p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  style={{ borderColor: 'hsl(var(--border))' }}
                  title="重置视图"
                  aria-label="重置视图"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-0">
              {loading ? (
                <div className="flex h-[500px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !data || data.nodes.length === 0 ? (
                <div className="flex h-[500px] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <GitBranch className="h-10 w-10 opacity-30" />
                  <p className="text-sm">暂无成员数据</p>
                </div>
              ) : (
                <div
                  className="relative h-[60vh] overflow-hidden sm:h-[600px]"
                  style={{ background: 'hsl(var(--muted) / .25)' }}
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
                          onMouseEnter={(e) => setHovered({ node: n, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHovered(null)}
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
              {hovered && (
                <MemberTooltip
                  member={toTreeNode(hovered.node)}
                  mouseX={hovered.x}
                  mouseY={hovered.y}
                  containerRect={null}
                />
              )}
            </div>
          </div>

          <div className="pg-card px-5 py-4">
            <PgColophon
              items={[
                ['入图成员', `${data?.nodes.length || 0} 位`],
                ['父子连线', `${data?.edges.length || 0} 段`],
                ['操作', '点击成员进入详情 · 拖拽平移 · 滚轮缩放'],
              ]}
            />
          </div>
        </div>
      </div>
    </Layout>
  )
}
