import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast, Button, FilterDrawer, MemorialRemindersSection } from '@/components/ui'
import { PgPageHead, PgSectionHead, PgSeal, PgIncenseBurner, TabletDefs, cnYear, PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { api } from '@/lib/api'
import { smartBack } from '@/lib/smartBack'
import { formatDaysOffset, solarToLunar, formatSolarDate } from '@/lib/lunar'
import { ArrowLeft, Flame, Calendar, Flower2, Sparkles, Hand, X } from 'lucide-react'

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

export default function MemorialPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const familyId = Number(id)
  const { showToast } = useToast()

  const [today, setToday] = useState<TodayData | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingDay[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(60)
  const [familySurname, setFamilySurname] = useState('')
  const [ritualMember, setRitualMember] = useState<MemorialItem | null>(null)
  const [incenseSignal, setIncenseSignal] = useState(0)
  const [yearOnly, setYearOnly] = useState<Array<{ member_id: number; member_name: string; avatar: string | null; death_year: string; generation: number | null; gender: string | null }> | null>(null)

  useEffect(() => {
    if (!familyId) return
    api.getFamily(familyId).then((r) => setFamilySurname(r?.family?.surname || '')).catch(() => {})
    loadAll()
  }, [familyId, days])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [t, u, y] = await Promise.all([
        api.getTodayMemorial(familyId),
        api.getUpcomingMemorial(familyId, days),
        api.getYearOnlyMemorial(familyId).catch(() => ({ items: [] })),
      ])
      setToday(t)
      setUpcoming(u.upcoming || [])
      setYearOnly(y.items || [])
    } catch (err: any) {
      showToast(err.message || '加载祭日失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const todayLunar = solarToLunar(new Date())
  const titleText = familySurname ? `${familySurname}氏` : '本族'

  const openRitual = (m: { member_id: number; member_name: string; avatar: string | null; death_year: string }) => {
    setRitualMember({
      member_id: m.member_id,
      member_name: m.member_name,
      avatar: m.avatar,
      death_date_solar: '',
      death_date_lunar: `${m.death_year} 年卒`,
      year_ganzhi: '',
      shengxiao: '',
      lunar_month: 0,
      lunar_day: 0,
    })
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 pg-rise">
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
          eyebrow="谱 牒 · 追 远"
          title={`${titleText}·祭日`}
          subtitle={<>今日 {formatSolarDate(new Date())}{todayLunar && <> · {todayLunar.fullStr}</>}</>}
          actions={<PgSeal char="祀" size={56} title="祭日追远" />}
        />

        {/* 今日忌日 */}
        <div>
          <PgSectionHead
            text="今 日 忌 日"
            right={
              today && today.count > 0 ? (
                <span
                  className="rounded-full px-3 py-1 text-xs"
                  style={{
                    color: PG_RED,
                    border: `1px solid color-mix(in srgb, ${PG_RED} 40%, transparent)`,
                    background: `color-mix(in srgb, ${PG_RED} 8%, transparent)`,
                  }}
                >
                  今日 {today.count} 位先祖
                </span>
              ) : undefined
            }
          />
          <div className="pg-card p-5">
            <p className="mb-3 text-xs text-muted-foreground">{today?.date_lunar || '加载中...'}</p>
            {loading && <p className="text-sm text-muted-foreground">焚香静候...</p>}
            {!loading && today && today.count === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Flame className="h-8 w-8 opacity-30" aria-hidden="true" />
                <p className="text-sm" style={{ fontFamily: PG_SERIF }}>今日无先祖忌日，祈愿平安</p>
              </div>
            )}
            {!loading && today && today.count > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {today.items.map((m) => (
                  <MemorialCard key={m.member_id} item={m} highlight onRitual={() => setRitualMember(m)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 未来忌日 + 时间范围筛选 */}
        <div>
          <PgSectionHead
            text="未 来 忌 日"
            right={
              <>
                <span className="text-xs text-muted-foreground">共 {upcoming.length} 个忌日</span>
                <div className="hidden items-center gap-2 sm:flex">
                  {[30, 60, 90, 180].map((d) => (
                    <Button
                      key={d}
                      variant={days === d ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setDays(d)}
                      className="h-8 text-xs"
                      aria-pressed={days === d}
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
                            className="rounded-md border px-3 py-3 text-sm transition-colors"
                            style={
                              days === d
                                ? {
                                    borderColor: `color-mix(in srgb, ${PG_RED} 45%, transparent)`,
                                    color: PG_RED,
                                    background: `color-mix(in srgb, ${PG_RED} 8%, transparent)`,
                                  }
                                : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }
                            }
                            aria-pressed={days === d}
                          >
                            未来 {d} 天
                          </button>
                        ))}
                      </div>
                    </div>
                  </FilterDrawer>
                </div>
              </>
            }
          />
          <div className="pg-card p-5">
            {loading ? (
              <p className="text-sm text-muted-foreground">焚香静候...</p>
            ) : upcoming.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm" style={{ fontFamily: PG_SERIF }}>未来 {days} 天内无先祖忌日</p>
                <p className="mt-1 text-xs text-muted-foreground">可调整时间范围查看更远祭期</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((day) => (
                  <div
                    key={day.date_solar}
                    className="rounded-lg border p-3 transition-colors"
                    style={
                      day.offset_days === 0
                        ? {
                            borderColor: `color-mix(in srgb, ${PG_RED} 45%, transparent)`,
                            background: `color-mix(in srgb, ${PG_RED} 6%, transparent)`,
                          }
                        : { borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / .25)' }
                    }
                  >
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <span style={{ fontFamily: PG_SERIF }}>{formatSolarDate(day.date_solar)}</span>
                        <span className="text-xs text-muted-foreground">({day.date_lunar})</span>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={
                          day.offset_days === 0
                            ? { color: '#fff', background: PG_RED }
                            : { color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
                        }
                      >
                        {formatDaysOffset(day.offset_days)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {day.items.map((m) => (
                        <MemorialCard key={m.member_id} item={m} compact onRitual={() => setRitualMember(m)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          忌日按农历月日推算，每年循环 · 由成员逝世日期自动生成
        </p>
        <p
          className="text-center text-xs text-muted-foreground"
          style={{ fontFamily: PG_SERIF, letterSpacing: '0.3em' }}
        >
          愿先祖庇佑 · 子孙安康
        </p>

        {/* 周年祭：逝世仅登记年份的先人 —— 位牌墙 */}
        {yearOnly && yearOnly.length > 0 && (
          <div>
            <PgSectionHead
              text="周 年 牌 位"
              right={<span className="text-xs text-muted-foreground">{yearOnly.length} 位 · 仅登记逝世年份</span>}
            />
            <p className="mb-3 text-xs text-muted-foreground">
              这些先人只登记了逝世年份（无月日），无法排入忌日历。点击牌位同样可以献花、点烛、上香、叩首。
            </p>
            <TabletDefs />
            <div className="pg-shrine">
              {yearOnly.map((m) => (
                <div key={m.member_id} className="pg-plaque">
                  <div className="pg-plaque-glow" aria-hidden="true" />
                  <div
                    className="pg-tstack"
                    role="button"
                    tabIndex={0}
                    aria-label={`祭拜 ${m.member_name}`}
                    onClick={() => openRitual(m)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openRitual(m)
                      }
                    }}
                  >
                    <div className="pg-crest-cap" aria-hidden="true" />
                    <svg className="pg-crest" aria-hidden="true"><use href="#pg-crest-orn" /></svg>
                    <div className="pg-tbody">
                      <svg className="pg-dragon pg-dragon-dl" aria-hidden="true"><use href="#pg-dragon-orn" /></svg>
                      <div className="pg-panel">
                        <div className="pg-cols">
                          <span className="pg-cols-side">卒于{cnYear(m.death_year)}</span>
                          <span className="pg-cols-main">
                            <span className="pg-cols-nm">{m.member_name}</span>
                            <span className="pg-cols-zhi">之神位</span>
                          </span>
                          <span className="pg-cols-side">{m.gender === 'female' ? '顯妣' : '顯考'}</span>
                        </div>
                      </div>
                      <svg className="pg-dragon pg-dragon-dr" aria-hidden="true"><use href="#pg-dragon-orn" /></svg>
                    </div>
                    <div className="pg-ped1" aria-hidden="true" />
                    <div className="pg-ped2" aria-hidden="true" />
                  </div>
                  <button
                    className="pg-worship-btn"
                    onClick={() => openRitual(m)}
                    aria-label={`祭拜 ${m.member_name}`}
                  >
                    <Flame className="h-3 w-3" aria-hidden="true" />
                    祭拜
                  </button>
                </div>
              ))}
              <PgIncenseBurner signal={incenseSignal} />
            </div>
          </div>
        )}

        <MemorialRemindersSection familyId={familyId} isAdmin={true} />
      </div>

      {ritualMember && (
        <RitualModal
          familyId={familyId}
          member={ritualMember}
          onClose={() => setRitualMember(null)}
          onRitualSuccess={(k) => { if (k === 'incense') setIncenseSignal((s) => s + 1) }}
        />
      )}
    </Layout>
  )
}

/* ═══ 线上祭祀纪念弹窗（祭日页与家庙排位墙共用） ═══ */
export const RITUAL_BUTTONS: Array<{ kind: string; label: string; icon: typeof Flame }> = [
  { kind: 'flower', label: '献花', icon: Flower2 },
  { kind: 'candle', label: '点烛', icon: Flame },
  { kind: 'incense', label: '上香', icon: Sparkles },
  { kind: 'kowtow', label: '叩首', icon: Hand },
]

export function RitualModal({ familyId, member, onClose, onRitualSuccess }: {
  familyId: number
  member: MemorialItem
  onClose: () => void
  /** 祭拜成功回调（kind: flower/candle/incense/kowtow），供页面联动（如点燃香炉） */
  onRitualSuccess?: (kind: string) => void
}) {
  const { showToast } = useToast()
  const [rituals, setRituals] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.member_id])

  const load = async () => {
    try {
      const [r, m] = await Promise.all([
        api.getMemorialRituals(familyId, member.member_id),
        api.getMemorialMessages(familyId, member.member_id),
      ])
      setRituals(r)
      setMessages(m.messages || [])
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    }
  }

  const doRitual = async (kind: string) => {
    try {
      await api.sendMemorialRitual(familyId, member.member_id, kind)
      showToast('已奉上', 'success')
      onRitualSuccess?.(kind)
      setRituals(await api.getMemorialRituals(familyId, member.member_id))
    } catch (err: any) {
      showToast(err.message || '祭拜失败', 'error')
    }
  }

  const sendMessage = async () => {
    if (!draft.trim()) return
    setSending(true)
    try {
      await api.postMemorialMessage(familyId, member.member_id, draft.trim())
      setDraft('')
      setMessages((await api.getMemorialMessages(familyId, member.member_id)).messages || [])
    } catch (err: any) {
      showToast(err.message || '留言失败', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 flex max-h-[86vh] w-full max-w-md flex-col overflow-hidden rounded-lg border shadow-2xl"
        style={{ borderColor: `color-mix(in srgb, ${PG_RED} 35%, transparent)`, background: 'hsl(var(--card))' }}
        role="dialog"
        aria-modal="true"
      >
        {/* 牌位头 */}
        <div className="relative flex flex-col items-center gap-2 px-6 pb-4 pt-8 text-center"
          style={{ background: `color-mix(in srgb, ${PG_RED} 7%, transparent)` }}>
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
          {member.avatar ? (
            <img src={member.avatar} alt={member.member_name}
              className="h-16 w-16 rounded-full object-cover"
              style={{ boxShadow: `0 0 0 2px color-mix(in srgb, ${PG_RED} 45%, transparent)` }} />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-xl"
              style={{ background: 'hsl(var(--muted) / .4)', fontFamily: PG_SERIF }}
            >
              {member.member_name.charAt(0)}
            </div>
          )}
          <div className="text-lg" style={{ fontFamily: PG_SERIF }}>{member.member_name}</div>
          <div className="text-xs text-muted-foreground">{member.death_date_lunar} 忌辰</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {/* 祭拜按钮 */}
          <div className="grid grid-cols-4 gap-2">
            {RITUAL_BUTTONS.map(({ kind, label, icon: Icon }) => (
              <button
                key={kind}
                onClick={() => doRitual(kind)}
                className="flex flex-col items-center gap-1 rounded-md border py-2.5 transition-colors"
                style={{
                  borderColor: `color-mix(in srgb, ${PG_RED} 30%, transparent)`,
                  color: PG_RED,
                }}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs">{label}</span>
                <span className="text-[10px] text-muted-foreground">
                  今日 {rituals?.today_counts?.[kind] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* 追思留言 */}
          <div className="mt-6">
            <p className="mb-2 text-xs tracking-[0.25em] text-muted-foreground" style={{ fontFamily: PG_SERIF }}>
              追 思 留 言
            </p>
            <div className="space-y-2">
              {messages.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">尚无留言，写下你的追思</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className="rounded-md border px-3 py-2" style={{ borderColor: 'hsl(var(--border))' }}>
                  <p className="text-sm leading-relaxed">{m.content}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {m.user_name || '族人'} · {m.created_at?.slice(0, 10)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendMessage() }}
                placeholder="写下追思…"
                className="h-9 flex-1 rounded-md border px-3 text-sm outline-none"
                style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / .3)' }}
                maxLength={200}
              />
              <Button size="sm" onClick={sendMessage} disabled={!draft.trim() || sending}>
                {sending ? '…' : '提交'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MemorialCard({ item, highlight = false, compact = false, onRitual }: {
  item: MemorialItem
  highlight?: boolean
  compact?: boolean
  onRitual?: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors"
      style={
        highlight
          ? {
              borderColor: `color-mix(in srgb, ${PG_RED} 45%, transparent)`,
              background: `color-mix(in srgb, ${PG_RED} 7%, transparent)`,
            }
          : { borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / .3)' }
      }
    >
      {item.avatar ? (
        <img
          src={item.avatar}
          alt={item.member_name}
          className="h-10 w-10 shrink-0 rounded-full object-cover"
          style={{
            boxShadow: highlight
              ? `0 0 0 2px color-mix(in srgb, ${PG_RED} 45%, transparent)`
              : '0 0 0 2px hsl(var(--border))',
          }}
        />
      ) : (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm"
          style={{
            borderColor: highlight ? `color-mix(in srgb, ${PG_RED} 40%, transparent)` : 'hsl(var(--border))',
            background: 'hsl(var(--card))',
            fontFamily: PG_SERIF,
            color: highlight ? PG_RED : 'hsl(var(--muted-foreground))',
          }}
        >
          {item.member_name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm" style={{ fontFamily: PG_SERIF }}>
          {item.member_name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.year_ganzhi}
          {item.shengxiao}年 · {compact ? `${item.lunar_month}月${item.lunar_day}日` : item.death_date_lunar}
        </p>
      </div>
      <Flame
        className="h-4 w-4 shrink-0"
        style={{ color: highlight ? PG_RED : 'hsl(var(--muted-foreground))', opacity: highlight ? 1 : 0.4 }}
        aria-hidden="true"
      />
      {onRitual && (
        <button
          onClick={(e) => { e.stopPropagation(); onRitual() }}
          className="shrink-0 rounded-md border px-2 py-1 text-xs transition-colors"
          style={{
            borderColor: `color-mix(in srgb, ${PG_RED} 40%, transparent)`,
            color: PG_RED,
          }}
          aria-label={`祭拜 ${item.member_name}`}
        >
          祭拜
        </button>
      )}
    </div>
  )
}
