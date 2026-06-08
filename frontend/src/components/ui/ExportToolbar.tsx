import { useState, useRef } from 'react'
import { Download, Image as ImageIcon, FileCode, Printer, ChevronDown } from 'lucide-react'
import * as htmlToImage from 'html-to-image'
import { useAppDispatch, addToast } from '@/store'

interface ExportToolbarProps {
  /** 要导出的 DOM 节点 ref */
  targetRef: React.RefObject<HTMLElement>
  /** 文件名前缀，例如 "牟氏五服图" */
  filename?: string
  /** 给节点临时注入的背景色，避免透明（默认白色） */
  backgroundColor?: string
  /** 隐藏某些元素的 CSS 选择器（导出时加 display:none） */
  hideOnExport?: string[]
  /** 显示在按钮左侧的小标签 */
  label?: string
  /** 是否紧凑模式（更小按钮） */
  compact?: boolean
}

export function ExportToolbar({
  targetRef,
  filename = 'export',
  backgroundColor = '#ffffff',
  hideOnExport = [],
  label,
  compact = false,
}: ExportToolbarProps) {
  const dispatch = useAppDispatch()
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const exportAs = async (format: 'svg' | 'png' | 'jpeg' | 'print') => {
    const el = targetRef.current
    if (!el) {
      dispatch(addToast({ message: '找不到导出目标', type: 'error' }))
      return
    }

    setOpen(false)
    setBusy(true)

    // 临时隐藏某些元素
    const hidden: { el: HTMLElement; original: string }[] = []
    hideOnExport.forEach((sel) => {
      el.querySelectorAll(sel).forEach((node) => {
        const h = node as HTMLElement
        hidden.push({ el: h, original: h.style.display })
        h.style.display = 'none'
      })
    })

    // 注入白底
    const originalBg = el.style.backgroundColor
    el.style.backgroundColor = backgroundColor

    try {
      const opts = {
        backgroundColor,
        pixelRatio: 2,
        cacheBust: true,
      }

      if (format === 'svg') {
        const dataUrl = await htmlToImage.toSvg(el, opts)
        downloadDataUrl(dataUrl, `${filename}.svg`)
        dispatch(addToast({ message: '已导出 SVG', type: 'success' }))
      } else if (format === 'png') {
        const dataUrl = await htmlToImage.toPng(el, opts)
        downloadDataUrl(dataUrl, `${filename}.png`)
        dispatch(addToast({ message: '已导出 PNG', type: 'success' }))
      } else if (format === 'jpeg') {
        const dataUrl = await htmlToImage.toJpeg(el, { ...opts, quality: 0.92 })
        downloadDataUrl(dataUrl, `${filename}.jpg`)
        dispatch(addToast({ message: '已导出 JPG', type: 'success' }))
      } else if (format === 'print') {
        // 打印：先转 PNG，再打开 window.print
        const dataUrl = await htmlToImage.toPng(el, opts)
        const w = window.open('', '_blank')
        if (w) {
          w.document.write(`
            <!doctype html>
            <html><head><title>${filename} - 打印预览</title>
            <style>
              body { margin: 0; padding: 24px; background: white; font-family: system-ui; }
              img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
              @media print {
                body { padding: 0; }
                @page { margin: 1cm; }
              }
            </style>
            </head><body>
              <img src="${dataUrl}" />
              <script>setTimeout(() => { window.print(); }, 300);</script>
            </body></html>
          `)
          w.document.close()
        }
        dispatch(addToast({ message: '已打开打印预览', type: 'success' }))
      }
    } catch (err: any) {
      dispatch(addToast({ message: `导出失败: ${err.message || err}`, type: 'error' }))
    } finally {
      // 恢复
      hidden.forEach(({ el: h, original }) => { h.style.display = original })
      el.style.backgroundColor = originalBg
      setBusy(false)
    }
  }

  const buttonSize = compact ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-xs'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className={`flex items-center gap-1.5 rounded-lg border border-border/30 bg-foreground/3 ${buttonSize} font-medium text-foreground transition-colors hover:bg-foreground/6 disabled:opacity-50`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {label || '导出'}
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-lg border border-border/30 bg-background/95 shadow-xl backdrop-blur-xl"
            role="menu"
          >
            <button
              onClick={() => exportAs('svg')}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-foreground/5"
              role="menuitem"
            >
              <FileCode className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <div className="flex-1 text-left">
                <div className="font-medium">SVG 矢量</div>
                <div className="text-[10px] text-muted-foreground">可缩放 / 嵌入文档</div>
              </div>
            </button>
            <button
              onClick={() => exportAs('png')}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-foreground/5"
              role="menuitem"
            >
              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <div className="flex-1 text-left">
                <div className="font-medium">PNG 图片</div>
                <div className="text-[10px] text-muted-foreground">2x 高清 / 透明背景</div>
              </div>
            </button>
            <button
              onClick={() => exportAs('jpeg')}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-foreground/5"
              role="menuitem"
            >
              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <div className="flex-1 text-left">
                <div className="font-medium">JPG 图片</div>
                <div className="text-[10px] text-muted-foreground">文件更小</div>
              </div>
            </button>
            <div className="my-1 h-px bg-border/30" />
            <button
              onClick={() => exportAs('print')}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-foreground/5"
              role="menuitem"
            >
              <Printer className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <div className="flex-1 text-left">
                <div className="font-medium">打印</div>
                <div className="text-[10px] text-muted-foreground">另开窗口预览</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
