import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui'
import { PgPageHead, PgSectionHead, PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { api } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import { formatPoem } from '@/lib/zibei'

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

  useEffect(() => {
    load()
  }, [familyId])

  async function load() {
    setLoading(true)
    try {
      const d = await api.getTemple(familyId)
      setData(d)
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
            onClick={() => navigate(`/family/${familyId}`)}
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

        <p
          className="text-center text-xs text-muted-foreground"
          style={{ fontFamily: PG_SERIF, letterSpacing: '0.3em' }}
        >
          愿家族昌盛 · 子孙兴旺
        </p>
      </div>
    </Layout>
  )
}
