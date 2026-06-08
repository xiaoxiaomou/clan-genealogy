import { useState, useRef } from 'react'
import { X, Upload, FileText, AlertTriangle, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppDispatch, addToast } from '@/store'

interface CsvImportModalProps {
  open: boolean
  familyId: number
  onClose: () => void
  onSuccess: () => void
}

const SAMPLE = `name,gender,generation,birth_date,death_date,generation_name,birth_place,death_place,is_alive,bio
示例·一郎,male,5,1920-05-01,1980-03-15,德,山东济南,北京,true,家族开基祖
示例·二郎,male,5,1925-08-15,1990-12-01,德,山东济南,上海,false
示例·三娘,female,6,1950-01-10,,建,北京,,true,长女`

export function CsvImportModal({ open, familyId, onClose, onSuccess }: CsvImportModalProps) {
  const dispatch = useAppDispatch()
  const [csvText, setCsvText] = useState('')
  const [dryResult, setDryResult] = useState<{ total: number; valid: number; invalid: number; errors: any[]; preview: any[] } | null>(null)
  const [phase, setPhase] = useState<'edit' | 'preview' | 'done'>('edit')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 1024 * 1024) {
      dispatch(addToast({ message: '文件过大（>1MB）', type: 'error' }))
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText(String(ev.target?.result || ''))
      dispatch(addToast({ message: `已加载 ${f.name}`, type: 'success' }))
    }
    reader.readAsText(f, 'utf-8')
  }

  const handleDryRun = async () => {
    if (!csvText.trim()) {
      dispatch(addToast({ message: '请先粘贴或上传 CSV', type: 'info' }))
      return
    }
    setLoading(true)
    try {
      const data = await api.importMembersCsv(familyId, { csv_text: csvText, dry_run: true, skip_header: true })
      setDryResult(data)
      setPhase('preview')
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '校验失败', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const data = await api.importMembersCsv(familyId, { csv_text: csvText, dry_run: false, skip_header: true })
      dispatch(addToast({ message: `成功导入 ${data.added} 个成员${data.invalid > 0 ? `，${data.invalid} 行无效` : ''}`, type: 'success' }))
      setPhase('done')
      onSuccess()
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '导入失败', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setCsvText('')
    setDryResult(null)
    setPhase('edit')
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="CSV 批量导入成员">
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/30 bg-background/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-border/20 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">CSV 批量导入</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">支持字段：name / gender / generation / birth_date / death_date / generation_name / birth_place / death_place / is_alive / bio</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-foreground/5" aria-label="关闭">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {phase === 'edit' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-foreground/3 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/6"
                  type="button"
                >
                  <Upload className="h-3.5 w-3.5" />
                  上传 CSV 文件
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                <button
                  onClick={() => setCsvText(SAMPLE)}
                  className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-foreground/3 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/6"
                  type="button"
                >
                  <FileText className="h-3.5 w-3.5" />
                  填入示例
                </button>
                <span className="text-xs text-muted-foreground">
                  {csvText ? `${csvText.split('\n').length} 行` : '尚未输入'}
                </span>
              </div>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="第一行需为表头：name,gender,generation,birth_date,...&#10;示例：&#10;张三,male,3,1920-05-01,1980-03-15,德,山东,北京,true,家族开基祖"
                className="h-72 w-full resize-none rounded-lg border border-border/30 bg-foreground/3 p-3 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-700/40"
                spellCheck={false}
              />
            </div>
          )}

          {phase === 'preview' && dryResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/20 bg-foreground/3 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">总行数</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{dryResult.total}</p>
                </div>
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">有效</p>
                  <p className="mt-1 text-2xl font-semibold text-green-700 dark:text-green-400">{dryResult.valid}</p>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">无效</p>
                  <p className="mt-1 text-2xl font-semibold text-red-700 dark:text-red-400">{dryResult.invalid}</p>
                </div>
              </div>

              {dryResult.errors.length > 0 && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> 错误行（前 30）
                  </div>
                  <ul className="space-y-0.5 text-xs text-foreground/80">
                    {dryResult.errors.map((e: any, i) => (
                      <li key={i} className="font-mono">
                        第 {e.row} 行{e.name ? ` (${e.name})` : ''}: {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {dryResult.preview.length > 0 && (
                <div className="rounded-lg border border-border/20 bg-foreground/2 p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    预览（前 {dryResult.preview.length} 条）
                  </p>
                  <div className="space-y-1.5">
                    {dryResult.preview.map((m: any, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-amber-700">·</span>
                        <span className="font-medium text-foreground">{m.name}</span>
                        <span className="text-muted-foreground">
                          {m.gender === 'male' ? '男' : m.gender === 'female' ? '女' : '?'}
                          {m.generation ? ` · 第${m.generation}代` : ''}
                          {m.birth_date ? ` · ${m.birth_date}` : ''}
                          {m.generation_name ? ` · ${m.generation_name}辈` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 text-green-600">
                <Check className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">导入完成</p>
              <p className="mt-1 text-xs text-muted-foreground">新成员已添加到本家族</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/20 bg-foreground/2 px-5 py-3">
          <button
            onClick={phase === 'preview' ? handleReset : onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-foreground/5"
            type="button"
          >
            {phase === 'preview' ? '重新导入' : '取消'}
          </button>
          {phase === 'edit' && (
            <button
              onClick={handleDryRun}
              disabled={loading || !csvText.trim()}
              className="rounded-lg border border-amber-700/40 bg-amber-700/10 px-4 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-500 hover:bg-amber-700/15 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              {loading ? '校验中…' : '校验（Dry Run）'}
            </button>
          )}
          {phase === 'preview' && (
            <button
              onClick={handleConfirm}
              disabled={loading || (dryResult?.valid || 0) === 0}
              className="rounded-lg bg-amber-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
            >
              {loading ? '导入中…' : `确认导入 ${dryResult?.valid} 个`}
            </button>
          )}
          {phase === 'done' && (
            <button
              onClick={onClose}
              className="rounded-lg bg-amber-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-800"
              type="button"
            >
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
