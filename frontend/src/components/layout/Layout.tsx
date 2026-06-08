import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAppSelector, useAppDispatch } from '@/store'
import {
  setUnreadCount,
  setNotifications,
  setShowNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  setShowMobileMenu,
  addToast,
  cycleTheme,
  setTheme,
  selectTheme,
  selectIsDark,
} from '@/store/slices/appSlice'
import { logout } from '@/store/slices/authSlice'
import { AvatarDisplay, CommandPalette, LanguageSwitcher, SkipLink, AIAssistantPanel } from '@/components/ui'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import { FamilySwitcher } from '@/components/layout/FamilySwitcher'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { ShortcutHelp } from '@/hooks/ShortcutHelp'
import { TreePine, LogOut, Home, Bell, Sun, Moon, Menu, X, Search, Keyboard } from 'lucide-react'
import type { ThemeMode } from '@/store/slices/appSlice'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const theme = useAppSelector(selectTheme)
  const isDark = useAppSelector(selectIsDark)
  const { unreadCount, notifications, showNotifications, showMobileMenu } = useAppSelector(
    (state) => state.app
  )
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useGlobalShortcuts({
    onOpenPalette: () => setPaletteOpen((v) => !v),
    onOpenHelp: () => setHelpOpen(true),
    onGotoHome: () => navigate('/'),
    onGotoMyFamilies: () => navigate('/'),
    onGotoProfile: () => navigate('/profile'),
    onGotoNotifications: () => handleShowNotifications(),
    onEscape: () => {
      setPaletteOpen(false)
      setHelpOpen(false)
      if (showNotifications) dispatch(setShowNotifications(false))
      if (showMobileMenu) dispatch(setShowMobileMenu(false))
    },
    onCycleTheme: () => {
      dispatch(cycleTheme())
      const next: Record<ThemeMode, string> = { light: '浅色', dark: '深色', ink: '水墨', auto: '自动' }
      dispatch(addToast({ message: `已切换主题 · ${next[theme]}`, type: 'success' }))
    },
  })

  useEffect(() => {
    // 主题应用由 slice 完成；此处只保留兼容
  }, [theme])

  useEffect(() => {
    document.body.style.overflow = showMobileMenu ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [showMobileMenu])

  useEffect(() => {
    loadUnreadCount()
  }, [])

  const loadUnreadCount = async () => {
    try {
      const data = await api.getUnreadCount()
      dispatch(setUnreadCount(data.count))
    } catch {
      // ignore
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const handleShowNotifications = async () => {
    try {
      const data = await api.getNotifications()
      dispatch(setNotifications(data.notifications))
      dispatch(setShowNotifications(true))
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '加载失败', type: 'error' }))
    }
  }

  const handleMarkRead = async (notificationId: number) => {
    try {
      await api.markNotificationRead(notificationId)
      dispatch(markNotificationRead(notificationId))
      loadUnreadCount()
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '操作失败', type: 'error' }))
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      dispatch(markAllNotificationsRead())
      loadUnreadCount()
      dispatch(addToast({ message: '已全部标记为已读', type: 'success' }))
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '操作失败', type: 'error' }))
    }
  }

  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen bg-background">
      <SkipLink />
      {/* 顶部导航 - 毛玻璃效果 */}
      <header className="sticky top-0 z-50 glass-nav text-foreground border-b border-border/20" role="banner">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 transition-opacity hover:opacity-80 active:opacity-60"
              aria-label="返回首页"
            >
              <TreePine className="h-5 w-5 text-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-wide text-foreground">族谱</span>
            </button>
            <nav className="hidden items-center gap-1 sm:flex" aria-label="主导航">
              <button
                onClick={() => navigate('/')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all ${
                  isHome
                    ? 'text-foreground font-medium underline underline-offset-4 decoration-2'
                    : 'text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4'
                }`}
                aria-current={isHome ? 'page' : undefined}
              >
                <Home className="h-3.5 w-3.5" aria-hidden="true" />
                我的族谱
              </button>
            </nav>
          </div>

          <button
            className="sm:hidden p-2 text-white/70 hover:text-white transition-colors active:scale-95"
            onClick={() => dispatch(setShowMobileMenu(true))}
            aria-label="打开菜单"
            aria-expanded={showMobileMenu}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden items-center gap-0.5 sm:flex" role="toolbar" aria-label="用户操作">
            <FamilySwitcher />
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex h-8 items-center gap-2 rounded-lg border border-border/40 bg-foreground/3 px-2.5 text-xs text-muted-foreground transition-all hover:border-border/60 hover:bg-foreground/6 hover:text-foreground active:scale-95"
              aria-label="打开命令面板 (Ctrl+K)"
              title="搜索 / 命令 (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span>搜索</span>
              <kbd className="ml-1 rounded border border-border/40 bg-background px-1 py-0 font-mono text-[9px]">⌘K</kbd>
            </button>
            <button
              onClick={() => setHelpOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/6 transition-all active:scale-90"
              aria-label="查看快捷键帮助"
              title="快捷键 (?)"
            >
              <Keyboard className="h-4 w-4" aria-hidden="true" />
            </button>
            <ThemeSwitcher compact />
            <button
              onClick={() => dispatch(cycleTheme())}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/6 transition-all active:scale-90"
              aria-label="循环切换主题"
            >
              {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </button>
            <div className="relative">
              <button
                onClick={handleShowNotifications}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/6 transition-all active:scale-90"
                aria-label={`通知${unreadCount > 0 ? `，${unreadCount} 条未读` : ''}`}
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
              </button>
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white animate-scale-in" aria-hidden="true">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-foreground/6 transition-all mr-0.5"
              aria-label="个人设置"
            >
              <AvatarDisplay
                avatar={user?.avatar || null}
                name={user?.display_name || user?.username || '用户'}
                size={26}
              />
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                {user?.display_name || user?.username || '用户'}
              </span>
            </button>
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all active:scale-90"
              aria-label="退出登录"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* 通知弹窗 - Apple 玻璃效果 */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16"
          role="dialog"
          aria-modal="true"
          aria-label="通知"
        >
          <div className="fixed inset-0 bg-foreground/10 backdrop-blur-sm" onClick={() => dispatch(setShowNotifications(false))} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-md glass-card p-4 animate-scale-in">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white" id="notifications-title">通知</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-[#0071e3] hover:text-[#0077ed] transition-colors font-medium"
                >
                  全部已读
                </button>
              )}
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto" role="list" aria-label="通知列表">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">暂无通知</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    role="listitem"
                    className={`rounded-xl px-4 py-3 transition-all ${
                      notif.is_read
                        ? 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5'
                        : 'bg-[#0071e3]/8 dark:bg-[#0071e3]/12 border border-[#0071e3]/10'
                    }`}
                    onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        !notif.is_read && handleMarkRead(notif.id)
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${notif.is_read ? 'text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-white'}`}>{notif.title}</p>
                      {!notif.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0071e3]" aria-label="未读" />
                      )}
                    </div>
                    {notif.content && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{notif.content}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(notif.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => dispatch(setShowNotifications(false))}
              className="mt-4 w-full rounded-xl py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 移动端菜单 - Apple 侧滑 */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-50 sm:hidden animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="移动导航菜单"
        >
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => dispatch(setShowMobileMenu(false))}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 w-72 bg-white/90 dark:bg-black/90 backdrop-blur-2xl shadow-2xl animate-slide-in-right border-l border-white/5">
            <div className="flex h-12 items-center justify-between px-5 border-b border-gray-100/50 dark:border-white/5">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">菜单</span>
              <button
                onClick={() => dispatch(setShowMobileMenu(false))}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-90"
                aria-label="关闭菜单"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-4 space-y-1" aria-label="移动导航">
              <button
                onClick={() => {
                  navigate('/')
                  dispatch(setShowMobileMenu(false))
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${
                  isHome
                    ? 'text-[#0071e3] font-medium bg-[#0071e3]/8 dark:bg-[#0071e3]/12'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                aria-current={isHome ? 'page' : undefined}
              >
                <Home className="h-5 w-5" aria-hidden="true" />
                我的族谱
              </button>
              <button
                onClick={() => {
                  navigate('/profile')
                  dispatch(setShowMobileMenu(false))
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-200 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                <AvatarDisplay
                  avatar={user?.avatar || null}
                  name={user?.display_name || user?.username || '用户'}
                  size={32}
                />
                个人设置
              </button>
              <button
                onClick={() => dispatch(toggleTheme())}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-700 dark:text-gray-200 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              >
                {isDark ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
                {isDark ? '切换到浅色模式' : '切换到深色模式'}
              </button>
              <div className="my-2 h-px bg-gray-100/50 dark:bg-white/5" />
              <button
                onClick={() => {
                  handleLogout()
                  dispatch(setShowMobileMenu(false))
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                退出登录
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main id="main-content" role="main">{children}</main>

      {/* 手机端底栏 Tab Bar */}
      <MobileBottomNav />

      {/* 全局命令面板 (Ctrl+K) */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* 快捷键帮助 (?) */}
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* AI 助手浮动按钮 */}
      <AIAssistantPanel />
    </div>
  )
}
