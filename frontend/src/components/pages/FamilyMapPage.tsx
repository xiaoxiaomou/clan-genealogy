import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, useToast, Button, MigrationPaths } from '@/components/ui'
import { api } from '@/lib/api'
import FamilyMapView, { type PlaceMark } from './FamilyMapView'
import { MapPin, Globe, Users, TrendingUp, Sparkles } from 'lucide-react'

interface FamilyInfo {
  id: number
  name: string
  origin: string | null
  origin_lat: number | null
  origin_lng: number | null
}

interface MemberLocation {
  id: number
  name: string
  gender: string
  is_alive: boolean
  birth_place: string | null
  birth_place_lat: number | null
  birth_place_lng: number | null
  death_place: string | null
  death_place_lat: number | null
  death_place_lng: number | null
}

export default function FamilyMapPage() {
  const { id } = useParams<{ id: string }>()
  const familyId = Number(id)
  const { showToast } = useToast()

  const [family, setFamily] = useState<FamilyInfo | null>(null)
  const [members, setMembers] = useState<MemberLocation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!familyId) return
    loadData()
  }, [familyId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [familyRes, membersRes] = await Promise.all([
        api.getFamily(familyId),
        api.getMembers(familyId),
      ])
      setFamily(familyRes.family)
      setMembers(membersRes.members || [])
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 构造地点标记
  const places: PlaceMark[] = []
  if (family && family.origin_lat != null && family.origin_lng != null) {
    places.push({
      name: family.name + ' 家族',
      lat: family.origin_lat,
      lng: family.origin_lng,
      type: 'family',
      extra: family.origin || undefined,
    })
  }
  for (const m of members) {
    if (m.birth_place_lat != null && m.birth_place_lng != null) {
      places.push({
        name: m.name,
        lat: m.birth_place_lat,
        lng: m.birth_place_lng,
        type: 'birth',
        gender: m.gender as 'male' | 'female',
        extra: m.birth_place || undefined,
      })
    }
    if (m.death_place_lat != null && m.death_place_lng != null) {
      places.push({
        name: m.name,
        lat: m.death_place_lat,
        lng: m.death_place_lng,
        type: 'death',
        gender: m.gender as 'male' | 'female',
        extra: m.death_place || undefined,
      })
    }
  }

  // 统计
  const stats = {
    totalMembers: members.length,
    withBirth: members.filter((m) => m.birth_place_lat != null).length,
    withDeath: members.filter((m) => m.death_place_lat != null).length,
    provinces: new Set(
      members
        .map((m) => (m.birth_place || '').split(/[省市区县]/)[0])
        .filter((p) => p && p.length > 0 && p.length < 10)
    ).size,
  }

  // 迁徙路径（出生 → 逝世 同人）
  const migrationPaths = members
    .filter((m) =>
      m.birth_place_lat != null && m.birth_place_lng != null &&
      m.death_place_lat != null && m.death_place_lng != null
    )
    .map((m) => ({
      member: m.name,
      gender: (m.gender as 'male' | 'female') || null,
      from: m.birth_place || '',
      to: m.death_place || '',
      fromLat: m.birth_place_lat!,
      fromLng: m.birth_place_lng!,
      toLat: m.death_place_lat!,
      toLng: m.death_place_lng!,
    }))

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* 标题 */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground sm:text-3xl">
              <Globe className="h-7 w-7 text-primary" />
              家族地理分布
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              展示家族成员在地理空间上的分布与迁徙路径
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Users} label="家族成员" value={stats.totalMembers} color="text-blue-500" />
          <StatCard icon={MapPin} label="出生地点" value={stats.withBirth} color="text-pink-500" />
          <StatCard icon={MapPin} label="逝世地点" value={stats.withDeath} color="text-gray-500" />
          <StatCard icon={TrendingUp} label="涉及省份" value={stats.provinces} color="text-amber-500" />
        </div>

        {/* 地图 */}
        <Card>
          <CardHeader>
            <CardTitle>
              <MapPin className="mr-2 inline-block h-5 w-5" />
              地理分布图
            </CardTitle>
            <CardDescription>
              {places.length > 0
                ? `共 ${places.length} 个标记点（点击标记查看详情）`
                : '暂无坐标数据，请在成员编辑中添加出生/逝世地点坐标'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-[500px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
              </div>
            ) : places.length === 0 ? (
              <div className="flex h-[500px] flex-col items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="h-12 w-12" />
                <p>暂无地理数据</p>
                <p className="text-xs">提示：在成员编辑页使用"选点"功能添加出生/逝世地坐标</p>
              </div>
            ) : (
              <FamilyMapView places={places} height="600px" showLines />
            )}
          </CardContent>
        </Card>

        {/* 迁徙路径动画列表 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              <Sparkles className="mr-2 inline-block h-5 w-5 text-amber-500" />
              成员迁徙路径
            </CardTitle>
            <CardDescription>
              {migrationPaths.length > 0
                ? `共 ${migrationPaths.length} 条迁徙轨迹（出生地 → 逝世地）`
                : '尚无完整出生/逝世地坐标的成员'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MigrationPaths paths={migrationPaths} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  color: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-8 w-8 ${color}`} />
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
