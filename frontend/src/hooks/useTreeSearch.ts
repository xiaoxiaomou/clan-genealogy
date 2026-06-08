import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

export interface TreeSearchHit {
  id: number
  name: string
  gender?: string
  generation?: number | null
  generation_name?: string | null
}

interface UseTreeSearchOptions {
  familyId?: number
  /** 命中后回调（FamilyTreeGraph 用来 setCenter + pulse） */
  onLocate: (memberId: number, hit: TreeSearchHit) => void
  onClose?: () => void
}

interface UseTreeSearchReturn {
  open: boolean
  setOpen: (b: boolean) => void
  toggle: () => void
  query: string
  setQuery: (q: string) => void
  results: TreeSearchHit[]
  loading: boolean
  pick: (hit: TreeSearchHit) => void
}

/**
 * 树图内搜索（Cmd/Ctrl+F 触发，模糊匹配成员名）
 * 复用后端 GET /api/family/<id>/search?q=
 */
export function useTreeSearch({ familyId, onLocate, onClose }: UseTreeSearchOptions): UseTreeSearchReturn {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TreeSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reqIdRef = useRef(0)

  const toggle = useCallback(() => {
    setOpen(o => {
      const next = !o
      if (!next) {
        setQuery('')
        setResults([])
        onClose?.()
      }
      return next
    })
  }, [onClose])

  // Cmd/Ctrl+F 快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        toggle()
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
        setQuery('')
        setResults([])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, open])

  // 搜索：去抖 200ms
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || !familyId) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const reqId = ++reqIdRef.current
      setLoading(true)
      try {
        const data = await api.search(familyId, query.trim())
        if (reqId !== reqIdRef.current) return
        const items: TreeSearchHit[] = (data?.members || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          gender: m.gender,
          generation: m.generation,
          generation_name: m.generation_name,
        }))
        setResults(items)
      } catch {
        if (reqId === reqIdRef.current) setResults([])
      } finally {
        if (reqId === reqIdRef.current) setLoading(false)
      }
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open, familyId])

  const pick = useCallback(
    (hit: TreeSearchHit) => {
      onLocate(hit.id, hit)
      setOpen(false)
      setQuery('')
      setResults([])
    },
    [onLocate]
  )

  return { open, setOpen, toggle, query, setQuery, results, loading, pick }
}
