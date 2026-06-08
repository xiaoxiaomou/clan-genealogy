import { useEffect, useCallback } from 'react'

export interface ShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  callback: (e: KeyboardEvent) => void
  preventDefault?: boolean
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const { key, ctrl = false, shift = false, alt = false, meta = false, callback, preventDefault = true } = shortcut
      
      const isCtrlMatch = ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey
      const isShiftMatch = shift ? e.shiftKey : !e.shiftKey
      const isAltMatch = alt ? e.altKey : !e.altKey
      const isMetaMatch = meta ? e.metaKey : true
      
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        isCtrlMatch &&
        isShiftMatch &&
        isAltMatch &&
        isMetaMatch
      ) {
        if (preventDefault) {
          e.preventDefault()
        }
        callback(e)
        break
      }
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
