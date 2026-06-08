import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, useToast, Button, Input, Label, Modal } from '@/components/ui'
import { SvgZoomPan } from '@/components/ui/SvgZoomPan'
import { api } from '@/lib/api'
import { ArrowLeft, Loader2, UserCircle2, Users } from 'lucide-react'

interface Node {
  id: number
  name: string
  gender: string
  generation: number | null
  depth: number
  is_root: boolean
}
interface Edge {
  from: number
  to: number
  rel_type: string
  is_reverse: boolean
}

const NODE_W = 70
const NODE_H = 36
const H_GAP = 14
const V_GAP = 60

const REL_LABEL: Record<string, string> = {
  parent: '父母',
  father: '父亲',
  mother: '母亲',
  spouse: '配偶',
  child: '子女',
  son: '子',
  daughter: '女',
  sibling: '兄弟姐妹',
  brother: '兄/弟',
  sister: '姐/妹',
}

const BG = 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)'

const inputClass = "mt-1 w-full rounded-md border border-amber-700/30 bg-stone-950/40 px-3 py-2 text-sm text-amber-100 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:outline-none focus:ring-1 focus:ring-amber-600/30"

export default function CousinTreePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [members, setMembers] = useState<any[]>([])
  const [data, setData] = useState<{ nodes: Node[]; edges: Edge[]; root_id: number; depth: number } | null>(null)
  const [rootId, setRootId] = useState<number | null>(null)
  const [depth, setDepth] = useState(3)
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [familySurname, setFamilySurname] = useState('')
  const [familyName, setFamilyName] = useState('')

  useEffect(() => {
    loadMembers()
    api.getFamily(familyId).then((r) => {
      setFamilySurname(r?.family?.surname || '')
      setFamilyName(r?.family?.name || '')
    }).catch(() => {})
  }, [familyId])

  useEffect(() => {
    if (rootId) load()
  }, [rootId, depth])

  async function loadMembers() {
    try {
      const data = await api.getMembers(familyId)
      const list = Array.isArray(data) ? data : data.members || []
      setMembers(list)
      if (list.length > 0 && !rootId) {
        const sorted = [...list].sort(
          (a, b) => (a.generation || 0) - (b.generation || 0)
        )
        const mid = sorted[Math.floor(sorted.length / 2)]
        setRootId(mid.id)
      }
    } catch (err: any) {
      showToast(err.message || '加载成员失败', 'error')
    }
  }

  async function load() {
    if (!rootId) return
    setLoading(true)
    try {
      const chart = await api.getCousinTree(familyId, rootId, depth)
      setData(chart)
    } catch (err: any) {
      showToast(err.message || '加载旁系图失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const viewBox = useMemo(() => {
    if (!data || data.nodes.length === 0) return '0 0 800 400'
    const byDepth: Record<number, Node[]> = {}
    for (const n of data.nodes) {
      byDepth[n.depth] = byDepth[n.depth] || []
      byDepth[n.depth].push(n)
    }
    const depths = Object.keys(byDepth).map(Number).sort((a, b) => a - b)
    const maxCount = Math.max(...Object.values(byDepth).map((a) => a.length))
    const w = depths.length * (NODE_W + H_GAP) + 200
    const h = maxCount * (NODE_H + V_GAP) + 100
    return `${-100} ${-50} ${w} ${h}`
  }, [data])

  const filteredMembers = members.filter((m) => m.name.includes(search))
  const rootMember = members.find((m) => m.id === rootId)
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
            <div className="mb-2 text-xs tracking-[0.5em] text-amber-300/60">五 服 九 族</div>
            <h1 className="font-serif text-4xl font-bold text-amber-100 sm:text-5xl">
              {titleText}·旁系图
            </h1>
            <div className="mt-3 text-sm text-amber-200/70">
              {rootMember ? `以「${rootMember.name}」为根 · 展开 {depth} 层亲缘` : '请选择根成员'}
            </div>
          </div>
        </div>

        <Card className="border-amber-700/30 bg-stone-900/50">
          {/* 工具栏 */}
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-amber-700/30 px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs text-amber-200/60">根成员</Label>
                <button
                  onClick={() => setShowPicker(true)}
                  className="mt-1 flex items-center gap-2 rounded-md border border-amber-700/30 bg-stone-950/40 px-3 py-1.5 text-sm text-amber-100 hover:border-amber-600/50"
                >
                  <UserCircle2 className="h-4 w-4 text-amber-300/60" />
                  {rootMember?.name || '选择成员'}
                </button>
              </div>
              <div>
                <Label className="text-xs text-amber-200/60">深度</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={depth}
                  onChange={(e) => setDepth(Math.min(6, Math.max(1, parseInt(e.target.value) || 3)))}
                  className="mt-1 w-20 border-amber-700/30 bg-stone-950/40 text-amber-100"
                />
              </div>
              <Button
                onClick={load}
                disabled={loading}
                size="sm"
                className="bg-amber-700/80 text-amber-50 hover:bg-amber-600"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '刷新'}
              </Button>
            </div>
            <p className="max-w-md text-right text-xs text-amber-200/50">
              旁系图按亲缘关系展开：向上查祖辈 · 向下查子嗣 · 向外查旁系
            </p>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-[500px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-amber-200/50" />
              </div>
            ) : !data || data.nodes.length === 0 ? (
              <div className="flex h-[500px] flex-col items-center justify-center gap-2 text-amber-200/40">
                <Users className="h-10 w-10 opacity-30" />
                <p className="font-serif text-sm">暂无数据</p>
              </div>
            ) : (
              <div
                className="relative h-[60vh] sm:h-[600px] overflow-hidden p-4"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(176,141,87,0.04) 24px, rgba(176,141,87,0.04) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(176,141,87,0.04) 24px, rgba(176,141,87,0.04) 25px)',
                }}
              >
                <SvgZoomPan viewBox={viewBox} className="h-full w-full">
                  {(() => {
                    const byDepth: Record<number, Node[]> = {}
                    for (const n of data.nodes) {
                      byDepth[n.depth] = byDepth[n.depth] || []
                      byDepth[n.depth].push(n)
                    }
                    for (const d of Object.keys(byDepth)) {
                      byDepth[Number(d)].sort((a, b) => a.id - b.id)
                    }
                    const posMap: Record<number, { x: number; y: number }> = {}
                    const depths = Object.keys(byDepth).map(Number).sort((a, b) => a - b)
                    for (const d of depths) {
                      const list = byDepth[d]
                      list.forEach((n, idx) => {
                        posMap[n.id] = {
                          x: d * (NODE_W + H_GAP) * 3,
                          y: idx * (NODE_H + V_GAP) - (list.length * (NODE_H + V_GAP)) / 2 + 300,
                        }
                      })
                    }
                    return (
                      <>
                        {data.edges.map((e, idx) => {
                          const from = posMap[e.from]
                          const to = posMap[e.to]
                          if (!from || !to) return null
                          return (
                            <g key={idx}>
                              <line
                                x1={from.x + NODE_W / 2}
                                y1={from.y + NODE_H / 2}
                                x2={to.x + NODE_W / 2}
                                y2={to.y + NODE_H / 2}
                                stroke="#b08d57"
                                strokeWidth={1}
                                opacity={0.7}
                                strokeDasharray={e.is_reverse ? '3 3' : ''}
                              />
                              <text
                                x={(from.x + to.x) / 2 + NODE_W / 2}
                                y={(from.y + to.y) / 2}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{ fontSize: 9, fontFamily: 'serif' }}
                                fill="rgba(245, 230, 211, 0.6)"
                              >
                                {REL_LABEL[e.rel_type] || e.rel_type}
                              </text>
                            </g>
                          )
                        })}
                        {data.nodes.map((n) => {
                          const pos = posMap[n.id]
                          if (!pos) return null
                          const isFemale = n.gender === 'female'
                          return (
                            <g
                              key={n.id}
                              transform={`translate(${pos.x}, ${pos.y})`}
                              className="cursor-pointer"
                              onClick={() => navigate(`/family/${familyId}/member/${n.id}`)}
                            >
                              <rect
                                width={NODE_W}
                                height={NODE_H}
                                rx={4}
                                fill={isFemale ? '#4a2a35' : '#1f2a3a'}
                                stroke={isFemale ? '#c08494' : '#7ba6c7'}
                                strokeWidth={n.is_root ? 3 : 1.5}
                                style={n.is_root ? { filter: 'drop-shadow(0 0 6px rgba(212,165,116,0.7))' } : {}}
                              />
                              <text
                                x={NODE_W / 2}
                                y={NODE_H / 2 + 1}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="#f5e6d3"
                                style={{ fontSize: 11, fontFamily: 'serif' }}
                              >
                                {n.name}
                              </text>
                            </g>
                          )
                        })}
                      </>
                    )
                  })()}
                </SvgZoomPan>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-amber-200/30">
          溯源九族，知所从来
        </p>
      </div>

      <Modal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        title="选择根成员"
        className="border-amber-700/40 bg-stone-900 [&_.text-foreground]:text-amber-100"
      >
        <div className="space-y-3">
          <Input
            placeholder="搜索姓名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-amber-700/30 bg-stone-950/40 text-amber-100"
          />
          <div className="max-h-80 overflow-y-auto">
            {filteredMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setRootId(m.id)
                  setShowPicker(false)
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-amber-100 hover:bg-amber-900/30"
              >
                <span className="font-serif">{m.name}</span>
                <span className="text-xs text-amber-200/40">
                  第 {m.generation || '?'} 代 · {m.gender === 'male' ? '男' : '女'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
