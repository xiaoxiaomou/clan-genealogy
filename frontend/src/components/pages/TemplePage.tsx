import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { ArrowLeft, ScrollText, Sparkles, MapPin } from 'lucide-react'
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
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)' }}
      >
        <p className="text-amber-100">焚香候...</p>
      </div>
    )
  }

  const poem = formatPoem(data.zibei_text, 10)

  return (
    <div
      className="min-h-screen p-4 sm:p-8"
      style={{
        background: 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)',
      }}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-2 text-amber-100">
          <button
            onClick={() => navigate(`/family/${familyId}`)}
            className="flex items-center gap-1 text-sm hover:text-amber-300"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
        </div>

        {/* 匾额 */}
        <div className="relative overflow-hidden rounded-lg border-2 border-amber-700/40 bg-gradient-to-br from-amber-900/40 to-stone-900/60 p-8 text-center shadow-2xl">
          <div className="absolute inset-0 opacity-20" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(245, 230, 211, 0.1) 10px, rgba(245, 230, 211, 0.1) 11px)',
          }} />
          <div className="relative">
            <div className="mb-2 text-xs tracking-[0.5em] text-amber-300/60">家 庙</div>
            <h1 className="font-serif text-5xl font-bold text-amber-100">
              {data.family.surname || data.family.name}氏家庙
            </h1>
            <div className="mt-3 text-sm text-amber-200/70">
              {data.family.origin && <>发祥于 {data.family.origin}</>}
            </div>
            <div className="mt-1 text-xs text-amber-200/40">
              {data.family.created_at?.slice(0, 4)} 年立 · 现存 {data.descendant_count_5gen} 位五代内后昆
            </div>
          </div>
        </div>

        {/* 始祖 */}
        {data.founder && (
          <Card className="border-amber-700/30 bg-stone-900/50">
            <CardContent className="p-6">
              <h2 className="mb-3 flex items-center gap-2 font-serif text-xl text-amber-200">
                <Sparkles className="h-4 w-4" />
                始祖
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-700/50 bg-amber-100 text-3xl font-serif text-amber-900">
                  {data.founder.name?.[0] || '?'}
                </div>
                <div className="space-y-1">
                  <div className="font-serif text-2xl text-amber-100">{data.founder.name}</div>
                  <div className="text-sm text-amber-200/70">
                    第 {data.founder.generation || '?'} 代 · {data.founder.gender === 'male' ? '公' : '氏'}
                  </div>
                  <div className="text-xs text-amber-200/50">
                    {data.founder.birth_year || '?'} - {data.founder.death_year || '今'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 家训 */}
        {data.motto && (
          <Card className="border-amber-700/30 bg-stone-900/50">
            <CardContent className="p-6">
              <h2 className="mb-3 flex items-center gap-2 font-serif text-xl text-amber-200">
                <ScrollText className="h-4 w-4" />
                家训
              </h2>
              <p className="font-serif text-lg leading-loose text-amber-100/90">{data.motto}</p>
            </CardContent>
          </Card>
        )}

        {/* 家族简介 */}
        {(data.intro || data.description) && (
          <Card className="border-amber-700/30 bg-stone-900/50">
            <CardContent className="p-6">
              <h2 className="mb-3 flex items-center gap-2 font-serif text-xl text-amber-200">
                <MapPin className="h-4 w-4" />
                家族简介
              </h2>
              <div
                className="prose prose-invert prose-sm max-w-none font-serif text-amber-100/80"
                dangerouslySetInnerHTML={{ __html: data.intro || data.description || '<p class="text-amber-200/40">（未填写）</p>' }}
              />
            </CardContent>
          </Card>
        )}

        {/* 字辈诗 */}
        {poem.length > 0 && (
          <Card className="border-amber-700/30 bg-stone-900/50">
            <CardContent className="p-6">
              <h2 className="mb-3 flex items-center gap-2 font-serif text-xl text-amber-200">
                <Sparkles className="h-4 w-4" />
                字辈诗
              </h2>
              {data.zibei_description && (
                <p className="mb-4 text-sm text-amber-200/60">{data.zibei_description}</p>
              )}
              <div className="space-y-2 rounded border border-amber-700/30 bg-stone-950/50 p-4 font-serif text-lg leading-loose">
                {poem.map((line, idx) => (
                  <div key={idx} className="flex justify-center gap-2 text-amber-100">
                    {line.split('').map((c, i) => (
                      <span key={i}>{c}</span>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-amber-200/30">
          愿家族昌盛，子孙兴旺
        </p>
      </div>
    </div>
  )
}
