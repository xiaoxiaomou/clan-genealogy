import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, useToast, Button, FilterDrawer, MemorialRemindersSection } from '@/components/ui'
import { api } from '@/lib/api'
import { formatDaysOffset, solarToLunar, formatSolarDate } from '@/lib/lunar'
import { Flame, Calendar, Clock, Sun, ChevronRight, Sparkles } from 'lucide-react'

interface MemorialItem {
  member_id: number
  member_name: string
  avatar: string | null
  death_date_solar: string
  death_date_lunar: string
  year_ganzhi: string
  shengxiao: string
  lunar_month: number
  lunar_day: number
}

interface UpcomingDay {
  date_solar: string
  date_lunar: string
  offset_days: number
  items: MemorialItem[]
}

interface TodayData {
  date_solar: string
  date_lunar: string
  count: number
  items: MemorialItem[]
}

const BG = 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)'

export default function MemorialPage() {
  const { id } = useParams<{ id: string }>()
  const familyId = Number(id)
  const { showToast } = useToast()

  const [today, setToday] = useState<TodayData | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingDay[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(60)
  const [familySurname, setFamilySurname] = useState('')

  useEffect(() => {
    if (!familyId) return
    api.getFamily(familyId).then((r) => setFamilySurname(r?.family?.surname || '')).catch(() => {})
    loadAll()
  }, [familyId, days])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [t, u] = await Promise.all([
        api.getTodayMemorial(familyId),
        api.getUpcomingMemorial(familyId, days),
      ])
      setToday(t)
      setUpcoming(u.upcoming || [])
    } catch (err: any) {
      showToast(err.message || '加载祭日失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const todayLunar = solarToLunar(new Date())
  const titleText = familySurname ? `${familySurname}氏` : '本族'

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: BG }}>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* 匾额 */}
        <div className="relative overflow-hidden rounded-lg border-2 border-amber-700/40 bg-gradient-to-br from-amber-900/40 to-stone-900/60 p-6 text-center shadow-2xl sm:p-8">
          <div className="absolute inset-0 opacity-20" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(245, 230, 211, 0.1) 10px, rgba(245, 230, 211, 0.1) 11px)',
          }} />
          <div className="relative">
            <div className="mb-2 text-xs tracking-[0.5em] text-amber-300/60">慎 终 追 远</div>
            <h1 className="font-serif text-4xl font-bold text-amber-100 sm:text-5xl">
              {titleText}·祭日
            </h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-amber-200/70">
              <span>今日 {formatSolarDate(new Date())}</span>
              {todayLunar && (
                <span className="text-amber-300/80">· {todayLunar.fullStr}</span>
              )}
            </div>
          </div>
        </div>

        {/* 顶部筛选条 */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-700/30 bg-stone-900/50 px-4 py-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-amber-100">
            <Flame className="h-5 w-5 text-orange-500" />
            忌日预览
          </h2>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-xs text-amber-200/50">未来</span>
            {[30, 60, 90, 180].map((d) => (
              <Button
                key={d}
                variant={days === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(d)}
                className={`h-8 text-xs ${
                  days === d
                    ? 'border-amber-600/50 bg-amber-700 text-amber-50 hover:bg-amber-600'
                    : 'border-amber-700/30 bg-stone-950/40 text-amber-200/70 hover:bg-stone-800/60'
                }`}
              >
                {d}天
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:hidden">
            <FilterDrawer activeCount={1} title="筛选时间范围">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">未来天数</p>
                <div className="grid grid-cols-2 gap-2">
                  {[30, 60, 90, 180].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`rounded-md border px-3 py-3 text-sm transition-colors ${
                        days === d
                          ? 'border-amber-600/50 bg-amber-700 text-amber-50'
                          : 'border-amber-700/30 bg-stone-950/40 text-amber-200/70'
                      }`}
                    >
                      未来 {d} 天
                    </button>
                  ))}
                </div>
              </div>
            </FilterDrawer>
          </div>
        </div>

        {/* 今日忌日卡片 */}
        <Card className="border-amber-700/30 bg-gradient-to-br from-orange-950/40 to-stone-900/50">
          <div className="flex items-center justify-between border-b border-amber-700/30 px-5 py-3">
            <div>
              <h3 className="flex items-center gap-2 font-serif text-lg text-amber-100">
                <Sun className="h-5 w-5 text-amber-300/70" />
                今日忌日
              </h3>
              <p className="mt-0.5 text-xs text-amber-200/50">
                {today?.date_lunar || '加载中...'}
              </p>
            </div>
            {today && today.count > 0 && (
              <span className="rounded-full border border-orange-500/50 bg-orange-700/80 px-3 py-1 text-sm font-serif text-amber-50">
                {today.count} 位先祖
              </span>
            )}
          </div>
          <CardContent className="p-5">
            {loading && <p className="text-sm text-amber-200/40">焚香静候...</p>}
            {!loading && today && today.count === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-amber-200/40">
                <Flame className="h-8 w-8 opacity-30" />
                <p className="font-serif text-sm">今日无先祖忌日，祈愿平安</p>
              </div>
            )}
            {!loading && today && today.count > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {today.items.map((m) => (
                  <MemorialCard key={m.member_id} item={m} highlight />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 即将到来的忌日 */}
        <Card className="border-amber-700/30 bg-stone-900/50">
          <div className="flex items-center justify-between border-b border-amber-700/30 px-5 py-3">
            <h3 className="flex items-center gap-2 font-serif text-lg text-amber-100">
              <Clock className="h-5 w-5 text-amber-300/70" />
              未来 {days} 天
            </h3>
            <span className="text-xs text-amber-200/50">
              共 <span className="font-serif text-amber-200">{upcoming.length}</span> 个忌日
            </span>
          </div>
          <CardContent className="p-5">
            {loading ? (
              <p className="text-sm text-amber-200/40">焚香静候...</p>
            ) : upcoming.length === 0 ? (
              <p className="py-6 text-center font-serif text-sm text-amber-200/40">
                未来 {days} 天内无先祖忌日
              </p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((day) => (
                  <div
                    key={day.date_solar}
                    className={`rounded-lg border p-3 transition-colors ${
                      day.offset_days === 0
                        ? 'border-orange-500/50 bg-orange-950/30'
                        : 'border-amber-700/20 bg-stone-950/30 hover:border-amber-700/40'
                    }`}
                  >
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-amber-300/50" />
                        <span className="font-serif text-amber-100">
                          {formatSolarDate(day.date_solar)}
                        </span>
                        <span className="text-xs text-amber-200/40">
                          ({day.date_lunar})
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 font-serif text-xs ${
                          day.offset_days === 0
                            ? 'border border-orange-500/40 bg-orange-700/80 text-amber-50'
                            : 'border border-amber-700/30 bg-stone-900/60 text-amber-200/60'
                        }`}
                      >
                        {formatDaysOffset(day.offset_days)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {day.items.map((m) => (
                        <MemorialCard key={m.member_id} item={m} compact />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-amber-200/30">
          <Sparkles className="mr-1 inline-block h-3 w-3" />
          忌日按农历月日推算，每年循环
          <ChevronRight className="mx-1 inline-block h-3 w-3" />
          由成员逝世日期自动生成
        </p>
        <p className="text-center font-serif text-xs text-amber-200/30">
          愿先祖庇佑，子孙安康
        </p>

        <MemorialRemindersSection familyId={familyId} isAdmin={true} />
      </div>
    </div>
  )
}

function MemorialCard({ item, highlight = false, compact = false }: {
  item: MemorialItem
  highlight?: boolean
  compact?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
        highlight
          ? 'border-orange-500/50 bg-orange-950/40'
          : 'border-amber-700/20 bg-stone-950/40 hover:border-amber-700/40'
      }`}
    >
      {item.avatar ? (
        <img
          src={item.avatar}
          alt={item.member_name}
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-orange-500/50"
        />
      ) : (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif text-sm ${
            highlight
              ? 'border border-orange-500/50 bg-orange-900/60 text-amber-100'
              : 'border border-amber-700/30 bg-stone-900 text-amber-200/60'
          }`}
        >
          {item.member_name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-sm text-amber-100">
          {item.member_name}
        </p>
        <p className="truncate text-xs text-amber-200/50">
          {item.year_ganzhi}
          {item.shengxiao}年 · {compact ? `${item.lunar_month}月${item.lunar_day}日` : item.death_date_lunar}
        </p>
      </div>
      <Flame
        className={`h-4 w-4 shrink-0 ${
          highlight ? 'text-orange-500' : 'text-amber-200/30'
        }`}
      />
    </div>
  )
}
