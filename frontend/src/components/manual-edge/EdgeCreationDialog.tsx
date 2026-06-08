import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { ManualEdge } from '@/types/manualEdge'
import { LINE_COLORS, LINE_STYLES } from '@/types/manualEdge'

interface EdgeCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (edge: ManualEdge) => void
  sourceName: string
  targetName: string
  mode: 'create' | 'edit'
  initialData?: ManualEdge
}

export function EdgeCreationDialog({
  isOpen,
  onClose,
  onConfirm,
  sourceName,
  targetName,
  mode,
  initialData,
}: EdgeCreationDialogProps) {
  const [label, setLabel] = useState(initialData?.label || '')
  const [color, setColor] = useState(initialData?.color || LINE_COLORS[0].value)
  const [lineStyle, setLineStyle] = useState<ManualEdge['lineStyle']>(initialData?.lineStyle || 'dashed')

  useEffect(() => {
    if (isOpen) {
      setLabel(initialData?.label || '')
      setColor(initialData?.color || LINE_COLORS[0].value)
      setLineStyle(initialData?.lineStyle || 'dashed')
    }
  }, [isOpen, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) return

    const edge: ManualEdge = {
      id: initialData?.id || `manual-${Date.now()}`,
      source: initialData?.source || '',
      target: initialData?.target || '',
      label: label.trim(),
      color,
      lineStyle,
    }

    onConfirm(edge)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? '创建手动连线' : '编辑连线'}
      className="w-[90vw] max-w-sm sm:max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">起点：</span>
            <span className="font-medium">{sourceName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">终点：</span>
            <span className="font-medium">{targetName}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">关系名称</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="请输入关系名称"
            className={cn(
              'w-full px-3 py-2 rounded-lg border bg-background text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'placeholder:text-muted-foreground'
            )}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">连线颜色</label>
          <div className="flex gap-2">
            {LINE_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={cn(
                  'w-8 h-8 rounded-full border-2 transition-transform',
                  color === c.value ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105'
                )}
                style={{ backgroundColor: c.value }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">线型</label>
          <div className="flex gap-2">
            {LINE_STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setLineStyle(s.value)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                  lineStyle === s.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted hover:bg-muted/80 border-transparent'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="mt-2 h-0.5 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                backgroundColor: color,
                backgroundImage: lineStyle === 'dashed'
                  ? 'repeating-linear-gradient(90deg, transparent, transparent 4px, currentColor 4px, currentColor 8px)'
                  : lineStyle === 'dotted'
                  ? 'repeating-linear-gradient(90deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)'
                  : 'none',
                color: color,
              }}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button type="submit" disabled={!label.trim()} className="flex-1">
            {mode === 'create' ? '创建' : '保存'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}