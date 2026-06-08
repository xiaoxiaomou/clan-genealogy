import { useEffect } from 'react'
import { SHORTCUTS, type ShortcutDef } from './useGlobalShortcuts'

export function ShortcutHelp({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const grouped = SHORTCUTS.reduce<Record<string, ShortcutDef[]>>((acc, s) => {
    (acc[s.group] ||= []).push(s)
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="键盘快捷键"
    >
      <div
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-border/30 bg-background/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-border/20 px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">键盘快捷键</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-foreground/5"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group}
              </h3>
              <div className="space-y-1.5">
                {items.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border/15 bg-foreground/2 px-3 py-2"
                  >
                    <span className="text-sm text-foreground/90">{s.description}</span>
                    <kbd className="rounded border border-border/40 bg-background px-2 py-0.5 font-mono text-[10px] text-foreground/80">
                      {s.combo}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-4 rounded-lg border border-amber-700/20 bg-amber-700/5 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-amber-700 dark:text-amber-500">提示</p>
            <p className="mt-1 leading-relaxed">
              所有快捷键在输入框中自动失效，避免误触。
              <kbd className="mx-1 rounded border border-border/40 bg-background px-1 font-mono">?</kbd>
              随时打开此帮助。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
