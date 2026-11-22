import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui'
import { PgPageHead, PgSectionHead, PgFlowers, PgIncenseBurner, TabletDefs, offeringAlive, cnYear, PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { api } from '@/lib/api'
import { smartBack } from '@/lib/smartBack'
import { ArrowLeft, Pencil } from 'lucide-react'
import { formatPoem } from '@/lib/zibei'
import { RitualModal, RITUAL_BUTTONS, RitualVisitorTip, getMeName, type VisitorInfo } from './MemorialPage'

interface TempleData {
  family: any
  founder: any
  zibei_chars: string[]
  zibei_text: string
  zibei_description: string
  motto: string
  intro: string
  description: string
  descendant_count_5gen: number
}


/* ── 供品生命周期：从最近一次供奉起算，到点自然消失 ── */
const OFFERING_LIFE: Record<string, number> = {
  incense: 30 * 60 * 1000,    // 一炷香约 30 分钟烧尽
  candle: 2 * 60 * 60 * 1000, // 一对烛约 2 小时烧完
  flower: 4 * 60 * 60 * 1000, // 花摆 4 小时后撤下
}

export default function TemplePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [data, setData] = useState<TempleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deceased, setDeceased] = useState<Array<{ id: number; name: string; avatar: string | null; death_year: string | null; gender: string | null; generation: number | null }>>([])
  const [ritualMember, setRitualMember] = useState<{
    member_id: number
    member_name: string
    avatar: string | null
    death_date_solar: string
    death_date_lunar: string
    year_ganzhi: string
    shengxiao: string
    lunar_month: number
    lunar_day: number
  } | null>(null)
  const [ritualCounts, setRitualCounts] = useState<Record<number, Record<string, number>>>({})
  const [lastKinds, setLastKinds] = useState<Record<number, Record<string, string>>>({})
  const [, setFxTick] = useState(0)

  // 供品生命周期滴答：每 30 秒重算一次香/烛/花是否仍在存留期内
  useEffect(() => {
    const t = window.setInterval(() => setFxTick((x) => x + 1), 30_000)
    return () => window.clearInterval(t)
  }, [])
  const [visitors, setVisitors] = useState<Record<number, VisitorInfo[]>>({})
  const [bowingId, setBowingId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const bowTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      setIsAdmin(!!u.is_admin)
    } catch {
      /* ignore */
    }
    load()
  }, [familyId])

  async function load() {
    setLoading(true)
    try {
      const [d, membersRes, rc] = await Promise.all([
        api.getTemple(familyId),
        api.getMembers(familyId).catch(() => ({ members: [] })),
        api.getRitualTodaySummary(familyId).catch(() => ({ summary: {} })),
      ])
      setData(d)
      setRitualCounts(rc.summary || {})
      setVisitors(rc.visitors || {})
      setLastKinds(rc.last_kinds || {})
      setDeceased(
        (membersRes.members || [])
          .filter((m: any) => m.is_alive === false)
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            avatar: m.avatar || null,
            death_year: m.death_date ? String(m.death_date).slice(0, 4) : null,
            gender: m.gender || null,
            generation: typeof m.generation === 'number' ? m.generation : null,
          }))
          .sort((a: any, b: any) => {
            // 昭穆有序：辈分（世代）升序，同辈按卒年、姓名
            const ga = a.generation ?? 9999
            const gb = b.generation ?? 9999
            if (ga !== gb) return ga - gb
            const ya = a.death_year || '9999'
            const yb = b.death_year || '9999'
            if (ya !== yb) return ya.localeCompare(yb)
            return (a.name || '').localeCompare(b.name || '')
          }),
      )
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  /** 牌位直拜：动作 + 本地计数 + 对应特效（香炉点香 / 红烛点亮 / 牌位躬身）+ 访客上榜 */
  const bumpRitual = (memberId: number, kind: string) => {
    setRitualCounts((p) => {
      const bucket = { ...(p[memberId] || { flower: 0, candle: 0, incense: 0, kowtow: 0 }) }
      bucket[kind] = (bucket[kind] || 0) + 1
      return { ...p, [memberId]: bucket }
    })
    setVisitors((p) => {
      const meName = getMeName()
      const list = p[memberId] ? [...p[memberId]] : []
      const idx = list.findIndex((v) => v.user_name === meName)
      if (idx >= 0) {
        const v = { ...list[idx], kinds: [...list[idx].kinds] }
        const k = v.kinds.find((x) => x.kind === kind)
        if (k) k.n += 1
        else v.kinds.push({ kind, n: 1 })
        v.last_at = new Date().toISOString()
        list.splice(idx, 1)
        list.unshift(v)
        return { ...p, [memberId]: list }
      }
      return {
        ...p,
        [memberId]: [{ user_name: meName, kinds: [{ kind, n: 1 }], last_at: new Date().toISOString() }, ...list].slice(0, 6),
      }
    })
    setLastKinds((p) => ({ ...p, [memberId]: { ...(p[memberId] || {}), [kind]: new Date().toISOString() } }))
        if (kind === 'kowtow') {
      setBowingId(memberId)
      window.clearTimeout(bowTimer.current)
      bowTimer.current = window.setTimeout(() => setBowingId(null), 980)
    }
  }

  const quickRitual = async (memberId: number, kind: string) => {
    try {
      await api.sendMemorialRitual(familyId, memberId, kind)
      showToast('已奉上', 'success')
      bumpRitual(memberId, kind)
    } catch (err: any) {
      showToast(err.message || '祭拜失败', 'error')
    }
  }

  if (loading || !data) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    )
  }

  const poem = formatPoem(data.zibei_text, 10)

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 pg-rise">
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
          eyebrow="谱 牒 · 家 庙"
          title={`${data.family.surname || data.family.name}氏家庙`}
          subtitle={
            <>
              {data.family.origin && <>发祥于 {data.family.origin} · </>}
              {data.family.created_at?.slice(0, 4)} 年立 · 现存 {data.descendant_count_5gen} 位五代内后昆
            </>
          }
        />

        {/* 始祖 */}
        {data.founder && (
          <div>
            <PgSectionHead text="始 祖" />
            <div className="pg-card p-6">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border text-3xl"
                  style={{
                    borderColor: 'hsl(var(--border))',
                    background: 'hsl(var(--muted) / .3)',
                    fontFamily: PG_SERIF,
                  }}
                  aria-hidden="true"
                >
                  {data.founder.name?.[0] || '?'}
                </div>
                <div className="space-y-1">
                  <div className="text-2xl" style={{ fontFamily: PG_SERIF, letterSpacing: '0.06em' }}>
                    {data.founder.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    第 {data.founder.generation || '?'} 代 · {data.founder.gender === 'male' ? '公' : '氏'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {data.founder.birth_year || '?'} - {data.founder.death_year || '今'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 家训挂轴 */}
        {data.motto && (
          <div>
            <PgSectionHead text="家 训" />
            <div className="pg-card flex justify-center px-6 py-8" style={{ background: 'hsl(var(--muted) / .3)' }}>
              <div
                className="rounded-[4px] px-5 pb-3 pt-5"
                style={{
                  border: `1px solid color-mix(in srgb, ${PG_RED} 35%, transparent)`,
                  outline: `3px solid color-mix(in srgb, ${PG_RED} 10%, transparent)`,
                  outlineOffset: 3,
                  background: 'hsl(var(--card))',
                }}
              >
                <div
                  className="pg-vertical-text mx-auto max-h-56 text-lg font-semibold"
                  style={{ color: PG_RED, lineHeight: 1.7 }}
                >
                  {data.motto}
                </div>
                <div
                  className="mx-auto mt-2 flex h-5 w-5 rotate-3 items-center justify-center rounded-[3px] text-[11px] font-semibold text-white"
                  style={{ background: PG_RED, fontFamily: PG_SERIF }}
                  aria-hidden="true"
                >
                  训
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 家族简介 */}
        {(data.intro || data.description) && (
          <div>
            <PgSectionHead text="家 族 简 介" />
            <div className="pg-card p-6">
              <div
                className="prose prose-sm max-w-none text-sm leading-relaxed"
                style={{ color: 'hsl(var(--foreground) / 0.8)' }}
                dangerouslySetInnerHTML={{ __html: data.intro || data.description }}
              />
            </div>
          </div>
        )}

        {/* 字辈诗 */}
        {poem.length > 0 && (
          <div>
            <PgSectionHead text="字 辈 诗" />
            <div className="pg-card p-6">
              {data.zibei_description && (
                <p className="mb-4 text-sm text-muted-foreground">{data.zibei_description}</p>
              )}
              <div className="pg-card-soft space-y-2 p-4">
                {poem.map((line, idx) => (
                  <div
                    key={idx}
                    className="flex justify-center gap-2 text-lg leading-loose"
                    style={{ fontFamily: PG_SERIF, letterSpacing: '0.1em' }}
                  >
                    {line.split('').map((c, i) => (
                      <span key={i}>{c}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 排位墙：已故族人 · 线上祭祀（位牌墙） */}
        {deceased.length > 0 && (
          <div>
            <PgSectionHead text="排 位 · 线 上 祭 祀" />
            <p className="mb-4 text-xs text-muted-foreground">
              点击牌位可献花、点烛、上香、叩首，并留下追思留言。
            </p>
            <TabletDefs />
            <div className="pg-shrine">
              {deceased.map((m) => (
                <div key={m.id} className="pg-plaque">
                  <div className="pg-plaque-tools">
                    {isAdmin && (
                      <button
                        className="pg-tool-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/family/${familyId}/member/${m.id}`)
                        }}
                        title="维护牌位信息（名讳/称谓/卒年）"
                      >
                        <Pencil aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <RitualVisitorTip visitors={visitors[m.id]} />
                  <div className="pg-plaque-glow" aria-hidden="true" />
                  <div
                    className={`pg-tstack ${bowingId === m.id ? 'pg-bowing' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label={isAdmin ? `维护 ${m.name} 的牌位信息` : `祭拜 ${m.name}`}
                    onClick={() => {
                      if (isAdmin) {
                        navigate(`/family/${familyId}/member/${m.id}`)
                        return
                      }
                      setRitualMember({
                        member_id: m.id,
                        member_name: m.name,
                        avatar: m.avatar,
                        death_date_solar: '',
                        death_date_lunar: m.death_year ? `${m.death_year} 年卒` : '在册先人',
                        year_ganzhi: '',
                        shengxiao: '',
                        lunar_month: 0,
                        lunar_day: 0,
                      })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        if (isAdmin) {
                          navigate(`/family/${familyId}/member/${m.id}`)
                          return
                        }
                        setRitualMember({
                          member_id: m.id,
                          member_name: m.name,
                          avatar: m.avatar,
                          death_date_solar: '',
                          death_date_lunar: m.death_year ? `${m.death_year} 年卒` : '在册先人',
                          year_ganzhi: '',
                          shengxiao: '',
                          lunar_month: 0,
                          lunar_day: 0,
                        })
                      }
                    }}
                  >
                    <div className="pg-crest-cap" aria-hidden="true" />
                    <svg className="pg-crest" aria-hidden="true"><use href="#pg-crest-orn" /></svg>
                    <div className="pg-tbody">
                      <svg className="pg-dragon pg-dragon-dl" aria-hidden="true"><use href="#pg-dragon-orn" /></svg>
                      <div className="pg-panel">
                        <div className="pg-cols">
                          {m.death_year && <span className="pg-cols-side">卒于{cnYear(m.death_year)}</span>}
                          <span className="pg-cols-main">
                            <span className="pg-cols-nm">{m.name}</span>
                            <span className="pg-cols-zhi">之神位</span>
                          </span>
                          <span className="pg-cols-side">{m.gender === 'female' ? '顯妣' : '顯考'}</span>
                        </div>
                      </div>
                      <svg className="pg-dragon pg-dragon-dr" aria-hidden="true"><use href="#pg-dragon-orn" /></svg>
                    </div>
                    <div className="pg-ped1" aria-hidden="true" />
                    <div className="pg-ped2" aria-hidden="true" />
                    <PgFlowers count={offeringAlive(lastKinds[m.id]?.flower, ritualCounts[m.id]?.flower || 0, OFFERING_LIFE.flower)} />
                  </div>
                  <PgIncenseBurner mini persist signal={offeringAlive(lastKinds[m.id]?.incense, ritualCounts[m.id]?.incense || 0, OFFERING_LIFE.incense)} candle={offeringAlive(lastKinds[m.id]?.candle, (ritualCounts[m.id]?.candle || 0) > 0 ? 1 : 0, OFFERING_LIFE.candle) > 0} />
                  <div className="pg-quick-rituals" role="group" aria-label={`为 ${m.name} 祭拜`}>
                    {RITUAL_BUTTONS.map(({ kind, label, icon: Icon }) => (
                      <button
                        key={kind}
                        className="pg-quick-ritual"
                        onClick={() => quickRitual(m.id, kind)}
                        aria-label={`${label} · 今日 ${ritualCounts[m.id]?.[kind] || 0} 次`}
                        title={`${label}（今日 ${ritualCounts[m.id]?.[kind] || 0}）`}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="pg-quick-n">{ritualCounts[m.id]?.[kind] || 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p
          className="text-center text-xs text-muted-foreground"
          style={{ fontFamily: PG_SERIF, letterSpacing: '0.3em' }}
        >
          愿家族昌盛 · 子孙兴旺
        </p>

      {ritualMember && (
        <RitualModal
          familyId={familyId}
          member={ritualMember}
          onClose={() => setRitualMember(null)}
          onRitualSuccess={(k, mid) => { if (mid) bumpRitual(mid, k) }}
        />
      )}
      </div>
    </Layout>
  )
}
