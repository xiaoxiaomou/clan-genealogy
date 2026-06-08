import { Button } from '@/components/ui'
import {
  ArrowLeft,
  UserPlus,
  Link2,
  Home,
  Upload,
  Download,
  Calendar,
  Image,
  GitFork,
  GitCommitHorizontal,
  BookOpen,
  Settings,
  History,
  ScrollText,
  Award,
  Heart,
  Map as MapIcon,
  Sparkles,
  MessageSquare,
  Users,
  Landmark,
  Network,
  BarChart3,
  type LucideIcon,
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

interface NavItem {
  path: string
  label: string
  title: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { path: 'intro', label: '简介', title: '家族简介', icon: BookOpen },
  { path: 'events', label: '大事记', title: '家族大事', icon: Calendar },
  { path: 'album', label: '相册', title: '家族相册', icon: Image },
  { path: 'branches', label: '分支', title: '分支管理', icon: GitFork },
  { path: 'kinship', label: '关系计算', title: '亲属关系计算', icon: GitCommitHorizontal },
  { path: 'lineage', label: '世系图', title: '完整世系图（苏/欧/宝塔式）', icon: ScrollText },
  { path: 'cousin', label: '旁系', title: '旁系族亲图', icon: Network },
  { path: 'zibei', label: '字辈', title: '字辈诗管理', icon: Sparkles },
  { path: 'history', label: '历史', title: '历史事实索引', icon: History },
  { path: 'honors', label: '功德', title: '功德榜 / 荣誉墙', icon: Award },
  { path: 'memorial', label: '祭日', title: '祭日忌日', icon: Heart },
  { path: 'map', label: '地理', title: '家族地理', icon: MapIcon },
  { path: 'feed', label: '动态', title: '家族动态', icon: MessageSquare },
  { path: 'chat', label: '聊天', title: '家族聊天', icon: Users },
  { path: 'council', label: '理事会', title: '族委会 / 理事会', icon: Award },
  { path: 'temple', label: '家庙', title: '家庙', icon: Landmark },
  { path: 'ocr', label: 'OCR', title: 'AI 智能录入', icon: Sparkles },
  { path: 'stats', label: '数据', title: '数据看板', icon: BarChart3 },
  { path: 'gedcom', label: 'GEDCOM', title: '族谱 GEDCOM 互换', icon: GitCommitHorizontal },
  { path: 'path', label: '关系路径', title: '寻根问祖 · 关系路径', icon: Network },
  { path: 'icons', label: '墨韵', title: '墨水笔触图标', icon: Sparkles },
]

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
        </div>
      </div>

      <div
        className="relative z-10 border-t border-amber-700/20 bg-stone-950/40 px-3 py-2"
        role="navigation"
        aria-label="族谱功能导航"
      >
        <div className="flex flex-wrap items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => onNavigate(`/family/${familyId}/${item.path}`)}
                title={item.title}
                aria-label={item.title}
                className="group inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border border-transparent px-2 text-xs text-amber-200/70 transition-all hover:border-amber-700/40 hover:bg-stone-900/60 hover:text-amber-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/60"
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0 text-amber-500/70 transition-colors group-hover:text-amber-400"
                  aria-hidden="true"
                />
                <span className="font-serif tracking-wide">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
