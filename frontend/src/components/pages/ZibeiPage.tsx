import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import ZibeiPoemEditor from './ZibeiPoemEditor'

const BG = 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)'

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
      <div className="flex min-h-screen items-center justify-center" style={{ background: BG }}>
        <p className="text-amber-100">展卷候...</p>
      </div>
    )
  }

  const titleText = familySurname ? `${familySurname}氏` : (familyName || '本族')

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: BG }}>
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
            <div className="mb-2 text-xs tracking-[0.5em] text-amber-300/60">字 辈 诗 牒</div>
            <h1 className="font-serif text-5xl font-bold text-amber-100">
              {titleText}字辈
            </h1>
            <div className="mt-3 text-sm text-amber-200/70">
              {charCount > 0 ? <>共 {charCount} 字 · 代代相承</> : '尚未立诗'}
            </div>
          </div>
        </div>

        <ZibeiPoemEditor
          familyId={familyId}
          canEdit={canEdit}
          familySurname={familySurname}
          onConfigChange={(cfg) => setCharCount((cfg.zibei_text || '').replace(/[^\u4e00-\u9fff]/g, '').length)}
        />

        <p className="text-center text-xs text-amber-200/30">
          愿字辈绵延，家声永振
        </p>
      </div>
    </div>
  )
}
