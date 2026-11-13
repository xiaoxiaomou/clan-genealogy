import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Input, Label, useToast } from '@/components/ui'
import { PgPageHead, PgSectionHead, PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { api } from '@/lib/api'
import { ArrowLeft, Loader2, Route, X } from 'lucide-react'

interface PathStep {
  from: { id: number; name: string }
  to: { id: number; name: string }
  relationship_type: string
  direction: 'up' | 'down' | 'sideways'
}

interface Member {
  id: number
  name: string
  gender: string
  generation: number | null
}

const REL_LABEL: Record<string, string> = {
  parent: '父母',
  child: '子女',
  spouse: '配偶',
  sibling: '兄弟姐妹',
}
const DIR_COLOR: Record<string, string> = {
  up: '#b08d57',       // 向上（金）
  down: '#7ba17b',     // 向下（绿）
  sideways: '#c08494', // 平辈（粉）
}
const DIR_LABEL: Record<string, string> = {
  up: '↑ 上行',
  down: '↓ 下行',
  sideways: '↔ 平辈',
}

export default function RelationshipPathPage() {
  const { id } = useParams<{ id: string }>()
  const familyId = Number(id)
  const { showToast } = useToast()

  const [members, setMembers] = useState<Member[]>([])
  const [member1, setMember1] = useState<number | null>(null)
  const [member2, setMember2] = useState<number | null>(null)
  const [member1Search, setMember1Search] = useState('')
  const [member2Search, setMember2Search] = useState('')
  const [picker1Open, setPicker1Open] = useState(false)
  const [picker2Open, setPicker2Open] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ relationship: string; path: PathStep[]; connected: boolean } | null>(null)
  const [familySurname, setFamilySurname] = useState('')

  useEffect(() => {
    loadMembers()
    api.getFamily(familyId).then((r) => setFamilySurname(r?.family?.surname || '')).catch(() => {})
  }, [familyId])

  async function loadMembers() {
    try {
      const res = await api.getMembers(familyId)
      const list = Array.isArray(res) ? res : (res.members || [])
      setMembers(list.sort((a: Member, b: Member) => (a.generation || 0) - (b.generation || 0)))
    } catch (err: any) {
      showToast(err.message || '加载成员失败', 'error')
    }
  }

  async function calculate() {
    if (!member1 || !member2) {
      showToast('请选择两位成员', 'error')
      return
    }
    if (member1 === member2) {
      showToast('请选择不同的成员', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await api.getKinshipPath(familyId, member1, member2)
      setResult({
        relationship: res.relationship,
        path: res.path || [],
        connected: res.connected,
      })
    } catch (err: any) {
      showToast(err.message || '计算失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  // SVG 图布局：节点按 generation 分层
  const graph = useMemo(() => {
    if (!result || !result.path.length) return null
    const pathIds = new Set<number>()
    result.path.forEach((s) => {
      pathIds.add(s.from.id)
      pathIds.add(s.to.id)
    })

    // 节点信息
    const nodes = Array.from(pathIds).map((mid) => {
      const m = members.find((x) => x.id === mid)
      return {
        id: mid,
        name: m?.name || '未知',
        gender: m?.gender || 'unknown',
        generation: m?.generation || 1,
        isStart: mid === member1,
        isEnd: mid === member2,
      }
    })

    // 按 generation 分层
    const byGen: Record<number, typeof nodes> = {}
    nodes.forEach((n) => {
      byGen[n.generation] = byGen[n.generation] || []
      byGen[n.generation].push(n)
    })
    const gens = Object.keys(byGen).map(Number).sort((a, b) => a - b)
    const COL_W = 130
    const ROW_H = 80
    const posMap: Record<number, { x: number; y: number }> = {}
    gens.forEach((g, gi) => {
      const list = byGen[g]
      list.forEach((n, ri) => {
        posMap[n.id] = {
          x: gi * COL_W + 60,
          y: ri * ROW_H + 60,
        }
      })
    })

    // 计算 viewBox
    const maxX = Math.max(...Object.values(posMap).map((p) => p.x)) + COL_W
    const maxY = Math.max(...Object.values(posMap).map((p) => p.y)) + ROW_H
    return {
      nodes,
      edges: result.path,
      posMap,
      viewBox: `0 0 ${maxX} ${maxY}`,
      gens,
    }
  }, [result, members, member1, member2])

  const titleText = familySurname ? `${familySurname}氏` : '本族'

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 pg-rise">
        <div className="mb-5">
          <a href={`/family/${familyId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            返回
          </a>
        </div>

        <PgPageHead
          eyebrow="谱 牒 · 寻 根"
          title={`${titleText} · 关系路径`}
          subtitle="寻二人之间的血脉联系 · 最短路径算法"
        />

        <div className="mt-6 space-y-6">
          {/* 选择器 */}
          <div className="pg-card p-5">
            <PgSectionHead text="选 择 成 员" />
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">起始成员</Label>
                <button
                  onClick={() => setPicker1Open(true)}
                  className="mt-1 flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  {member1 ? (
                    <span style={{ fontFamily: PG_SERIF }}>{members.find((m) => m.id === member1)?.name || '?'}</span>
                  ) : (
                    <span className="text-muted-foreground">点击选择...</span>
                  )}
                </button>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">目标成员</Label>
                <button
                  onClick={() => setPicker2Open(true)}
                  className="mt-1 flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  {member2 ? (
                    <span style={{ fontFamily: PG_SERIF }}>{members.find((m) => m.id === member2)?.name || '?'}</span>
                  ) : (
                    <span className="text-muted-foreground">点击选择...</span>
                  )}
                </button>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                onClick={calculate}
                disabled={loading || !member1 || !member2}
                className="px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    寻路中...
                  </>
                ) : (
                  <>
                    <Route className="mr-2 h-4 w-4" />
                    寻找关系路径
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 关系结果 */}
          {result && (
            <div className="pg-card pg-rise p-5">
              <PgSectionHead text="关 系 分 析" />
              {!result.connected ? (
                <div className="pg-card-soft py-8 text-center" style={{ fontFamily: PG_SERIF }}>
                  <p className="text-muted-foreground">二人之间暂未建立血缘或姻亲关系</p>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* 关系结论 */}
                  <div className="pg-card-soft p-4 text-center">
                    <div className="text-xs text-muted-foreground">亲缘称谓</div>
                    <div className="pg-title mt-1 text-2xl font-semibold sm:text-3xl" style={{ color: PG_RED }}>
                      {result.relationship}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">共 {result.path.length} 步关联</div>
                  </div>

                  {/* 路径图 */}
                  {graph && (
                    <div className="pg-card-soft overflow-x-auto p-3">
                      <svg width={Math.max(600, parseInt(graph.viewBox.split(' ')[2]))} height={parseInt(graph.viewBox.split(' ')[3])} viewBox={graph.viewBox}>
                        <defs>
                          <marker id="arrow-up" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#b08d57" />
                          </marker>
                          <marker id="arrow-down" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#7ba17b" />
                          </marker>
                          <marker id="arrow-side" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#c08494" />
                          </marker>
                        </defs>

                        {graph.edges.map((e, idx) => {
                          const from = graph.posMap[e.from.id]
                          const to = graph.posMap[e.to.id]
                          if (!from || !to) return null
                          const color = DIR_COLOR[e.direction]
                          const markerId = e.direction === 'up' ? 'arrow-up' : e.direction === 'down' ? 'arrow-down' : 'arrow-side'
                          return (
                            <g key={idx}>
                              <line
                                x1={from.x + 50}
                                y1={from.y}
                                x2={to.x + 50}
                                y2={to.y}
                                stroke={color}
                                strokeWidth={2}
                                opacity={0.8}
                                markerEnd={`url(#${markerId})`}
                              />
                              <text
                                x={(from.x + to.x) / 2 + 50}
                                y={(from.y + to.y) / 2 - 6}
                                textAnchor="middle"
                                style={{ fontSize: 9, fontFamily: 'serif' }}
                                fill="hsl(var(--muted-foreground))"
                              >
                                {REL_LABEL[e.relationship_type] || e.relationship_type} {DIR_LABEL[e.direction]}
                              </text>
                            </g>
                          )
                        })}

                        {graph.nodes.map((n) => {
                          const pos = graph.posMap[n.id]
                          if (!pos) return null
                          const isFemale = n.gender === 'female'
                          const fill = n.isStart ? '#3a1a1a' : n.isEnd ? '#1a2a3a' : isFemale ? '#4a2a35' : '#1f2a3a'
                          const stroke = n.isStart ? '#e85a3c' : n.isEnd ? '#3c8de8' : isFemale ? '#c08494' : '#7ba6c7'
                          const strokeWidth = n.isStart || n.isEnd ? 3 : 1.5
                          return (
                            <g key={n.id} transform={`translate(${pos.x}, ${pos.y})`}>
                              <rect
                                x={0}
                                y={-22}
                                width={100}
                                height={44}
                                rx={4}
                                fill={fill}
                                stroke={stroke}
                                strokeWidth={strokeWidth}
                              />
                              <text
                                x={50}
                                y={-3}
                                textAnchor="middle"
                                fill="#f5e6d3"
                                style={{ fontSize: 13, fontFamily: 'serif', fontWeight: 600 }}
                              >
                                {n.name}
                              </text>
                              <text
                                x={50}
                                y={14}
                                textAnchor="middle"
                                fill="rgba(245, 230, 211, 0.5)"
                                style={{ fontSize: 9, fontFamily: 'serif' }}
                              >
                                第{n.generation}世
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                    </div>
                  )}

                  {/* 步骤列表 */}
                  <div className="pg-card-soft p-4">
                    <h3 className="mb-2 text-sm text-muted-foreground" style={{ fontFamily: PG_SERIF }}>路径详情</h3>
                    <div className="space-y-2 text-sm">
                      {result.path.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span style={{ fontFamily: PG_SERIF }}>{step.from.name}</span>
                          <span
                            className="rounded px-2 py-0.5 text-xs"
                            style={{ background: DIR_COLOR[step.direction] + '40', color: 'hsl(var(--foreground))' }}
                          >
                            {REL_LABEL[step.relationship_type] || step.relationship_type} · {DIR_LABEL[step.direction]}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span style={{ fontFamily: PG_SERIF }}>{step.to.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground" style={{ fontFamily: PG_SERIF, letterSpacing: '0.3em' }}>
          溯血脉之源 · 叙宗族之情
        </p>
      </div>

      {/* 选择器模态框 */}
      <MemberPicker
        isOpen={picker1Open}
        onClose={() => setPicker1Open(false)}
        members={members}
        search={member1Search}
        setSearch={setMember1Search}
        onSelect={(mid) => {
          setMember1(mid)
          setPicker1Open(false)
        }}
        excludeId={member2}
      />
      <MemberPicker
        isOpen={picker2Open}
        onClose={() => setPicker2Open(false)}
        members={members}
        search={member2Search}
        setSearch={setMember2Search}
        onSelect={(mid) => {
          setMember2(mid)
          setPicker2Open(false)
        }}
        excludeId={member1}
      />
    </Layout>
  )
}

function MemberPicker({ isOpen, onClose, members, search, setSearch, onSelect, excludeId }: {
  isOpen: boolean
  onClose: () => void
  members: Member[]
  search: string
  setSearch: (s: string) => void
  onSelect: (id: number) => void
  excludeId: number | null
}) {
  if (!isOpen) return null
  const filtered = members.filter((m) => m.id !== excludeId && m.name.includes(search))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="pg-card w-full max-w-md p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg" style={{ fontFamily: PG_SERIF }}>选择成员</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>
        <Input
          autoFocus
          placeholder="搜索姓名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">无匹配成员</p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                <span style={{ fontFamily: PG_SERIF }}>{m.name}</span>
                <span className="text-xs text-muted-foreground">
                  第{m.generation || '?'}代 · {m.gender === 'male' ? '男' : '女'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
