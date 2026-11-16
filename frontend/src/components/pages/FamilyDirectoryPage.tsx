import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Family } from '@/types'
import { PgPageHead, PgSectionHead, PG_RED } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import {
  BookOpen,
  Calendar,
  Image,
  GitFork,
  GitCommitHorizontal,
  GitCommitVertical,
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
  Upload,
  ChevronRight,
  ListTree,
  Workflow,
  PieChart,
  Hourglass,
  CalendarClock,
  Box,
  CalendarDays,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>

/* ═══════════════════════════════════════════════════════
   谱册 · 目次 —— 家族功能目录页
   原族谱页头的 21 个导航链接收拢于此，按卷章分目。
   卡片：朱印图标位 + 名讳 + 一句释文，悬停描红。
   ═══════════════════════════════════════════════════════ */

interface NavItem {
  path: string
  label: string
  desc: string
  icon: LucideIcon
  /** 附加查询参数（如谱图视图 ?view=fan） */
  query?: string
}

interface NavSection {
  no: string
  title: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    no: '卷一',
    title: '谱 书 卷 章',
    items: [
      { path: 'intro', label: '简介', desc: '家族简介 · 谱书卷首', icon: BookOpen },
      { path: 'history', label: '历史', desc: '历史事实索引', icon: History },
      { path: 'events', label: '大事记', desc: '家族大事', icon: Calendar },
      { path: 'honors', label: '功德', desc: '功德榜 / 荣誉墙', icon: Award },
      { path: 'zibei', label: '字辈', desc: '字辈诗管理', icon: Sparkles },
    ],
  },
  {
    no: '卷二',
    title: '谱 图 诸 式',
    items: [
      { path: '', query: 'tree', label: '树形图', desc: '夫妻合牌 · 层叠展谱', icon: ListTree },
      { path: '', query: 'graph', label: '交互图', desc: '可拖拽 · 高亮溯源', icon: Workflow },
      { path: '', query: 'fan', label: '扇形图', desc: '环形放射观世代', icon: PieChart },
      { path: '', query: 'hanging', label: '吊线图', desc: '一线垂训 · 竖列世系', icon: GitCommitVertical },
      { path: '', query: 'hourglass', label: '沙漏图', desc: '双向沙漏 · 上下世代', icon: Hourglass },
      { path: '', query: 'timeline', label: '时间线', desc: '按年代纵览族人', icon: CalendarClock },
      { path: '', query: '3d', label: '3D视图', desc: '立体族谱空间', icon: Box },
    ],
  },
  {
    no: '卷三',
    title: '谱 系 图 表',
    items: [
      { path: 'lineage', label: '世系图', desc: '完整世系图（苏/欧/宝塔式）', icon: ScrollText },
      { path: 'cousin', label: '旁系', desc: '旁系族亲图', icon: Network },
      { path: 'kinship', label: '关系计算', desc: '亲属关系计算', icon: GitCommitHorizontal },
      { path: 'path', label: '关系路径', desc: '寻根问祖 · 关系路径', icon: Network },
      { path: 'branches', label: '分支', desc: '分支管理', icon: GitFork },
    ],
  },
  {
    no: '卷四',
    title: '祠 堂 联 谊',
    items: [
      { path: 'feed', label: '动态', desc: '家族动态', icon: MessageSquare },
      { path: 'chat', label: '聊天', desc: '家族聊天', icon: Users },
      { path: 'council', label: '理事会', desc: '族委会 / 理事会', icon: Award },
      { path: 'temple', label: '家庙', desc: '家庙', icon: Landmark },
      { path: 'memorial', label: '祭日', desc: '祭日忌日', icon: Heart },
      { path: 'activities', label: '家族活动', desc: '祭祖颁谱聚会报名', icon: CalendarDays },
    ],
  },
  {
    no: '卷五',
    title: '影 像 地 理',
    items: [
      { path: 'album', label: '相册', desc: '家族相册', icon: Image },
      { path: 'map', label: '地理', desc: '家族地理', icon: MapIcon },
      { path: 'icons', label: '墨韵', desc: '墨水笔触图标', icon: Sparkles },
    ],
  },
  {
    no: '卷六',
    title: '录 入 导 出',
    items: [
      { path: 'batch', label: '批量导入', desc: 'Excel / CSV 成员导入', icon: Upload },
      { path: 'ocr', label: 'OCR', desc: 'AI 智能录入', icon: Sparkles },
      { path: 'gedcom', label: 'GEDCOM', desc: '族谱数据互换', icon: GitCommitHorizontal },
      { path: 'stats', label: '数据', desc: '数据看板', icon: BarChart3 },
    ],
  },
]

export default function FamilyDirectoryPage() {
  const { id } = useParams<{ id: string }>()
  const familyId = Number(id)
  const navigate = useNavigate()
  const [family, setFamily] = useState<Family | null>(null)

  useEffect(() => {
    if (!familyId) return
    api
      .getFamily(familyId)
      .then((data: any) => setFamily(data?.family || null))
      .catch(() => setFamily(null))
  }, [familyId])

  return (
    <Layout>
      <div className="pg-rise mx-auto max-w-5xl px-4 py-8">
        <PgPageHead
          eyebrow="谱 册 · 目 次"
          title="功能目录"
          subtitle={`${family?.name || '本家族'}全部功能，按卷章分目，随取随用`}
        />

        {SECTIONS.map((section) => (
          <section key={section.no} className="mb-9">
            <PgSectionHead
              text={
                <span className="flex items-center gap-3">
                  <span
                    className="rounded border px-1.5 py-0.5 font-serif text-xs"
                    style={{ borderColor: 'color-mix(in srgb, ' + PG_RED + ' 45%, transparent)', color: PG_RED }}
                  >
                    {section.no}
                  </span>
                  {section.title}
                </span>
              }
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={`${item.path}-${item.query ?? ''}`}
                    onClick={() =>
                      navigate(
                        item.query
                          ? `/family/${familyId}?view=${item.query}`
                          : `/family/${familyId}/${item.path}`,
                      )
                    }
                    title={item.desc}
                    aria-label={item.label}
                    className="pg-card group flex items-center gap-3 p-4 text-left transition-all hover:-translate-y-0.5"
                  >
                    <span
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: 'rgba(166, 58, 46, 0.12)', color: PG_RED }}
                      aria-hidden="true"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.label}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {item.desc}
                      </span>
                    </span>
                    <ChevronRight
                      className="ml-auto h-4 w-4 flex-shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                      style={{ color: PG_RED }}
                      aria-hidden="true"
                    />
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        <div className="pg-colophon mt-2">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded font-serif text-[13px] text-white"
            style={{ backgroundColor: PG_RED }}
            aria-hidden="true"
          >
            {family?.surname?.charAt(0) || '谱'}
          </span>
          <span className="ml-2">
            <b>{family?.name || '家族'}</b> 目次毕
          </span>
          <span aria-hidden="true" className="pg-colophon-sep" />
          <span>按卷取用 · 敬宗睦族</span>
        </div>
      </div>
    </Layout>
  )
}
