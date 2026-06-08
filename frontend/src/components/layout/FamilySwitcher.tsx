import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { TreePine, ChevronDown, Plus, Check, Users, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppDispatch, useAppSelector, setCurrentFamilyId, addToast } from '@/store'

interface Family {
  id: number
  name: string
  surname?: string | null
  origin?: string | null
  member_count?: number
}

export function FamilySwitcher() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const currentFamilyId = useAppSelector((s) => s.app.currentFamilyId)
  const params = useParams<{ familyId?: string }>()
  const routeFamilyId = params.familyId ? Number(params.familyId) : null

  const [open, setOpen] = useState(false)
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeId = routeFamilyId ?? currentFamilyId
  const activeFamily = families.find((f) => f.id === activeId)

  const loadFamilies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getFamilies()
      setFamilies(data.families || [])
    } catch (err: any) {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFamilies()
  }, [loadFamilies])

  // 路由里 familyId 变化时同步到 store
  useEffect(() => {
    if (routeFamilyId && routeFamilyId !== currentFamilyId) {
      dispatch(setCurrentFamilyId(routeFamilyId))
    }
  }, [routeFamilyId, currentFamilyId, dispatch])

  // 点击外部关闭
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const switchTo = (id: number) => {
    setOpen(false)
    dispatch(setCurrentFamilyId(id))
    // 智能跳转：保持当前路径 /family/:familyId/xxx 的 familyId 部分
    const path = location.pathname
    if (path.match(/^\/family\/\d+/)) {
      navigate(path.replace(/^\/family\/\d+/, `/family/${id}`))
    } else {
      navigate(`/family/${id}`)
    }
    dispatch(addToast({ message: '已切换家族', type: 'success' }))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-border/30 bg-foreground/3 px-2.5 text-xs text-foreground transition-colors hover:border-border/60 hover:bg-foreground/6"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="切换家族"
        title="切换家族"
      >
        <TreePine className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
        <span className="max-w-[120px] truncate font-medium">
          {activeFamily?.name || (activeId ? '加载中…' : '选择家族')}
        </span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-border/30 bg-background/95 shadow-xl backdrop-blur-xl"
          role="menu"
        >
          <div className="flex items-center justify-between border-b border-border/20 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              我的家族 · {families.length}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); loadFamilies() }}
              className="rounded p-0.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              aria-label="刷新家族列表"
              title="刷新"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading && families.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">加载中…</div>
            ) : families.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">尚未加入任何家族</div>
            ) : (
              families.map((f) => {
                const isActive = f.id === activeId
                return (
                  <button
                    key={f.id}
                    onClick={() => switchTo(f.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      isActive ? 'bg-amber-700/10 text-foreground' : 'text-foreground/85 hover:bg-foreground/5'
                    }`}
                    role="menuitem"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-700/10 text-amber-700">
                      <TreePine className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{f.name}</span>
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                        {f.surname && <span>{f.surname}氏</span>}
                        {f.member_count != null && (
                          <>
                            {f.surname && <span>·</span>}
                            <span className="flex items-center gap-0.5">
                              <Users className="h-2.5 w-2.5" /> {f.member_count}
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                    {isActive && <Check className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />}
                  </button>
                )
              })
            )}
          </div>
          <div className="border-t border-border/20 bg-foreground/2 p-1.5">
            <button
              onClick={() => { setOpen(false); navigate('/') }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              新建 / 管理家族
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
