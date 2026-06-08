/**
 * 富文本安全渲染组件
 * 用于展示成员 bio 等用户提交的 HTML 内容。
 * 信任后端 sanitize_html 输出，仅做基础 DOMPurify 风格的二次防护。
 */
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface RichTextRendererProps {
  html: string
  className?: string
}

// 服务端已做白名单过滤；这里再做一遍去 script/style 防御
function doubleSanitize(html: string): string {
  if (!html) return ''
  // 去除任何剩余 script/style
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

export default function RichTextRenderer({ html, className }: RichTextRendererProps) {
  const clean = useMemo(() => doubleSanitize(html), [html])
  if (!clean) {
    return (
      <p className="text-sm italic text-muted-foreground">暂无生平简介</p>
    )
  }
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none dark:prose-invert',
        'prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-h2:mt-6 prose-h2:text-lg',
        'prose-h3:mt-4 prose-h3:text-base',
        'prose-p:my-2 prose-p:leading-relaxed',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:bg-muted/40 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic',
        'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
        'prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm',
        'prose-hr:my-4 prose-hr:border-border',
        className,
      )}
      // 已被服务端 + 客户端双重清理
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
