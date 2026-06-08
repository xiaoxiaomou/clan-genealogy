import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Member, KinshipResult } from '@/types'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useToast,
  BorderGlow,
} from '@/components/ui'
import { Layout } from '@/components/layout/Layout'
import {
  ArrowLeft,
  Users,
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
      setMembers(res.members.sort((a, b) => (a.generation || 0) - (b.generation || 0)))
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
      

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/family/${familyId}`)}
            aria-label="返回族谱"
          >
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            返回族谱
          </Button>
          <div className="flex items-center gap-2">
            <GitCommitHorizontal className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-foreground">亲属关系计算器</h1>
          </div>
        </div>

        {/* Calculator Card */}
        <BorderGlow
          backgroundColor="transparent"
          className="!bg-transparent border-0 p-0"
          colors={['#4facfe', '#00f2fe', '#43e97b']}
          glowIntensity={0.3}
          edgeSensitivity={35}
        >
        <Card spotlight className="mb-8">
          <CardHeader>
            <CardTitle>选择两位族谱成员</CardTitle>
            <p className="text-sm text-muted-foreground">
              系统将自动计算两人之间的亲属关系
            </p>
          </CardHeader>
          <CardContent>
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
                    <div className="max-h-48 overflow-y-auto rounded border">
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
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
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
                    <div className="max-h-48 overflow-y-auto rounded border">
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
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
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
          </CardContent>
        </Card>
        </BorderGlow>

        {/* Result */}
        {result && (
          <BorderGlow
            backgroundColor="transparent"
            className="!bg-transparent border-0 p-0"
            colors={['#4facfe', '#00f2fe', '#43e97b']}
            glowIntensity={0.3}
            edgeSensitivity={35}
          >
          <Card spotlight className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  计算结果
                </span>
                {result.path && result.path.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVisualization(!showVisualization)}
                    className="gap-1.5"
                  >
                    <GitBranch className="h-4 w-4" />
                    {showVisualization ? '隐藏路径图' : '显示路径图'}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 关系路径可视化 */}
              {showVisualization && result.path && result.path.length > 0 && (
                <div className="mb-6 rounded-lg border bg-card p-4 overflow-x-auto">
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
                              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold ${
                                node.isEndpoint
                                  ? 'bg-primary/20 text-primary border-2 border-primary'
                                  : 'bg-muted text-muted-foreground border-2 border-muted'
                              }`}>
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
                                      <polygon points="0 0, 10 3.5, 0 7" fill="#8b2500" />
                                    </marker>
                                  </defs>
                                  <line x1="0" y1="10" x2="30" y2="10" stroke="#8b2500" strokeWidth="2" markerEnd="url(#arrowhead)" />
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

              {/* 主要关系 */}
              <div className="mb-6 flex items-center justify-center gap-6 py-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {result.member1.name[0]}
                  </div>
                  <p className="text-sm font-medium">{result.member1.name}</p>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm text-muted-foreground">↓</span>
                  <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                    {result.relationship || '未知关系'}
                  </div>
                  <span className="text-sm text-muted-foreground">↑</span>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                    {result.member2.name[0]}
                  </div>
                  <p className="text-sm font-medium">{result.member2.name}</p>
                </div>
              </div>

              {/* 关系路径列表 */}
              {result.path && result.path.length > 0 && (
                <div className="rounded border bg-muted/30 p-4">
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
            </CardContent>
          </Card>
          </BorderGlow>
        )}
      </div>
    </Layout>
  )
}
