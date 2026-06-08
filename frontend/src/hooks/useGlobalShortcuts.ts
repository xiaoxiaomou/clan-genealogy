import { useEffect, useState } from 'react'

export interface ShortcutDef {
  id: string
  combo: string
  description: string
  group: string
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: 'palette', combo: 'Ctrl+K / ⌘K', description: '打开命令面板', group: '全局' },
  { id: 'search-slash', combo: '/', description: '聚焦搜索', group: '全局' },
  { id: 'help', combo: '?', description: '显示快捷键帮助', group: '全局' },
  { id: 'escape', combo: 'Esc', description: '关闭弹窗 / 取消', group: '全局' },
  { id: 'g-h', combo: 'g h', description: '回到首页', group: '导航' },
  { id: 'g-m', combo: 'g m', description: '我的家族', group: '导航' },
  { id: 'g-p', combo: 'g p', description: '个人设置', group: '导航' },
  { id: 'g-n', combo: 'g n', description: '打开通知', group: '导航' },
  { id: 'j', combo: 'j', description: '下一个条目', group: '列表' },
  { id: 'k', combo: 'k', description: '上一个条目', group: '列表' },
  { id: 'o', combo: 'o / Enter', description: '打开选中条目', group: '列表' },
  { id: 'n', combo: 'n', description: '新建（成员/帖子/事件）', group: '操作' },
  { id: 'e', combo: 'e', description: '编辑当前条目', group: '操作' },
  { id: 'cycle-theme', combo: 't t', description: '切换主题（明/暗/水墨）', group: '外观' },
]

function isEditableTarget(t: EventTarget | null): boolean {
  if (!t || !(t instanceof HTMLElement)) return false
  const tag = t.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (t.isContentEditable) return true
  return false
}

export function useGlobalShortcuts(opts: {
  onOpenPalette: () => void
  onOpenHelp: () => void
  onGotoHome: () => void
  onGotoProfile: () => void
  onGotoNotifications: () => void
  onGotoMyFamilies: () => void
  onEscape: () => void
  onCycleTheme: () => void
}) {
  const [gPressed, setGPressed] = useState<number>(0)
  const [tPressed, setTPressed] = useState<number>(0)

  useEffect(() => {
    let gTimer: number | undefined
    let tTimer: number | undefined

    const handler = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return
      if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return

      const mod = e.ctrlKey || e.metaKey
      const inEditable = isEditableTarget(e.target)

      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        opts.onOpenPalette()
        return
      }
      if (mod && e.key === '/') {
        e.preventDefault()
        opts.onOpenPalette()
        return
      }
      if (e.key === 'Escape') {
        opts.onEscape()
        return
      }

      if (inEditable) return

      if (e.key === '?') {
        e.preventDefault()
        opts.onOpenHelp()
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        opts.onOpenPalette()
        return
      }

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault()
        setGPressed(Date.now())
        if (gTimer) window.clearTimeout(gTimer)
        gTimer = window.setTimeout(() => setGPressed(0), 800)
        return
      }
      if (gPressed && Date.now() - gPressed < 800) {
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault()
          setGPressed(0)
          opts.onGotoHome()
          return
        }
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault()
          setGPressed(0)
          opts.onGotoMyFamilies()
          return
        }
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault()
          setGPressed(0)
          opts.onGotoProfile()
          return
        }
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault()
          setGPressed(0)
          opts.onGotoNotifications()
          return
        }
        setGPressed(0)
      }

      if (e.key === 't' || e.key === 'T') {
        if (tPressed && Date.now() - tPressed < 600) {
          e.preventDefault()
          setTPressed(0)
          opts.onCycleTheme()
          return
        }
        e.preventDefault()
        setTPressed(Date.now())
        if (tTimer) window.clearTimeout(tTimer)
        tTimer = window.setTimeout(() => setTPressed(0), 600)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (gTimer) window.clearTimeout(gTimer)
      if (tTimer) window.clearTimeout(tTimer)
    }
  }, [opts, gPressed, tPressed])
}
