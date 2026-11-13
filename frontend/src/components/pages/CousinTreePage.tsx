import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Input, Label, Modal, useToast } from '@/components/ui'
import { PgPageHead, PG_SERIF } from '@/components/ui/pedigree'
import { SvgZoomPan } from '@/components/ui/SvgZoomPan'
import { Layout } from '@/components/layout/Layout'
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
          eyebrow="谱 牒 · 旁 系"
          title={`${titleText} · 旁系图`}
          subtitle={rootMember ? `以「${rootMember.name}」为根 · 展开 ${depth} 层亲缘` : '请选择根成员'}
        />

        <div className="mt-6 space-y-6">
          <div className="pg-card">
            {/* 工具栏 */}
            <div
              className="flex flex-wrap items-end justify-between gap-3 border-b px-4 py-3"
              style={{ borderColor: 'hsl(var(--border))' }}
            >
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">根成员</Label>
                  <button
                    onClick={() => setShowPicker(true)}
                    className="mt-1 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  >
                    <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                    {rootMember?.name || '选择成员'}
                  </button>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">深度</Label>
                  <Input
                    type="number"
                    min={1}
                    max={6}
                    value={depth}
                    onChange={(e) => setDepth(Math.min(6, Math.max(1, parseInt(e.target.value) || 3)))}
                    className="mt-1 w-20"
                  />
                </div>
                <Button
                  onClick={load}
                  disabled={loading}
                  size="sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '刷新'}
                </Button>
              </div>
              <p className="max-w-md text-right text-xs text-muted-foreground">
                旁系图按亲缘关系展开：向上查祖辈 · 向下查子嗣 · 向外查旁系
              </p>
            </div>

            <div className="p-0">
              {loading ? (
                <div className="flex h-[500px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !data || data.nodes.length === 0 ? (
                <div className="flex h-[500px] flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Users className="h-10 w-10 opacity-30" />
                  <p className="text-sm" style={{ fontFamily: PG_SERIF }}>暂无数据</p>
                </div>
              ) : (
                <div
                  className="relative h-[60vh] overflow-hidden p-4 sm:h-[600px]"
                  style={{ background: 'hsl(var(--muted) / .25)' }}
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
                                  fill="hsl(var(--muted-foreground))"
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
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground" style={{ fontFamily: PG_SERIF, letterSpacing: '0.3em' }}>
            溯源九族 · 知所从来
          </p>
        </div>

        <Modal
          isOpen={showPicker}
          onClose={() => setShowPicker(false)}
          title="选择根成员"
        >
          <div className="space-y-3">
            <Input
              placeholder="搜索姓名..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-80 overflow-y-auto">
              {filteredMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setRootId(m.id)
                    setShowPicker(false)
                  }}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <span style={{ fontFamily: PG_SERIF }}>{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    第 {m.generation || '?'} 代 · {m.gender === 'male' ? '男' : '女'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}
