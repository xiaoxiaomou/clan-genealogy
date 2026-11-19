import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { useToast, MigrationPaths } from '@/components/ui'
import { PgPageHead, PgSectionHead } from '@/components/ui/pedigree'
import { smartBack } from '@/lib/smartBack'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import FamilyMapView, { type PlaceMark } from './FamilyMapView'

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
  const navigate = useNavigate()
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
      <div className="pg-rise mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-center gap-2">
          <button
            onClick={() => smartBack(navigate, `/family/${familyId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回族谱
          </button>
        </div>
        <PgPageHead
          eyebrow="谱 牒 · 舆 图"
          title="家族地理分布"
          subtitle="族人出生、逝世与迁徙的地理轨迹"
        />

        {/* 统计 — 四柱 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="家族成员" value={stats.totalMembers} />
          <StatCard label="出生地点" value={stats.withBirth} />
          <StatCard label="逝世地点" value={stats.withDeath} />
          <StatCard label="涉及省份" value={stats.provinces} />
        </div>

        {/* 地图 */}
        <section className="mt-8">
          <PgSectionHead
            text="地 理 分 布 图"
            right={
              <span className="text-xs text-muted-foreground">
                {places.length > 0
                  ? `共 ${places.length} 个标记点（点击标记查看详情）`
                  : '暂无坐标数据'}
              </span>
            }
          />
          <div className="pg-card overflow-hidden">
            {loading ? (
              <div className="flex h-[500px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : places.length === 0 ? (
              <div className="flex h-[500px] flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
                <p className="pg-title text-base" style={{ letterSpacing: '0.12em' }}>
                  舆图尚空，未录坐标。
                </p>
                <p className="text-xs">
                  在成员编辑页使用「选点」功能，为族人标注出生 / 逝世地点
                </p>
              </div>
            ) : (
              <FamilyMapView places={places} height="600px" showLines />
            )}
          </div>
        </section>

        {/* 迁徙路径 */}
        <section className="mt-8">
          <PgSectionHead
            text="迁 徙 路 径"
            right={
              <span className="text-xs text-muted-foreground">
                {migrationPaths.length > 0
                  ? `共 ${migrationPaths.length} 条迁徙轨迹（出生地 → 逝世地）`
                  : '尚无完整出生/逝世地坐标的成员'}
              </span>
            }
          />
          <div className="pg-card p-5">
            <MigrationPaths paths={migrationPaths} />
          </div>
        </section>
      </div>
    </Layout>
  )
}

function StatCard({ label, value }: {
  label: string
  value: number
}) {
  return (
    <div className="pg-card p-4 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="pg-title mt-2 text-3xl font-semibold">{value}</div>
    </div>
  )
}
