import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store'
import { setShowMobileMenu } from '@/store/slices/appSlice'
import { AvatarDisplay } from '@/components/ui'
import {
  Home,
  BarChart3,
  Bell,
  User,
  Menu as MenuIcon,
  TreePine,
  ScrollText,
  Heart,
  Image as ImageIcon,
  Sparkles,
  History,
  Award,
  Map as MapIcon,
  MessageSquare,
  Users,
  Landmark,
  Network,
  BookOpen,
  Calendar,
  GitFork,
  GitCommitHorizontal,
  Settings as SettingsIcon,
  X,
  LogOut,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react'
import { logout } from '@/store/slices/authSlice'
import { cycleTheme, selectTheme, selectIsDark } from '@/store/slices/appSlice'

interface TabItem {
  key: string
  label: string
  icon: LucideIcon
  match: (pathname: string) => boolean
  onClick: () => void
}

interface MoreItem {
  label: string
  icon: LucideIcon
  onClick: () => void
  desc?: string
}

export function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((s) => s.auth)
  const { unreadCount } = useAppSelector((s) => s.app)
  const theme = useAppSelector(selectTheme)
  const isDark = useAppSelector(selectIsDark)

  const [moreOpen, setMoreOpen] = useState(false)

  const familyIdMatch = location.pathname.match(/^\/family\/(\d+)/)
  const familyId = familyIdMatch ? Number(familyIdMatch[1]) : null

  const goHome = () => navigate('/')
  const goStats = () => {
    if (familyId) navigate(`/family/${familyId}/stats`)
    else navigate('/')
  }
  const goProfile = () => navigate('/profile')

  const onFamily = familyId !== null
  const isHome = location.pathname === '/'
  const isStatsActive = !!familyId && location.pathname.endsWith('/stats')
  const isProfile = location.pathname.startsWith('/profile')

  const tabs: TabItem[] = [
    {
      key: 'home',
      label: '族谱',
      icon: Home,
      match: (p) => p === '/' || p.startsWith('/family/'),
      onClick: goHome,
    },
    {
      key: 'data',
      label: '数据',
      icon: BarChart3,
      match: (p) => p.endsWith('/stats'),
      onClick: goStats,
    },
    {
      key: 'bell',
      label: '通知',
      icon: Bell,
      match: (p) => false,
      onClick: () => dispatch(setShowMobileMenu(true)),
    },
    {
      key: 'me',
      label: '我',
      icon: User,
      match: (p) => p.startsWith('/profile'),
      onClick: goProfile,
    },
    {
      key: 'more',
      label: '更多',
      icon: MenuIcon,
      match: (p) => false,
      onClick: () => setMoreOpen(true),
    },
  ]

  const isActive = (t: TabItem) => t.match(location.pathname) && t.key !== 'more'

  const buildMoreItems = (): MoreItem[] => {
    if (!familyId) {
      return [
        { label: '设置', icon: SettingsIcon, onClick: () => navigate('/settings') },
        { label: '帮助', icon: BookOpen, onClick: () => navigate('/help') },
      ]
    }
    const f = (path: string, label: string, icon: LucideIcon, desc: string): MoreItem => ({
      label,
      icon,
      desc,
      onClick: () => {
        setMoreOpen(false)
        navigate(`/family/${familyId}/${path}`)
      },
    })
    return [
      f('intro', '简介', BookOpen, '家族简介'),
      f('events', '大事记', Calendar, '家族大事'),
      f('album', '相册', ImageIcon, '家族影像'),
      f('branches', '分支', GitFork, '分支管理'),
      f('kinship', '关系计算', GitCommitHorizontal, '亲属计算'),
      f('lineage', '世系图', ScrollText, '完整世系图'),
      f('cousin', '旁系图', Network, '旁系族亲'),
      f('zibei', '字辈诗', Sparkles, '字辈诗管理'),
      f('history', '历史', History, '历史事实'),
      f('honors', '功德', Award, '功德榜'),
      f('memorial', '祭日', Heart, '祭日忌日'),
      f('map', '地理', MapIcon, '家族地理'),
      f('feed', '动态', MessageSquare, '家族动态'),
      f('chat', '聊天', Users, '家族聊天'),
      f('council', '理事会', Award, '族委会'),
      f('temple', '家庙', Landmark, '家庙'),
      f('ocr', 'OCR', Sparkles, 'AI 智能录入'),
      f('gedcom', 'GEDCOM', GitCommitHorizontal, '族谱互换'),
      f('path', '关系路径', Network, '寻根问祖'),
      f('icons', '墨韵图标', Sparkles, '墨水笔触'),
    ]
  }

  const moreItems = buildMoreItems()

  return (
    <>
      <nav className="bottom-nav sm:hidden" role="navigation" aria-label="底部导航">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = isActive(t)
          const showBadge = t.key === 'bell' && unreadCount > 0
          return (
            <button
              key={t.key}
              onClick={t.onClick}
              className={`relative flex min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                active
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
              aria-current={active ? 'page' : undefined}
              aria-label={t.label}
            >
              <div className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {showBadge && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white"
                    aria-hidden="true"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="font-serif text-[10px] leading-none">{t.label}</span>
              {active && (
                <span
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-amber-700 dark:bg-amber-300"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </nav>

      {moreOpen && (
        <MoreDrawer
          items={moreItems}
          onClose={() => setMoreOpen(false)}
          isDark={isDark}
          onToggleTheme={() => dispatch(cycleTheme())}
          onLogout={() => {
            dispatch(logout())
            setMoreOpen(false)
            navigate('/login')
          }}
          userName={user?.display_name || user?.username || '用户'}
          userAvatar={user?.avatar || null}
        />
      )}
    </>
  )
}

interface MoreDrawerProps {
  items: MoreItem[]
  onClose: () => void
  isDark: boolean
  onToggleTheme: () => void
  onLogout: () => void
  userName: string
  userAvatar: string | null
}

function MoreDrawer({
  items,
  onClose,
  isDark,
  onToggleTheme,
  onLogout,
  userName,
  userAvatar,
}: MoreDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="sm:hidden" role="dialog" aria-modal="true" aria-label="更多功能">
      <div
        className="drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className="drawer-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-handle" />
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <AvatarDisplay avatar={userAvatar} name={userName} size={32} />
            <div>
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-[11px] text-muted-foreground">更多功能</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted active:scale-90"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scroll-area flex-1 overflow-y-auto px-2 py-2">
          <div className="grid grid-cols-4 gap-1">
            {items.map((it) => {
              const Icon = it.icon
              return (
                <button
                  key={it.label}
                  onClick={it.onClick}
                  className="flex touch-target flex-col items-center justify-center gap-1 rounded-lg p-2 transition-all active:scale-95 hover:bg-muted"
                >
                  <Icon className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                  <span className="text-[11px] leading-none">{it.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-around border-t border-border/40 px-2 py-2 pb-3">
          <button
            onClick={onToggleTheme}
            className="flex touch-target flex-1 items-center justify-center gap-1.5 rounded-lg p-2 text-sm text-muted-foreground hover:bg-muted active:scale-95"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="text-xs">{isDark ? '浅色' : '深色'}</span>
          </button>
          <button
            onClick={onLogout}
            className="flex touch-target flex-1 items-center justify-center gap-1.5 rounded-lg p-2 text-sm text-red-500 hover:bg-red-500/10 active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs">退出登录</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MobileBottomNav
