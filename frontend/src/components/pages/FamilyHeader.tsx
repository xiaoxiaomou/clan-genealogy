import { useState } from 'react'
import { Button, ToggleSwitch } from '@/components/ui'
import { PG_RED } from '@/components/ui/pedigree'
import {
  ArrowLeft,
  UserPlus,
  Link2,
  Home,
  Upload,
  Download,
  Settings,
  BookOpenText,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import type { Family } from '@/types'

interface FamilyHeaderProps {
  family: Family | null
  myRole: string
  canEdit: boolean
  familyId: number
  isExporting: boolean
  members: { length: number } | unknown[]
  onNavigate: (path: string) => void
  onAddMember: () => void
  onAddRelation: () => void
  onOpenQuickFamily: () => void
  onOpenImport: () => void
  onExportPdf: () => void
  /** 后台功能开关（系统管理员控制）；undefined 时按开启处理 */
  featureFlags?: Record<string, boolean>
  /** 系统管理员：始终可见所有按钮，避免关闭后无法再次开启 */
  isSystemAdmin?: boolean
  /** 系统管理员就地切换开关 */
  onToggleFeature?: (key: string, value: boolean) => void
}

const FEATURE_SWITCHES: Array<{ key: string; label: string; desc: string }> = [
  { key: 'family.show_settings_button', label: '族谱设置按钮', desc: '顶栏齿轮入口' },
  { key: 'family.show_export_button', label: '导出 PDF 按钮', desc: '顶栏导出入口' },
  { key: 'family.show_functions_button', label: '功能目录按钮', desc: '顶栏功能目录入口' },
]

function getRoleLabel(role: string): string {
  switch (role) {
    case 'owner':
      return '所有者'
    case 'admin':
      return '管理员'
    case 'editor':
      return '编辑者'
    default:
      return '查看者'
  }
}

function getRoleStyles(role: string): string {
  switch (role) {
    case 'owner':
      return 'border-amber-500/40 bg-amber-500/15 text-amber-200'
    case 'admin':
      return 'border-amber-600/40 bg-amber-700/20 text-amber-100'
    case 'editor':
      return 'border-emerald-600/40 bg-emerald-700/20 text-emerald-200'
    default:
      return 'border-stone-600/40 bg-stone-800/40 text-stone-300'
  }
}

export default function FamilyHeader({
  family,
  myRole,
  canEdit,
  familyId,
  isExporting,
  members,
  onNavigate,
  onAddMember,
  onAddRelation,
  onOpenQuickFamily,
  onOpenImport,
  onExportPdf,
  featureFlags,
  isSystemAdmin = false,
  onToggleFeature,
}: FamilyHeaderProps) {
  const [showFeaturePanel, setShowFeaturePanel] = useState(false)
  const memberCount = Array.isArray(members) ? members.length : 0
  // 系统管理员始终可见；普通用户按后台开关决定
  const flagOn = (key: string) => isSystemAdmin || featureFlags?.[key] !== false
  const showSettings = flagOn('family.show_settings_button')
  const showExport = flagOn('family.show_export_button')
  const showFunctions = flagOn('family.show_functions_button')

  return (
    <div
      className="relative mb-6 overflow-hidden rounded-lg border border-amber-700/30 bg-gradient-to-br from-stone-950/80 via-stone-900/70 to-stone-950/80 shadow-lg shadow-amber-900/10"
      role="banner"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent 0 8px, rgba(217,178,109,0.5) 8px 9px, transparent 9px 16px)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('/')}
            className="shrink-0 rounded-md border border-amber-700/30 bg-stone-950/40 text-amber-100 hover:border-amber-600/50 hover:bg-stone-900/60"
            aria-label="返回首页"
            title="返回首页"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="truncate font-serif text-xl font-bold text-amber-50 sm:text-2xl">
                {family?.name || '族谱详情'}
              </h1>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide ${getRoleStyles(myRole)}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                {getRoleLabel(myRole)}
              </span>
            </div>
            {family?.surname && (
              <p className="mt-0.5 truncate text-xs text-amber-200/60 sm:text-sm">
                <span className="font-serif">{family.surname}</span>
                <span className="text-amber-200/40"> · </span>
                <span>{family?.origin || '籍贯未详'}</span>
                <span className="text-amber-200/40"> · </span>
                <span>{memberCount} 位族人</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddMember}
                className="h-8 gap-1 border-amber-700/30 bg-stone-950/40 px-2.5 text-xs text-amber-100 hover:border-amber-600/50 hover:bg-stone-900/60"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="whitespace-nowrap">添加成员</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddRelation}
                className="h-8 gap-1 border-amber-700/30 bg-stone-950/40 px-2.5 text-xs text-amber-100 hover:border-amber-600/50 hover:bg-stone-900/60"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="whitespace-nowrap">添加关系</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenQuickFamily}
                className="h-8 gap-1 border-amber-700/30 bg-stone-950/40 px-2.5 text-xs text-amber-100 hover:border-amber-600/50 hover:bg-stone-900/60"
              >
                <Home className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="whitespace-nowrap">快速建家庭</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenImport}
                className="h-8 gap-1 border-amber-700/30 bg-stone-950/40 px-2.5 text-xs text-amber-100 hover:border-amber-600/50 hover:bg-stone-900/60"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="whitespace-nowrap">批量导入</span>
              </Button>

              <div
                className="mx-0.5 hidden h-5 w-px shrink-0 bg-amber-700/30 sm:block"
                aria-hidden="true"
              />
            </>
          )}

          {showSettings && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate(`/family/${familyId}/settings`)}
              className="h-8 w-8 rounded-md border border-amber-700/30 bg-stone-950/40 text-amber-100 hover:border-amber-600/50 hover:bg-stone-900/60"
              aria-label="族谱设置"
              title="族谱设置"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          {showExport && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onExportPdf}
              disabled={isExporting || memberCount === 0}
              className="h-8 w-8 rounded-md border border-amber-700/30 bg-stone-950/40 text-amber-100 hover:border-amber-600/50 hover:bg-stone-900/60 disabled:opacity-40"
              aria-label="导出 PDF"
              title={memberCount === 0 ? '暂无可导出的成员' : '导出 PDF'}
            >
              {isExporting ? (
                <div
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent"
                  aria-hidden="true"
                />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          )}

          {/* 功能目录：原页头 21 个导航链接收拢至此页 */}
          {showFunctions && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(`/family/${familyId}/functions`)}
              className="h-8 gap-1.5 px-2.5 text-xs"
              style={{
                borderColor: 'color-mix(in srgb, ' + PG_RED + ' 55%, transparent)',
                color: PG_RED,
              }}
              aria-label="功能目录"
              title="全部功能目录"
            >
              <BookOpenText className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="whitespace-nowrap font-serif tracking-wide">功能目录</span>
            </Button>
          )}

          {/* 系统管理员专用：就地功能开关（不受上面开关影响，始终可见） */}
          {isSystemAdmin && onToggleFeature && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFeaturePanel((v) => !v)}
                className="h-8 w-8 rounded-md border border-sky-700/40 bg-stone-950/40 text-sky-200 hover:border-sky-600/60 hover:bg-stone-900/60"
                aria-label="功能开关"
                title="功能开关（仅管理员）"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>

              {showFeaturePanel && (
                <div
                  className="absolute right-0 top-10 z-50 w-72 rounded-lg border border-amber-700/40 bg-stone-950 p-3 shadow-2xl shadow-black/60"
                  role="dialog"
                  aria-label="功能开关面板"
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="font-serif text-sm font-semibold text-amber-100">功能开关</span>
                    <button
                      onClick={() => setShowFeaturePanel(false)}
                      className="rounded p-0.5 text-amber-200/60 hover:text-amber-100"
                      aria-label="关闭"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mb-2 text-[11px] leading-snug text-amber-200/50">
                    关闭后普通用户不可见，管理员始终可见
                  </p>
                  <div className="space-y-1">
                    {FEATURE_SWITCHES.map((s) => {
                      const on = featureFlags?.[s.key] !== false
                      return (
                        <div
                          key={s.key}
                          className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-stone-800/60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-xs text-amber-50">{s.label}</span>
                            <span className="block truncate text-[10px] text-amber-200/40">{s.desc}</span>
                          </span>
                          <ToggleSwitch
                            size="sm"
                            showLabel={false}
                            checked={on}
                            onChange={(v) => onToggleFeature(s.key, v)}
                            ariaLabel={`${s.label}，当前${on ? '已开启' : '已关闭'}`}
                            className="flex-shrink-0"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
