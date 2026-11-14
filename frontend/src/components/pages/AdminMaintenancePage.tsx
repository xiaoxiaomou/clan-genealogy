import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button, useToast } from '@/components/ui'
import { PgPageHead, PgSectionHead } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import {
  ArrowLeft,
  Archive,
  Download,
  Trash2,
  Users,
  RefreshCw,
  FileWarning,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════
   谱页 · 守藏室 —— 备份、诊察与清理
   掌谱者之责：典藏有时，诊察有常，尘污当扫。
   ═══════════════════════════════════════════════════════ */

interface BackupItem {
  filename: string
  size_bytes: number
  size_mb: number
  created_at: string
}

interface OrphanFilesCheck {
  count: number
  size_bytes: number
  samples: Array<{ file: string; size_bytes: number }>
}

interface IntegrityResult {
  sqlite: boolean
  checks: {
    orphan_members: { count: number; samples: Array<{ id: number; name: string; family_id: number }> }
    orphan_relationships: {
      count: number
      samples: Array<{ id: number; member_id: number; related_member_id: number }>
    }
    broken_event_images_rows: { count: number }
    orphan_avatar_files: OrphanFilesCheck
    orphan_event_files: OrphanFilesCheck
    orphan_album_files: OrphanFilesCheck
  }
  image_dirs: Record<string, { files: number; size_bytes: number }>
}

interface FamilyRow {
  id: number
  name: string
  surname: string | null
  member_count: number
  owner_username: string | null
  owner_name: string | null
  created_at: string | null
}

const ORPHAN_LABELS: Record<string, string> = {
  orphan_avatar_files: '头像目录',
  orphan_event_files: '事件图片目录',
  orphan_album_files: '相册目录',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function AdminMaintenancePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [isSqlite, setIsSqlite] = useState(true)
  const [creating, setCreating] = useState(false)
  const [busyFile, setBusyFile] = useState<string | null>(null)
  const [integrity, setIntegrity] = useState<IntegrityResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [cleaning, setCleaning] = useState<string | null>(null)
  const [families, setFamilies] = useState<FamilyRow[]>([])

  const loadBackups = useCallback(async () => {
    try {
      const data = await api.adminListBackups()
      setBackups(data.backups || [])
      setIsSqlite(data.sqlite !== false)
    } catch (err: any) {
      showToast(err.message || '备份列表加载失败', 'error')
    }
  }, [showToast])

  const loadFamilies = useCallback(async () => {
    try {
      const data = await api.adminAllFamilies()
      setFamilies(data.families || [])
    } catch (err: any) {
      showToast(err.message || '家族列表加载失败', 'error')
    }
  }, [showToast])

  useEffect(() => {
    loadBackups()
    loadFamilies()
  }, [loadBackups, loadFamilies])

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      await api.adminCreateBackup()
      showToast('备份已创建', 'success')
      loadBackups()
    } catch (err: any) {
      showToast(err.message || '备份失败', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (filename: string) => {
    setBusyFile(filename)
    try {
      await api.adminDownloadBackup(filename)
    } catch (err: any) {
      showToast(err.message || '下载失败', 'error')
    } finally {
      setBusyFile(null)
    }
  }

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`确定删除备份 ${filename} 吗？此操作不可恢复。`)) return
    setBusyFile(filename)
    try {
      await api.adminDeleteBackup(filename)
      showToast('备份已删除', 'success')
      loadBackups()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    } finally {
      setBusyFile(null)
    }
  }

  const handleCheck = async () => {
    setChecking(true)
    try {
      const data = await api.adminIntegrityCheck()
      setIntegrity(data)
    } catch (err: any) {
      showToast(err.message || '诊察失败', 'error')
    } finally {
      setChecking(false)
    }
  }

  const handleCleanup = async (target: 'avatars' | 'events' | 'albums') => {
    setCleaning(target)
    try {
      const data = await api.adminCleanupOrphans(target)
      showToast(data.message || '清理完成', 'success')
      setIntegrity(await api.adminIntegrityCheck())
    } catch (err: any) {
      showToast(err.message || '清理失败', 'error')
    } finally {
      setCleaning(null)
    }
  }

  const recordProblems = integrity
    ? [
        integrity.checks.orphan_members.count > 0 && '孤儿成员',
        integrity.checks.orphan_relationships.count > 0 && '孤儿关系',
        integrity.checks.broken_event_images_rows.count > 0 && '事件图片数据损坏行',
      ].filter(Boolean) as string[]
    : []

  return (
    <Layout>
      <div className="pg-rise mx-auto max-w-3xl px-4 py-8">
        {/* 顶部导航 */}
        <div className="mb-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            aria-label="返回管理"
          >
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            返回管理
          </Button>
        </div>

        <PgPageHead
          eyebrow="谱 局 · 守 藏"
          title="数据维护"
          subtitle="备份、诊察与清理，掌谱者之责"
        />

        {/* 备份典藏 */}
        <section className="mb-10">
          <PgSectionHead
            text="备 份 典 藏"
            right={
              <Button size="sm" onClick={handleCreateBackup} disabled={creating || !isSqlite}>
                <Archive className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {creating ? '封存中…' : '创建备份'}
              </Button>
            }
          />
          <div className="pg-card p-6">
            {!isSqlite ? (
              <p className="text-sm text-muted-foreground">
                当前数据库非 SQLite，页面内备份不可用，请使用数据库自带工具导出。
              </p>
            ) : backups.length === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center text-center text-muted-foreground">
                <Archive className="mb-2 h-6 w-6 opacity-50" aria-hidden="true" />
                <p className="text-sm">尚无备份。备份包含数据库与全部图片，建议定期创建。</p>
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {backups.map((b) => (
                  <li key={b.filename} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{b.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.created_at} · {b.size_mb} MB
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(b.filename)}
                        disabled={busyFile === b.filename}
                        aria-label={`下载 ${b.filename}`}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBackup(b.filename)}
                        disabled={busyFile === b.filename}
                        className="text-destructive hover:bg-destructive/10"
                        aria-label={`删除 ${b.filename}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 谱目诊察 */}
        <section className="mb-10">
          <PgSectionHead
            text="谱 目 诊 察"
            right={
              <Button size="sm" variant="outline" onClick={handleCheck} disabled={checking}>
                <RefreshCw
                  className={`mr-1.5 h-4 w-4 ${checking ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {checking ? '诊察中…' : '运行诊察'}
              </Button>
            }
          />
          <div className="pg-card p-6">
            {!integrity ? (
              <p className="text-sm text-muted-foreground">
                检查孤儿记录与未被引用的图片文件，结果仅作报告，不会自动改动数据。
              </p>
            ) : (
              <div className="space-y-6">
                {/* 记录层 */}
                <div>
                  <p className="mb-2 text-xs font-medium tracking-[0.2em] text-muted-foreground">
                    记录层
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex items-center justify-between">
                      <span>孤儿成员（家族不存在）</span>
                      <span
                        className={
                          integrity.checks.orphan_members.count > 0
                            ? 'font-medium text-destructive'
                            : 'text-muted-foreground'
                        }
                      >
                        {integrity.checks.orphan_members.count}
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>孤儿关系（成员不存在）</span>
                      <span
                        className={
                          integrity.checks.orphan_relationships.count > 0
                            ? 'font-medium text-destructive'
                            : 'text-muted-foreground'
                        }
                      >
                        {integrity.checks.orphan_relationships.count}
                      </span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>事件图片数据损坏行</span>
                      <span
                        className={
                          integrity.checks.broken_event_images_rows.count > 0
                            ? 'font-medium text-destructive'
                            : 'text-muted-foreground'
                        }
                      >
                        {integrity.checks.broken_event_images_rows.count}
                      </span>
                    </li>
                  </ul>
                  {recordProblems.length > 0 && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                      <FileWarning className="h-3.5 w-3.5" aria-hidden="true" />
                      发现 {recordProblems.join('、')}，需人工核查。
                    </p>
                  )}
                </div>

                {/* 图片层 */}
                <div>
                  <p className="mb-2 text-xs font-medium tracking-[0.2em] text-muted-foreground">
                    图片层（孤儿文件可安全清理）
                  </p>
                  <ul className="space-y-2">
                    {(
                      [
                        ['orphan_avatar_files', 'avatars'],
                        ['orphan_event_files', 'events'],
                        ['orphan_album_files', 'albums'],
                      ] as const
                    ).map(([key, target]) => {
                      const item = integrity.checks[key] as OrphanFilesCheck
                      return (
                        <li
                          key={key}
                          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                          style={{ borderColor: 'hsl(var(--border))' }}
                        >
                          <div className="text-sm">
                            {ORPHAN_LABELS[key]}
                            <span className="ml-2 text-muted-foreground">
                              {item.count} 个 · {formatBytes(item.size_bytes)}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={item.count === 0 || cleaning === target}
                            onClick={() => handleCleanup(target)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            {cleaning === target ? '清理中…' : '清理'}
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* 图片目录概况 */}
                <div>
                  <p className="mb-2 text-xs font-medium tracking-[0.2em] text-muted-foreground">
                    图片目录概况
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {Object.entries(integrity.image_dirs).map(([dir, info]) => (
                      <span key={dir}>
                        {dir}：{info.files} 个文件 · {formatBytes(info.size_bytes)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 全局族谱 */}
        <section className="mb-10">
          <PgSectionHead text="全 局 族 谱" />
          <div className="pg-card p-6">
            <p className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden="true" />
              全站 {families.length} 个家族（只读视图）
            </p>
            {families.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无家族。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="border-b text-left text-xs tracking-wider text-muted-foreground"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      <th className="py-2 pr-4 font-medium">家族</th>
                      <th className="py-2 pr-4 font-medium">姓氏</th>
                      <th className="py-2 pr-4 font-medium">成员</th>
                      <th className="py-2 pr-4 font-medium">所有者</th>
                      <th className="py-2 font-medium">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {families.map((f) => (
                      <tr
                        key={f.id}
                        className="border-b last:border-0"
                        style={{ borderColor: 'hsl(var(--border))' }}
                      >
                        <td className="py-2.5 pr-4 font-medium">{f.name}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{f.surname || '—'}</td>
                        <td className="py-2.5 pr-4">{f.member_count}</td>
                        <td className="py-2.5 pr-4">
                          {f.owner_name || f.owner_username || '—'}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {f.created_at ? f.created_at.slice(0, 10) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  )
}
