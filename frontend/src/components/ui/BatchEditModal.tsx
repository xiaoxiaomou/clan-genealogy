import { useState } from 'react'
import { X, CheckSquare, Square } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppDispatch, addToast } from '@/store'

interface BatchEditModalProps {
  open: boolean
  familyId: number
  memberIds: number[]
  memberNames: string[]
  onClose: () => void
  onSuccess: () => void
}

const FIELDS: { key: string; label: string; type: 'select' | 'text' | 'bool'; options?: { value: string; label: string }[] }[] = [
  { key: 'gender', label: '性别', type: 'select', options: [
    { value: 'male', label: '男' },
    { value: 'female', label: '女' },
    { value: 'unknown', label: '未知' },
  ]},
  { key: 'is_alive', label: '在世', type: 'bool' },
  { key: 'branch_id', label: '房支 ID', type: 'text' },
  { key: 'generation_name', label: '字辈名', type: 'text' },
  { key: 'birth_place', label: '出生地', type: 'text' },
  { key: 'death_place', label: '去世地', type: 'text' },
]

export function BatchEditModal({ open, familyId, memberIds, memberNames, onClose, onSuccess }: BatchEditModalProps) {
  const dispatch = useAppDispatch()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<'set' | 'append'>('set')
  const [loading, setLoading] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)

  if (!open) return null

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSubmit = async () => {
    if (selected.size === 0) {
      dispatch(addToast({ message: '请至少选择一个字段', type: 'info' }))
      return
    }
    if (!confirmStep) {
      setConfirmStep(true)
      return
    }

    setLoading(true)
    try {
      const updates: Record<string, any> = {}
      selected.forEach((k) => {
        const el = document.getElementById(`batch-field-${k}`) as HTMLInputElement | HTMLSelectElement | null
        if (!el) return
        if (el.tagName === 'SELECT') {
          const v = (el as HTMLSelectElement).value
          updates[k] = v
        } else if (el instanceof HTMLInputElement && el.type === 'checkbox') {
          updates[k] = el.checked
        } else {
          updates[k] = el.value
        }
      })
      const data = await api.batchEditMembers(familyId, { member_ids: memberIds, updates, mode })
      dispatch(addToast({ message: data.message || '批量更新成功', type: 'success' }))
      onSuccess()
      onClose()
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '批量更新失败', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="批量编辑成员">
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/30 bg-background/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-border/20 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">批量编辑</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              将对 <span className="font-mono text-foreground">{memberIds.length}</span> 个成员应用所选字段
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-foreground/5" aria-label="关闭">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-3 rounded-lg border border-border/20 bg-foreground/2 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">已选成员</p>
            <p className="mt-1 text-xs text-foreground/80">
              {memberNames.length <= 5
                ? memberNames.join('、')
                : memberNames.slice(0, 5).join('、') + ` 等 ${memberNames.length} 人`}
            </p>
          </div>

          <div className="mb-4 flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">更新方式：</span>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="batch-mode"
                value="set"
                checked={mode === 'set'}
                onChange={() => setMode('set')}
                className="accent-amber-700"
              />
              <span>覆盖</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="batch-mode"
                value="append"
                checked={mode === 'append'}
                onChange={() => setMode('append')}
                className="accent-amber-700"
              />
              <span>追加（仅字辈）</span>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              选择要修改的字段（{selected.size} / {FIELDS.length}）
            </p>
            {FIELDS.map((f) => {
              const isOn = selected.has(f.key)
              return (
                <div
                  key={f.key}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                    isOn ? 'border-amber-700/40 bg-amber-700/5' : 'border-border/15 bg-foreground/2'
                  }`}
                >
                  <button
                    onClick={() => toggle(f.key)}
                    className="flex items-center gap-2 text-sm font-medium text-foreground/90"
                    aria-label={`${isOn ? '取消' : '选择'} ${f.label}`}
                    type="button"
                  >
                    {isOn ? <CheckSquare className="h-4 w-4 text-amber-700" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                    <span className="min-w-[64px] text-left">{f.label}</span>
                  </button>
                  {f.type === 'select' && (
                    <select
                      id={`batch-field-${f.key}`}
                      disabled={!isOn}
                      defaultValue={f.options?.[0]?.value}
                      className="flex-1 rounded-md border border-border/30 bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-700/40 disabled:opacity-40"
                    >
                      {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )}
                  {f.type === 'bool' && (
                    <label className="flex flex-1 cursor-pointer items-center gap-2 text-xs">
                      <input
                        id={`batch-field-${f.key}`}
                        type="checkbox"
                        disabled={!isOn}
                        defaultChecked
                        className="h-4 w-4 accent-amber-700"
                      />
                      <span className="text-muted-foreground">标记为在世</span>
                    </label>
                  )}
                  {f.type === 'text' && (
                    <input
                      id={`batch-field-${f.key}`}
                      type="text"
                      disabled={!isOn}
                      placeholder="留空表示清空"
                      className="flex-1 rounded-md border border-border/30 bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-700/40 disabled:opacity-40"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {confirmStep && (
            <div className="mt-4 rounded-lg border border-amber-700/30 bg-amber-700/5 p-3 text-xs text-foreground/85">
              <p className="font-semibold text-amber-700 dark:text-amber-500">确认批量更新？</p>
              <p className="mt-1 leading-relaxed">
                将对 <span className="font-mono">{memberIds.length}</span> 个成员修改
                <span className="font-mono"> {Array.from(selected).join(', ')} </span>
                字段。此操作不可撤销，但会写入审计日志。
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/20 bg-foreground/2 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-foreground/5"
            type="button"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || selected.size === 0}
            className="rounded-lg bg-amber-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
          >
            {loading ? '更新中…' : confirmStep ? '确认更新' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  )
}
