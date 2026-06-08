import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

const TYPE_STYLES = {
  success: 'bg-[#34c759] text-white shadow-lg shadow-green-500/20',
  error: 'bg-[#ff3b30] text-white shadow-lg shadow-red-500/20',
  info: 'bg-[#0071e3] text-white shadow-lg shadow-blue-500/20',
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className="fixed top-6 right-6 z-[100] animate-slide-in"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl px-5 py-3.5 border border-white/10 backdrop-blur-xl",
          TYPE_STYLES[type]
        )}
      >
        <span className="text-sm font-medium leading-none">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          aria-label="关闭通知"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

// useToast is now in toast-provider.tsx for shared context
