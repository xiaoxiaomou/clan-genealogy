import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui'
import type { TreeSearchHit } from '@/hooks/useTreeSearch'

interface TreeSearchPaletteProps {
  open: boolean
  query: string
  onQueryChange: (q: string) => void
  results: TreeSearchHit[]
  loading: boolean
  onPick: (hit: TreeSearchHit) => void
  onClose: () => void
}

/**
 * 树图搜索浮层（Cmd/Ctrl+F 打开）
 * 模糊匹配成员名，回车或点击定位到图上
 */
export function TreeSearchPalette({
  open,
  query,
  onQueryChange,
  results,
  loading,
  onPick,
  onClose,
}: TreeSearchPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30)
      setActiveIdx(0)
    }
  }, [open])

  useEffect(() => {
    setActiveIdx(0)
  }, [results])

  if (!open) return null

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = results[activeIdx]
      if (hit) onPick(hit)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      className="absolute top-14 left-1/2 -translate-x-1/2 z-40 w-[min(480px,90vw)] rounded-lg border bg-background/95 backdrop-blur shadow-2xl overflow-hidden"
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <span className="text-muted-foreground">🔍</span>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="输入成员姓名定位（支持模糊）"
          className="flex-1 h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
        />
        {loading && <span className="text-xs text-muted-foreground">搜索中…</span>}
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm"
          title="关闭 (Esc)"
        >
          ✕
        </button>
      </div>

      <div className="max-h-[320px] overflow-y-auto">
        {!query.trim() && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            输入关键词开始搜索
          </div>
        )}

        {query.trim() && !loading && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            没有匹配的成员
          </div>
        )}

        {results.map((hit, idx) => (
          <button
            key={hit.id}
            onClick={() => onPick(hit)}
            onMouseEnter={() => setActiveIdx(idx)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              idx === activeIdx ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
              style={{
                background:
                  hit.gender === 'male' ? '#2563eb' : hit.gender === 'female' ? '#ec4899' : '#94a3b8',
              }}
            >
              {(hit.name || '?').slice(0, 1)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{hit.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {hit.generation ? `第 ${hit.generation} 世` : ''}
                {hit.generation_name ? ` · ${hit.generation_name}字辈` : ''}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">↵ 定位</span>
          </button>
        ))}
      </div>

      <div className="px-3 py-1.5 border-t bg-muted/30 text-[10px] text-muted-foreground flex items-center gap-3">
        <span>↑↓ 选择</span>
        <span>↵ 定位</span>
        <span>Esc 关闭</span>
        <span className="ml-auto">Ctrl/⌘+F 快捷</span>
      </div>
    </div>
  )
}
