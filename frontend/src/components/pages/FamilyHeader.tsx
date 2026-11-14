import { Button } from '@/components/ui'
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
}

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
}: FamilyHeaderProps) {
  const memberCount = Array.isArray(members) ? members.length : 0

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

          {/* 功能目录：原页头 21 个导航链接收拢至此页 */}
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
        </div>
      </div>
    </div>
  )
}
