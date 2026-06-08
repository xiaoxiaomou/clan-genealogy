import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Filter, X } from 'lucide-react'

interface FilterDrawerProps {
  activeCount: number
  children: ReactNode
  title?: string
  className?: string
}

export function FilterDrawer({
  activeCount,
  children,
  title = '筛选',
  className = '',
}: FilterDrawerProps) {
  const [open, setOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="touch-target relative inline-flex items-center gap-1.5 rounded-md border border-amber-700/30 bg-stone-950/40 px-3 py-1.5 text-sm text-amber-100 hover:border-amber-600/50"
        aria-label="打开筛选"
      >
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-serif">筛选</span>
        {activeCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="sm:hidden" role="dialog" aria-modal="true" aria-label="筛选">
          <div
            className="drawer-overlay"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div ref={drawerRef} className="drawer-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-handle" />
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <h3 className="text-sm font-semibold">{title}</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted active:scale-90"
                aria-label="关闭筛选"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className={`scroll-area flex-1 overflow-y-auto px-4 py-3 ${className}`}>
              {children}
            </div>
            <div className="shrink-0 border-t border-border/40 px-4 py-3 pb-3">
              <button
                onClick={() => setOpen(false)}
                className="w-full rounded-md bg-amber-700/80 py-2.5 text-sm font-medium text-amber-50 hover:bg-amber-600 active:scale-[0.98]"
              >
                应用筛选
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default FilterDrawer
