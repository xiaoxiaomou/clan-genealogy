import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { smartBack } from '@/lib/smartBack'
import type { Member, WufuData, WufuMember } from '@/types'
import {
  Button,
  CardHeader,
  CardTitle,
  CardContent,
  ExportToolbar,
  useToast,
} from '@/components/ui'
import { PgPageHead, PgSectionHead, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import {
  ArrowLeft,
  Users,
  Loader2,
  Crown,
  Heart,
  Home,
  UsersRound,
  UserCircle,
} from 'lucide-react'

const WUFU_CONFIG = {
  zancui: {
    name: '斩衰',
    years: '3年',
    color: '#dc2626',
    bgColor: '#fef2f2',
    icon: Heart,
    description: '父母、子女、配偶',
  },
  zicui: {
    name: '齐衰',
    years: '1年',
    color: '#ea580c',
    bgColor: '#fff7ed',
    icon: Home,
    description: '祖父母、兄弟姐妹、叔伯姑姨',
  },
  dagong: {
    name: '大功',
    years: '9个月',
    color: '#ca8a04',
    bgColor: '#fefce8',
    icon: Users,
    description: '曾祖父母、堂兄弟姐妹',
  },
  xiaogong: {
    name: '小功',
    years: '5个月',
    color: '#65a30d',
    bgColor: '#f7fee7',
    icon: UsersRound,
    description: '高祖父母、表兄弟姐妹',
  },
  sima: {
    name: '缌麻',
    years: '3个月',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    icon: UserCircle,
    description: '族兄弟姐妹',
  },
}

export function WufuChartPage() {
  const { familyId, memberId } = useParams<{ familyId: string; memberId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [, setMembers] = useState<Member[]>([])
  const [wufuData, setWufuData] = useState<WufuData | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [familyId, memberId])

  const fetchData = async () => {
    if (!familyId) return

    try {
      setLoading(true)
      const [membersRes, wufuRes] = await Promise.all([
        api.getMembers(Number(familyId)),
        api.getWufuChart(Number(familyId), Number(memberId)),
      ])

      setMembers(membersRes || [])
      setWufuData(wufuRes)
    } catch (error) {
      showToast('加载失败：无法加载五服数据', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleMemberClick = (memberId: number) => {
    navigate(`/family/${familyId}/member/${memberId}`)
  }

  const handleViewWufu = (targetMemberId: number) => {
    navigate(`/family/${familyId}/wufu/${targetMemberId}`)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    )
  }

  if (!wufuData) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          暂无数据
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 pg-rise">
        <div className="mb-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => smartBack(navigate, `/family/${familyId}`)}
            className="gap-1 text-muted-foreground"
            aria-label="返回族谱"
          >
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            返回族谱
          </Button>
        </div>

        <PgPageHead
          eyebrow="谱 牒 · 五 服"
          title="五服图"
          subtitle={
            <>
              为 {wufuData.member.name} 推定五服亲属 · 斩衰、齐衰、大功、小功、缌麻五等
            </>
          }
          actions={
            <ExportToolbar
              targetRef={exportRef as React.RefObject<HTMLElement>}
              filename={`五服图-${wufuData?.member?.name || '成员'}`}
              label="导出五服图"
            />
          }
        />

        <div ref={exportRef} className="mt-8 space-y-8">
          {/* 五服分类展示 */}
          <section>
            <PgSectionHead text="五 等 服 叙" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(WUFU_CONFIG).map(([key, config]) => {
                const members: WufuMember[] = wufuData[key as 'zancui' | 'zicui' | 'dagong' | 'xiaogong' | 'sima'] || []
                const Icon = config.icon

                return (
                  <div
                    key={key}
                    className="pg-card transition-all hover:shadow-md"
                    style={{ borderTop: `2px solid ${config.color}` }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full"
                            style={{ backgroundColor: config.color }}
                          >
                            <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                          </div>
                          <div>
                            <CardTitle className="text-base" style={{ color: config.color, fontFamily: PG_SERIF }}>
                              {config.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              丧期 {config.years}
                            </p>
                          </div>
                        </div>
                        <span className="pg-title text-2xl font-bold" style={{ color: config.color }}>
                          {members.length}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {config.description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      {members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">无此服属亲属</p>
                      ) : (
                        <div className="space-y-2">
                          {members.slice(0, 6).map((m) => (
                            <div
                              key={m.id}
                              className="flex cursor-pointer items-center justify-between rounded-lg border bg-muted/40 p-2 transition-colors hover:bg-muted/70"
                              onClick={() => handleMemberClick(m.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {m.name}
                                </span>
                                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                  {m.gender === 'male' ? '男' : m.gender === 'female' ? '女' : '未知'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">
                                  {m.relationship}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewWufu(m.id)
                                  }}
                                  title="查看其五服图"
                                >
                                  <Crown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {members.length > 6 && (
                            <p className="text-center text-xs text-muted-foreground">
                              还有 {members.length - 6} 位...
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </div>
                )
              })}
            </div>
          </section>

          {/* 五服制度说明 */}
          <section>
            <PgSectionHead text="五 服 制 度" />
            <div className="pg-card p-5">
              <div className="grid gap-4 md:grid-cols-5">
                {Object.entries(WUFU_CONFIG).map(([key, config]) => (
                  <div
                    key={key}
                    className="rounded-lg border p-3"
                    style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / .3)' }}
                  >
                    <h4 className="text-sm font-medium" style={{ color: config.color, fontFamily: PG_SERIF }}>
                      {config.name}（{config.years}）
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  )
}

export default WufuChartPage
