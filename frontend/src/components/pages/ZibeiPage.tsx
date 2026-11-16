import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { smartBack } from '@/lib/smartBack'
import { ArrowLeft } from 'lucide-react'
import { PgPageHead, PgSeal, PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import ZibeiPoemEditor from './ZibeiPoemEditor'

export default function ZibeiPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const familyId = Number(id)

  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [familyName, setFamilyName] = useState('')
  const [familySurname, setFamilySurname] = useState('')
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    if (!familyId) return
    loadMeta()
  }, [familyId])

  async function loadMeta() {
    setLoading(true)
    try {
      const [role, familyRes, zibeiRes] = await Promise.all([
        api.getMyRole(familyId),
        api.getFamily(familyId).catch(() => null),
        api.getZibei(familyId).catch(() => null),
      ])
      setCanEdit(!!role?.can_edit)
      setFamilyName(familyRes?.family?.name || '')
      setFamilySurname(familyRes?.family?.surname || '')
      setCharCount((zibeiRes?.parsed_chars || []).length)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    )
  }

  const titleText = familySurname ? `${familySurname}氏` : (familyName || '本族')

  return (
    <Layout>
      <div className="pg-rise mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-5">
          <button
            onClick={() => smartBack(navigate, `/family/${familyId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回族谱
          </button>
        </div>

        <PgPageHead
          eyebrow="谱 牒 · 字 辈"
          title={`${titleText}字辈`}
          subtitle={
            charCount > 0 ? (
              <>
                共 <b style={{ fontFamily: PG_SERIF, color: PG_RED }}>{charCount}</b> 字 · 代代相承
              </>
            ) : (
              '尚未立诗，待修谱人补录字辈诗'
            )
          }
        />

        {/* 字辈印 + 版刻行 */}
        {charCount > 0 && (
          <section className="pg-card mb-6 flex items-center gap-4 px-5 py-4">
            <PgSeal char={familySurname || '辈'} size={44} title="字辈印" />
            <div className="pg-colophon flex-1">
              <span>
                字辈字数 <b style={{ fontFamily: PG_SERIF, color: PG_RED }}>{charCount} 字</b>
              </span>
              <span aria-hidden="true" className="pg-colophon-sep" />
              <span>
                体例 <b>同辈共取一字 · 昭穆分明</b>
              </span>
            </div>
          </section>
        )}

        <ZibeiPoemEditor
          familyId={familyId}
          canEdit={canEdit}
          familySurname={familySurname}
          onConfigChange={(cfg) => setCharCount((cfg.zibei_text || '').replace(/[^\u4e00-\u9fff]/g, '').length)}
        />

        <p
          className="mt-10 text-center text-xs tracking-[0.3em] text-muted-foreground"
          style={{ fontFamily: PG_SERIF }}
        >
          愿字辈绵延 · 家声永振
        </p>
      </div>
    </Layout>
  )
}
