import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Member, KinshipResult } from '@/types'
import { Button, useToast } from '@/components/ui'
import { PgPageHead, PgSectionHead, PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import {
  ArrowLeft,
  Search,
  ArrowRight,
  GitCommitHorizontal,
  Loader2,
  RefreshCw,
  GitBranch,
} from 'lucide-react'

const RELATIONSHIP_LABELS: Record<string, string> = {
  parent: '父母',
  child: '子女',
  spouse: '配偶',
  sibling: '兄弟姐妹',
  grandparent: '祖父母',
  grandchild: '孙辈',
  uncle_aunt: '叔伯/姑姨',
  nephew_niece: '侄/甥',
  cousin: '堂/表亲',
  ancestor: '祖先',
  descendant: '后代',
  '': '未知关系',
}

const DIRECTION_LABELS: Record<string, string> = {
  up: '↑ 向上',
  down: '↓ 向下',
  sideways: '↔ 平辈',
}

export default function KinshipCalculatorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [member1, setMember1] = useState<number | null>(null)
  const [member2, setMember2] = useState<number | null>(null)
  const [result, setResult] = useState<KinshipResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [searchMember1, setSearchMember1] = useState('')
  const [searchMember2, setSearchMember2] = useState('')
  const [showVisualization, setShowVisualization] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [familyId])

  const loadMembers = async () => {
    setIsLoading(true)
    try {
      const res = await api.getMembers(familyId)
      setMembers(res.members.sort((a: { generation?: number | null }, b: { generation?: number | null }) => (a.generation || 0) - (b.generation || 0)))
    } catch (err: any) {
      showToast(err.message || '加载成员失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCalculate = async () => {
    if (!member1 || !member2) {
      showToast('请选择两位成员', 'error')
      return
    }
    if (member1 === member2) {
      showToast('请选择不同的成员', 'error')
      return
    }
    setIsCalculating(true)
    setResult(null)
    try {
      const res = await api.calculateKinship(familyId, member1, member2)
      setResult(res)
    } catch (err: any) {
      showToast(err.message || '计算失败', 'error')
    } finally {
      setIsCalculating(false)
    }
  }

  const handleSwap = () => {
    const tmp = member1
    setMember1(member2)
    setMember2(tmp)
    const tmpSearch = searchMember1
    setSearchMember1(searchMember2)
    setSearchMember2(tmpSearch)
    setResult(null)
  }

  const getMemberName = (memberId: number) => {
    return members.find((m) => m.id === memberId)?.name || '未知成员'
  }

  const filteredMembers1 = members.filter(
    (m) => m.name.toLowerCase().includes(searchMember1.toLowerCase())
  )
  const filteredMembers2 = members.filter(
    (m) => m.name.toLowerCase().includes(searchMember2.toLowerCase())
  )

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 pg-rise">
        <div className="mb-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/family/${familyId}`)}
            className="gap-1 text-muted-foreground"
            aria-label="返回族谱"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回族谱
          </Button>
        </div>

        <PgPageHead
          eyebrow="谱 牒 · 称 谓"
          title="亲属称呼计算器"
          subtitle="拣选两位族中成员，推算彼此称呼与关联路径"
        />

        {/* 计算面板 */}
        <div className="pg-card mt-6 mb-8 p-5 sm:p-6">
          <PgSectionHead text="选 择 成 员" />
          <p className="mb-5 mt-3 text-sm text-muted-foreground">
            系统将自动计算两人之间的亲属关系
          </p>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-[1fr_auto_1fr]">
                {/* Member 1 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">成员 A</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="搜索成员..."
                      value={searchMember1}
                      onChange={(e) => setSearchMember1(e.target.value)}
                      className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded border" style={{ borderColor: 'hsl(var(--border))' }}>
                    {filteredMembers1.length === 0 ? (
                      <p className="p-3 text-center text-sm text-muted-foreground">无匹配成员</p>
                    ) : (
                      filteredMembers1.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setMember1(m.id)
                            setSearchMember1(m.name)
                            setResult(null)
                          }}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                            member1 === m.id ? 'bg-primary/10 text-primary font-medium' : ''
                          }`}
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {m.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{m.name}</p>
                            <p className="text-xs text-muted-foreground">
                              第{m.generation || '?'}代 · {m.gender === 'male' ? '男' : m.gender === 'female' ? '女' : '未知'}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex items-center justify-center pt-8">
                  <button
                    onClick={handleSwap}
                    className="flex h-10 w-10 items-center justify-center rounded-full border bg-card transition-colors hover:bg-accent"
                    aria-label="交换成员"
                    title="交换成员"
                  >
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Member 2 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">成员 B</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="搜索成员..."
                      value={searchMember2}
                      onChange={(e) => setSearchMember2(e.target.value)}
                      className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded border" style={{ borderColor: 'hsl(var(--border))' }}>
                    {filteredMembers2.length === 0 ? (
                      <p className="p-3 text-center text-sm text-muted-foreground">无匹配成员</p>
                    ) : (
                      filteredMembers2.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setMember2(m.id)
                            setSearchMember2(m.name)
                            setResult(null)
                          }}
                          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                            member2 === m.id ? 'bg-primary/10 text-primary font-medium' : ''
                          }`}
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {m.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{m.name}</p>
                            <p className="text-xs text-muted-foreground">
                              第{m.generation || '?'}代 · {m.gender === 'male' ? '男' : m.gender === 'female' ? '女' : '未知'}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Button
                  variant="apple"
                  glow
                  onClick={handleCalculate}
                  disabled={!member1 || !member2 || member1 === member2 || isCalculating}
                  className="gap-2"
                >
                  {isCalculating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      计算中...
                    </>
                  ) : (
                    <>
                      <GitCommitHorizontal className="h-4 w-4" />
                      计算关系
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="pg-card pg-rise p-5 sm:p-6">
            <PgSectionHead
              text="计 算 结 果"
              right={
                result.path && result.path.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVisualization(!showVisualization)}
                    className="gap-1.5"
                  >
                    <GitBranch className="h-4 w-4" />
                    {showVisualization ? '隐藏路径图' : '显示路径图'}
                  </Button>
                )
              }
            />

            {/* 关系路径可视化 */}
            {showVisualization && result.path && result.path.length > 0 && (
              <div className="pg-card-soft mb-6 p-4 overflow-x-auto">
                <h3 className="mb-4 text-sm font-medium text-muted-foreground">关系路径图</h3>
                <div className="flex items-center justify-center min-w-fit">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const pathNodes: { id: number; name: string; isEndpoint: boolean }[] = []
                      result.path.forEach((step, idx) => {
                        const fromMember = members.find((m) => m.id === step.from)
                        const toMember = members.find((m) => m.id === step.to)
                        if (idx === 0) {
                          pathNodes.push({ id: step.from, name: fromMember?.name || '未知', isEndpoint: true })
                        }
                        pathNodes.push({
                          id: step.to,
                          name: toMember?.name || '未知',
                          isEndpoint: idx === result.path.length - 1
                        })
                      })
                      return pathNodes.map((node, idx) => (
                        <div key={`${node.id}-${idx}`} className="flex items-center gap-2">
                          <div className={`flex flex-col items-center ${node.isEndpoint ? '' : 'opacity-70'}`}>
                            <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 text-lg font-bold ${
                              node.isEndpoint
                                ? 'bg-primary/10 text-primary border-primary'
                                : 'bg-muted text-muted-foreground border-muted'
                            }`} style={node.isEndpoint ? { fontFamily: PG_SERIF } : undefined}>
                              {node.name[0]}
                            </div>
                            <span className="mt-1 text-xs font-medium">{node.name}</span>
                            {result.path[idx] && (
                              <span className="mt-1 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                {DIRECTION_LABELS[result.path[idx].direction] || ''}
                              </span>
                            )}
                          </div>
                          {idx < pathNodes.length - 1 && (
                            <div className="flex items-center">
                              <svg width="40" height="20" viewBox="0 0 40 20">
                                <defs>
                                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill={PG_RED} />
                                  </marker>
                                </defs>
                                <line x1="0" y1="10" x2="30" y2="10" stroke={PG_RED} strokeWidth="2" markerEnd="url(#arrowhead)" />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 称呼结果 */}
            <div className="pg-card-soft mb-6 flex items-center justify-center gap-6 px-4 py-8">
              <div className="flex flex-col items-center gap-2">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full border text-lg font-bold"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / .4)', fontFamily: PG_SERIF }}
                >
                  {result.member1.name[0]}
                </div>
                <p className="text-sm font-medium">{result.member1.name}</p>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs tracking-[0.2em] text-muted-foreground">二 人 称 呼</span>
                <div className="pg-title px-4 text-center text-2xl font-semibold sm:text-3xl" style={{ color: PG_RED }}>
                  {result.relationship || '未知关系'}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full border text-lg font-bold"
                  style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / .4)', fontFamily: PG_SERIF }}
                >
                  {result.member2.name[0]}
                </div>
                <p className="text-sm font-medium">{result.member2.name}</p>
              </div>
            </div>

            {/* 关系路径列表 */}
            {result.path && result.path.length > 0 && (
              <div className="pg-card-soft p-4">
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">关系路径</h3>
                <div className="space-y-2">
                  {result.path.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <span className="font-medium">{getMemberName(step.from)}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span aria-hidden="true">
                          {step.direction === 'up' ? '↑' : step.direction === 'down' ? '↓' : '→'}
                        </span>
                        {DIRECTION_LABELS[step.direction] || step.direction}
                      </span>
                      <span className="font-medium">{getMemberName(step.to)}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {RELATIONSHIP_LABELS[step.type] || step.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!result.path || result.path.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-4">
                未找到直接关系路径
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
