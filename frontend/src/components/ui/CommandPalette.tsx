import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Search,
  X,
  User,
  Calendar,
  Megaphone,
  TreePine,
  Home,
  Sun,
  Moon,
  Brush,
  Plus,
  ChartLine,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Clock,
  Settings,
  Compass,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppDispatch, useAppSelector, addToast } from '@/store'
import { setTheme } from '@/store/slices/appSlice'
import type { ThemeMode } from '@/store/slices/appSlice'

interface CmdItem {
  type: string
  id: string | number
  family_id?: number
  title: string
  subtitle?: string
  path?: string
  icon?: string
  action?: string
  value?: string
}

interface CmdGroup {
  label: string
  items: CmdItem[]
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User,
  calendar: Calendar,
  megaphone: Megaphone,
  tree: TreePine,
  home: Home,
  sun: Sun,
  moon: Moon,
  brush: Brush,
  plus: Plus,
  chart: ChartLine,
  settings: Settings,
  compass: Compass,
}

const RECENT_KEY = 'cmd_palette_recent'
const MAX_RECENT = 6

function loadRecent(): CmdItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as CmdItem[]) : []
  } catch {
    return []
  }
}

function saveRecent(item: CmdItem) {
  try {
    const current = loadRecent().filter((x) => x.id !== item.id || x.type !== item.type)
    const next = [item, ...current].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

function clearRecent() {
  try { localStorage.removeItem(RECENT_KEY) } catch { /* ignore */ }
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const params = useParams<{ familyId?: string }>()
  const familyId = params.familyId ? Number(params.familyId) : null

  const [q, setQ] = useState('')
  const [groups, setGroups] = useState<CmdGroup[]>([])
  const [actions, setActions] = useState<CmdItem[]>([])
  const [recent, setRecent] = useState<CmdItem[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 加载 quick actions + recent
  useEffect(() => {
    if (!open) return
    setRecent(loadRecent())
    api.quickActions()
      .then((data) => setActions(data.actions || []))
      .catch(() => setActions([]))
  }, [open])

  useEffect(() => {
    if (open) {
      setQ('')
      setGroups([])
      setActive(0)
      // 防止 body 滚动
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      // 聚焦输入框
      setTimeout(() => inputRef.current?.focus(), 30)
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  // 防抖搜索
  useEffect(() => {
    if (!open) return
    const term = q.trim()
    if (!term) {
      setGroups([])
      setActive(0)
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      api.globalSearch(term, familyId, 8)
        .then((data) => {
          setGroups(data.groups || [])
          setActive(0)
        })
        .catch(() => setGroups([]))
        .finally(() => setLoading(false))
    }, 180)
    return () => clearTimeout(timer)
  }, [q, familyId, open])

  // 扁平化当前可见 items（用于键盘导航）
  const flatItems: CmdItem[] = useMemo(() => {
    if (q.trim()) {
      return groups.flatMap((g) => g.items)
    }
    // 无 query 时：recent + actions
    return [...recent, ...actions]
  }, [groups, actions, recent, q])

  // 滚动到 active
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-cmd-index="${active}"]`) as HTMLElement | null
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [active])

  const execute = useCallback((item: CmdItem) => {
    if (item.action === 'navigate' && item.path) {
      saveRecent(item)
      navigate(item.path)
    } else if (item.action === 'theme' && item.value) {
      dispatch(setTheme(item.value as ThemeMode))
      dispatch(addToast({ message: `已切换到${item.title.replace('切换到', '')}`, type: 'success' }))
    } else if (item.path) {
      saveRecent(item)
      navigate(item.path)
    } else {
      dispatch(addToast({ message: '暂未实现该动作', type: 'info' }))
    }
    onClose()
  }, [navigate, dispatch, onClose])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(flatItems.length - 1, i + 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[active]
      if (item) execute(item)
    }
  }

  if (!open) return null

  const renderIcon = (item: CmdItem) => {
    const Icon = ICON_MAP[item.icon || 'compass'] || Compass
    return <Icon className="h-4 w-4" aria-hidden="true" />
  }

  const renderGroup = (group: CmdGroup, baseIdx: number) => (
    <div key={group.label} className="px-1 py-1">
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {group.label}
      </div>
      {group.items.map((item, i) => {
        const globalIdx = baseIdx + i
        const isActive = globalIdx === active
        return (
          <button
            key={`${group.label}-${item.type}-${item.id}`}
            data-cmd-index={globalIdx}
            onMouseEnter={() => setActive(globalIdx)}
            onClick={() => execute(item)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
              isActive
                ? 'bg-amber-700/15 text-foreground dark:bg-amber-700/25'
                : 'text-foreground/80 hover:bg-foreground/5'
            }`}
            role="option"
            aria-selected={isActive}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-foreground/70">
              {renderIcon(item)}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate text-sm font-medium">{item.title}</span>
              {item.subtitle && (
                <span className="block truncate text-xs text-muted-foreground/70">
                  {item.subtitle}
                </span>
              )}
            </span>
            {isActive && (
              <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-500" aria-hidden="true" />
            )}
          </button>
        )
      })}
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] sm:pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="命令面板"
      onKeyDown={onKeyDown}
    >
      <div
        className="fixed inset-0 bg-foreground/30 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-[92vw] max-w-2xl overflow-hidden rounded-2xl border border-border/30 bg-background/95 shadow-2xl backdrop-blur-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border/20 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索成员、事件、动态、动作…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            aria-label="搜索"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" aria-hidden="true" />
          )}
          <kbd className="hidden rounded border border-border/40 bg-foreground/5 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-foreground/5 sm:hidden"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={listRef}
          className="max-h-[55vh] overflow-y-auto px-1 py-1"
          role="listbox"
        >
          {q.trim() ? (
            flatItems.length === 0 && !loading ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  没有找到 "<span className="text-foreground">{q}</span>" 相关结果
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  试试切换家族上下文，或用快捷键 ⏎ 直接跳转
                </p>
              </div>
            ) : (
              groups.map((g, gi) => {
                const base = groups.slice(0, gi).reduce((s, x) => s + x.items.length, 0)
                return renderGroup(g, base)
              })
            )
          ) : (
            <>
              {recent.length > 0 && (
                <div className="px-1 py-1">
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      最近
                    </span>
                    <button
                      onClick={() => { clearRecent(); setRecent([]) }}
                      className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground"
                    >
                      清除
                    </button>
                  </div>
                  {recent.map((item, i) => {
                    const isActive = i === active
                    return (
                      <button
                        key={`recent-${item.type}-${item.id}`}
                        data-cmd-index={i}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => execute(item)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                          isActive
                            ? 'bg-amber-700/15 text-foreground dark:bg-amber-700/25'
                            : 'text-foreground/80 hover:bg-foreground/5'
                        }`}
                        role="option"
                        aria-selected={isActive}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-foreground/70">
                          <Clock className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-sm font-medium">{item.title}</span>
                          {item.subtitle && (
                            <span className="block truncate text-xs text-muted-foreground/70">
                              {item.subtitle}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-500" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
              {actions.length > 0 && (
                <div className="px-1 py-1">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    快捷动作
                  </div>
                  {actions.map((item, i) => {
                    const globalIdx = recent.length + i
                    const isActive = globalIdx === active
                    return (
                      <button
                        key={item.id}
                        data-cmd-index={globalIdx}
                        onMouseEnter={() => setActive(globalIdx)}
                        onClick={() => execute(item)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                          isActive
                            ? 'bg-amber-700/15 text-foreground dark:bg-amber-700/25'
                            : 'text-foreground/80 hover:bg-foreground/5'
                        }`}
                        role="option"
                        aria-selected={isActive}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-foreground/70">
                          {renderIcon(item)}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-sm font-medium">{item.title}</span>
                          {item.subtitle && (
                            <span className="block truncate text-xs text-muted-foreground/70">
                              {item.subtitle}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-500" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/20 bg-foreground/2 px-3 py-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-border/40 bg-background px-1.5 py-0.5 font-mono">
              <ArrowUp className="inline h-2.5 w-2.5" /> <ArrowDown className="inline h-2.5 w-2.5" />
            </kbd>
            <span>选择</span>
            <kbd className="rounded border border-border/40 bg-background px-1.5 py-0.5 font-mono">⏎</kbd>
            <span>执行</span>
            <kbd className="rounded border border-border/40 bg-background px-1.5 py-0.5 font-mono">Esc</kbd>
            <span>关闭</span>
          </div>
          <span className="hidden sm:inline">⌘K / Ctrl+K 随时唤起</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
