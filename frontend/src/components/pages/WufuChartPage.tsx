import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Member, WufuData } from '@/types'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ExportToolbar,
  useToast,
} from '@/components/ui'
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
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [wufuData, setWufuData] = useState<WufuData | null>(null)
  const [selectedMember, setSelectedMember] = useState<number | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [familyId, memberId])

  const fetchData = async () => {
    if (!familyId) return

    try {
      setLoading(true)
      const [membersRes, wufuRes] = await Promise.all([
        api.get(`/families/${familyId}/members`),
        api.get(`/kinship/${familyId}/wufu/${memberId}`),
      ])

      setMembers(membersRes.data || [])
      setWufuData(wufuRes.data)
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载五服数据',
        variant: 'destructive',
      })
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
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
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
              <Crown className="h-5 w-5 text-primary" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-foreground">五服图</h1>
            </div>
          </div>
          <ExportToolbar
            targetRef={exportRef}
            filename={`五服图-${wufuData?.member?.name || '成员'}`}
            label="导出五服图"
          />
        </div>

        <div ref={exportRef}>
          {/* 当前成员信息 */}
          <Card className="mb-8 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {wufuData.member.name} 的亲属关系
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              根据传统五服制度，亲属关系分为斩衰、齐衰、大功、小功、缌麻五个等级
            </p>
          </CardContent>
        </Card>

        {/* 五服分类展示 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(WUFU_CONFIG).map(([key, config]) => {
            const members = wufuData[key as keyof typeof wufuData] || []
            const Icon = config.icon

            return (
              <Card
                key={key}
                style={{ backgroundColor: config.bgColor }}
                className="border-2 transition-all hover:shadow-md"
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
                        <CardTitle className="text-base" style={{ color: config.color }}>
                          {config.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          丧期 {config.years}
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold" style={{ color: config.color }}>
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
                          className="flex items-center justify-between rounded-lg border bg-white/50 p-2 transition-colors hover:bg-white cursor-pointer"
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
              </Card>
            )
          })}
        </div>

        {/* 五服制度说明 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">五服制度说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="rounded-lg bg-red-50 p-3">
                <h4 className="font-medium text-red-600">斩衰（3年）</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  父母、子女、配偶之间的亲属关系
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <h4 className="font-medium text-orange-600">齐衰（1年）</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  祖父母、兄弟姐妹、叔伯姑姨、侄子女
                </p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-3">
                <h4 className="font-medium text-yellow-600">大功（9个月）</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  曾祖父母、堂兄弟姐妹
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <h4 className="font-medium text-green-600">小功（5个月）</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  高祖父母、表兄弟姐妹
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <h4 className="font-medium text-emerald-600">缌麻（3个月）</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  族兄弟姐妹等更远亲属
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </Layout>
  )
}
