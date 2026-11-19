import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from './button'
import { Modal } from './modal'
import { PG_RED } from './pedigree'

export interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmText?: string
  /** 危险操作：确认按钮朱红 */
  danger?: boolean
}

/** 谱牒风格确认弹窗（替代原生 confirm） */
export function ConfirmDialog({
  open,
  options,
  onCancel,
  onConfirm,
}: {
  open: boolean
  options: ConfirmOptions | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal isOpen={open} onClose={onCancel} title={options?.title || '确认操作'}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{options?.message}</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            onClick={onConfirm}
            className="border-none text-white"
            style={options?.danger ? { backgroundColor: PG_RED } : undefined}
          >
            {options?.confirmText || '确认'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** 用法：const { ask, dialog } = useConfirm(); if (!(await ask({ title, message, danger: true }))) return */
export function useConfirm() {
  const [state, setState] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const ask = (opts: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setState(opts)
    })
  const respond = (ok: boolean) => {
    setState(null)
    const r = resolver.current
    resolver.current = null
    r?.(ok)
  }

  return {
    ask,
    dialog: <ConfirmDialog open={!!state} options={state} onCancel={() => respond(false)} onConfirm={() => respond(true)} />,
  }
}
