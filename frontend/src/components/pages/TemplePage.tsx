import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui'
import { PgPageHead, PgSectionHead, TabletDefs, cnYear, PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { api } from '@/lib/api'
import { smartBack } from '@/lib/smartBack'
import { ArrowLeft, Flame } from 'lucide-react'
import { formatPoem } from '@/lib/zibei'
import { RitualModal } from './MemorialPage'

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

export default function TemplePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [data, setData] = useState<TempleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deceased, setDeceased] = useState<Array<{ id: number; name: string; avatar: string | null; death_year: string | null; gender: string | null }>>([])
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

  useEffect(() => {
    load()
  }, [familyId])

  async function load() {
    setLoading(true)
    try {
      const [d, membersRes] = await Promise.all([
        api.getTemple(familyId),
        api.getMembers(familyId).catch(() => ({ members: [] })),
      ])
      setData(d)
      setDeceased(
        (membersRes.members || [])
          .filter((m: any) => m.is_alive === false)
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            avatar: m.avatar || null,
            death_year: m.death_date ? String(m.death_date).slice(0, 4) : null,
            gender: m.gender || null,
          })),
      )
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
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
                  <div className="pg-plaque-glow" aria-hidden="true" />
                  <div
                    className="pg-tstack"
                    role="button"
                    tabIndex={0}
                    aria-label={`祭拜 ${m.name}`}
                    onClick={() =>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
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
                  </div>
                  <button
                    className="pg-worship-btn"
                    onClick={() =>
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
                    aria-label={`祭拜 ${m.name}`}
                  >
                    <Flame className="h-3 w-3" aria-hidden="true" />
                    祭拜
                  </button>
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
        />
      )}
      </div>
    </Layout>
  )
}
