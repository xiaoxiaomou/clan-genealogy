import { Link, Undo2, Redo2, MousePointer2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EditingMode } from '@/types/manualEdge'

interface ManualEdgeToolbarProps {
  mode: EditingMode
  onModeChange: (mode: EditingMode) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onDeleteSelected: () => void
  hasSelectedEdge: boolean
  disabled?: boolean
}

export function ManualEdgeToolbar({
  mode,
  onModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDeleteSelected,
  hasSelectedEdge,
  disabled = false,
}: ManualEdgeToolbarProps) {
  const handleModeClick = (newMode: EditingMode) => {
    if (disabled) return
    onModeChange(newMode)
  }

  return (
    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-30 flex items-center gap-1 sm:gap-2 bg-background/95 backdrop-blur border rounded-lg p-1 shadow-lg">
      <button
        onClick={() => handleModeClick(mode === 'adding' ? 'default' : 'adding')}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all',
          mode === 'adding'
            ? 'bg-blue-500 text-white'
            : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        title={mode === 'adding' ? '退出添加模式' : '添加手动连线'}
      >
        {mode === 'adding' ? (
          <>
            <MousePointer2 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">完成</span>
          </>
        ) : (
          <>
            <Link className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">添加连线</span>
          </>
        )}
      </button>

      <div className="w-px h-5 sm:h-6 bg-border" />

      <button
        onClick={onUndo}
        disabled={disabled || !canUndo}
        className={cn(
          'flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md transition-colors',
          canUndo && !disabled
            ? 'hover:bg-muted text-muted-foreground hover:text-foreground'
            : 'opacity-40 cursor-not-allowed'
        )}
        title="撤销"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        onClick={onRedo}
        disabled={disabled || !canRedo}
        className={cn(
          'flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md transition-colors',
          canRedo && !disabled
            ? 'hover:bg-muted text-muted-foreground hover:text-foreground'
            : 'opacity-40 cursor-not-allowed'
        )}
        title="重做"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      {hasSelectedEdge && (
        <>
          <div className="w-px h-5 sm:h-6 bg-border" />
          <button
            onClick={onDeleteSelected}
            disabled={disabled}
            className={cn(
              'flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md transition-colors text-red-500 hover:bg-red-500/10',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            title="删除选中的连线"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}