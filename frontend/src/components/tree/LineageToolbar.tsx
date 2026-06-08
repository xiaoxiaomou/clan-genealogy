import { Button } from '@/components/ui'
import type { LineageMode } from '@/hooks/useLineageHighlight'

interface LineageToolbarProps {
  mode: LineageMode
  onChange: (mode: LineageMode) => void
  onClear: () => void
  onOpenSearch: () => void
  loading?: boolean
  label?: string
  error?: string | null
  disabled?: boolean
}

const MODES: Array<{ key: LineageMode; label: string; title: string; color: string }> = [
  { key: 'none', label: '清除', title: '清除高亮', color: '#94a3b8' },
  { key: 'ancestors', label: '金线溯源', title: '点击成员高亮其祖先链', color: '#b08d57' },
  { key: 'descendants', label: '金扇繁衍', title: '点击成员高亮其子孙', color: '#7ba17b' },
  { key: 'path', label: '关系路径', title: '选两个成员高亮亲属路径', color: '#c08494' },
]

/**
 * 树图工具栏（A1/A2）：4 个高亮模式按钮 + 1 个搜索按钮
 * 渲染为悬浮条，覆盖在树图上
 */
export function LineageToolbar({
  mode,
  onChange,
  onClear,
  onOpenSearch,
  loading,
  label,
  error,
  disabled,
}: LineageToolbarProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-background/90 backdrop-blur border shadow-md px-2 py-1">
      <span className="text-xs text-muted-foreground pl-2 pr-1 hidden sm:inline">高亮：</span>
      {MODES.map((m) => {
        const active = mode === m.key
        return (
          <button
            key={m.key}
            onClick={() => {
              if (m.key === 'none') {
                onClear()
              } else {
                onChange(m.key)
              }
            }}
            disabled={disabled && m.key !== 'none'}
            title={m.title}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              active
                ? 'text-white shadow'
                : 'text-foreground hover:bg-accent'
            }`}
            style={{
              background: active ? m.color : 'transparent',
              borderColor: active ? m.color : 'transparent',
              opacity: disabled && m.key !== 'none' ? 0.4 : 1,
            }}
          >
            {m.key === 'none' && active ? '✓ ' : ''}
            {m.label}
          </button>
        )
      })}

      <div className="w-px h-5 bg-border mx-1" />

      <Button
        size="sm"
        variant="outline"
        onClick={onOpenSearch}
        className="h-7 px-3 text-xs rounded-full"
        title="搜索 (Ctrl/⌘+F)"
        disabled={disabled}
      >
        <span className="mr-1">🔍</span> 搜索
      </Button>

      {loading && (
        <span className="text-xs text-muted-foreground pr-2">加载中…</span>
      )}
      {label && !loading && !error && (
        <span className="text-xs text-foreground/80 pr-2 max-w-[200px] truncate" title={label}>
          {label}
        </span>
      )}
      {error && (
        <span className="text-xs text-red-500 pr-2 max-w-[200px] truncate" title={error}>
          ⚠ {error}
        </span>
      )}
    </div>
  )
}
