import { useState, useRef, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { setTheme, selectTheme, type ThemeMode } from '@/store/slices/appSlice'
import { Sun, Moon, Monitor, Brush, Check, ChevronDown } from 'lucide-react'

const OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun; desc: string; color: string }[] = [
  { value: 'light', label: '浅色', icon: Sun, desc: '素雅清新', color: 'text-amber-500' },
  { value: 'dark', label: '深色', icon: Moon, desc: '古朴典雅', color: 'text-slate-400' },
  { value: 'ink', label: '墨韵', icon: Brush, desc: '水墨晕染', color: 'text-stone-300' },
  { value: 'auto', label: '自动', icon: Monitor, desc: '跟随系统', color: 'text-blue-400' },
]

export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const dispatch = useAppDispatch()
  const theme = useAppSelector(selectTheme)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const current = OPTIONS.find((o) => o.value === theme) || OPTIONS[3]
  const Icon = current.icon

  if (compact) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-md border border-amber-700/30 bg-stone-950/40 px-2 py-1 text-sm text-amber-100 hover:border-amber-600/50"
          aria-label="切换主题"
        >
          <Icon className={`h-3.5 w-3.5 ${current.color}`} />
          <span className="hidden font-serif sm:inline">{current.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
        {open && <Dropdown theme={theme} onPick={(v) => { dispatch(setTheme(v)); setOpen(false) }} />}
      </div>
    )
  }

  return (
    <div ref={ref} className="w-full">
      <div className="mb-2 font-serif text-sm text-amber-100">主题</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map((o) => {
          const Active = theme === o.value
          const I = o.icon
          return (
            <button
              key={o.value}
              onClick={() => dispatch(setTheme(o.value))}
              className={`flex flex-col items-center gap-1 rounded-md border p-3 transition-all ${
                Active
                  ? 'border-amber-500/60 bg-amber-900/30'
                  : 'border-amber-700/20 bg-stone-950/40 hover:border-amber-600/40'
              }`}
            >
              <I className={`h-5 w-5 ${o.color}`} />
              <span className="font-serif text-sm text-amber-100">{o.label}</span>
              <span className="text-[10px] text-amber-200/50">{o.desc}</span>
              {Active && <Check className="h-3 w-3 text-amber-400" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Dropdown({ theme, onPick }: { theme: ThemeMode; onPick: (v: ThemeMode) => void }) {
  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-md border border-amber-700/40 bg-stone-900 shadow-xl shadow-amber-900/20">
      {OPTIONS.map((o) => {
        const Active = theme === o.value
        const I = o.icon
        return (
          <button
            key={o.value}
            onClick={() => onPick(o.value)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
              Active ? 'bg-amber-900/40 text-amber-100' : 'text-amber-200/80 hover:bg-stone-800/60'
            }`}
          >
            <I className={`h-4 w-4 ${o.color}`} />
            <span className="font-serif">{o.label}</span>
            <span className="ml-auto text-[10px] text-amber-200/40">{o.desc}</span>
            {Active && <Check className="h-3 w-3 text-amber-400" />}
          </button>
        )
      })}
    </div>
  )
}
