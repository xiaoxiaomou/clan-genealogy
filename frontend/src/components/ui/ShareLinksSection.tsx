import { useEffect, useState, useCallback } from 'react'
import { Share2, Plus, Copy, Eye, Lock, Clock, X, Trash2, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useAppDispatch, addToast } from '@/store'

interface ShareLink {
  id: number
  family_id: number
  token: string
  url: string
  label: string | null
  has_password: boolean
  expires_at: string | null
  view_count: number
  last_viewed_at: string | null
  revoked: boolean
  created_at: string
}

export function ShareLinksSection({ familyId }: { familyId: number }) {
  const dispatch = useAppDispatch()
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ label: '', password: '', expires_in_days: 30 })
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listShareLinks(familyId)
      setLinks(data.links || [])
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '加载失败', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }, [familyId, dispatch])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const data = await api.createShareLink(familyId, {
        label: form.label.trim() || undefined,
        password: form.password || undefined,
        expires_in_days: form.expires_in_days > 0 ? form.expires_in_days : undefined,
      })
      setLinks((prev) => [data.link, ...prev])
      setShowCreate(false)
      setForm({ label: '', password: '', expires_in_days: 30 })
      dispatch(addToast({ message: '分享链接已生成', type: 'success' }))
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '创建失败', type: 'error' }))
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: number) => {
    try {
      await api.revokeShareLink(familyId, id)
      setLinks((prev) => prev.map((l) => l.id === id ? { ...l, revoked: true } : l))
      dispatch(addToast({ message: '已撤销该链接', type: 'success' }))
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '操作失败', type: 'error' }))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.deleteShareLink(familyId, id)
      setLinks((prev) => prev.filter((l) => l.id !== id))
      dispatch(addToast({ message: '已删除', type: 'success' }))
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '删除失败（请先撤销）', type: 'error' }))
    }
  }

  const copyUrl = async (l: ShareLink) => {
    const fullUrl = `${window.location.origin}${l.url}`
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopiedId(l.id)
      setTimeout(() => setCopiedId(null), 1500)
      dispatch(addToast({ message: '已复制链接到剪贴板', type: 'success' }))
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = fullUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopiedId(l.id)
      setTimeout(() => setCopiedId(null), 1500)
    }
  }

  return (
    <div id="share-section" className="mb-8 rounded-lg bg-white dark:bg-[#262628] border p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-medium text-foreground">
            <Share2 className="h-4 w-4 text-amber-700" aria-hidden="true" />
            公开分享链接
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            生成只读 token 链接，外部访客可免登录查看家族信息
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
          >
            <Plus className="h-3.5 w-3.5" /> 创建链接
          </button>
        )}
      </div>

      {showCreate && (
        <div className="mb-4 rounded-lg border border-amber-700/30 bg-amber-700/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">新建分享链接</h3>
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground" aria-label="取消">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">备注（可选）</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="例如：给姑妈看的"
                maxLength={120}
                className="w-full rounded-md border border-border/30 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-700/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">
                访问密码 <span className="font-normal text-muted-foreground">（留空 = 无密码）</span>
              </label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="6 位以上"
                className="w-full rounded-md border border-border/30 bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-700/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/80">
                有效期
              </label>
              <select
                value={form.expires_in_days}
                onChange={(e) => setForm({ ...form, expires_in_days: Number(e.target.value) })}
                className="w-full rounded-md border border-border/30 bg-background px-3 py-1.5 text-sm"
              >
                <option value={7}>7 天</option>
                <option value={30}>30 天</option>
                <option value={90}>90 天</option>
                <option value={365}>1 年</option>
                <option value={0}>永不过期</option>
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {creating ? '生成中…' : '生成链接'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center text-sm text-muted-foreground">加载中…</div>
      ) : links.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/30 py-8 text-center text-sm text-muted-foreground">
          尚未创建分享链接
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((l) => (
            <div
              key={l.id}
              className={`rounded-lg border p-3 transition-colors ${
                l.revoked
                  ? 'border-border/10 bg-foreground/2 opacity-60'
                  : 'border-border/20 bg-foreground/3'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-medium text-foreground">
                      {l.label || '未命名链接'}
                    </span>
                    {l.has_password && (
                      <span className="flex items-center gap-0.5 rounded bg-amber-700/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-500">
                        <Lock className="h-2.5 w-2.5" /> 密码
                      </span>
                    )}
                    {l.revoked ? (
                      <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-600">已撤销</span>
                    ) : (
                      <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[10px] text-green-600">活跃</span>
                    )}
                  </div>
                  <p className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-2.5 w-2.5" /> {l.view_count} 次浏览
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {l.expires_at
                        ? `${new Date(l.expires_at).toLocaleDateString('zh-CN')} 到期`
                        : '永不过期'}
                    </span>
                    {l.last_viewed_at && (
                      <span>· 最近 {new Date(l.last_viewed_at).toLocaleString('zh-CN')}</span>
                    )}
                  </p>
                  <code className="mt-1.5 block break-all rounded bg-foreground/5 px-2 py-1 font-mono text-[10px] text-foreground/70">
                    {window.location.origin}{l.url}
                  </code>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!l.revoked && (
                    <>
                      <button
                        onClick={() => copyUrl(l)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                        aria-label="复制链接"
                        title="复制链接"
                      >
                        {copiedId === l.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => handleRevoke(l.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-orange-500/10 hover:text-orange-600"
                        aria-label="撤销链接"
                        title="撤销"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {l.revoked && (
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                      aria-label="删除链接"
                      title="永久删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
