import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { InkWashBackground } from '@/components/ui/InkWashBackground'

interface AncientAuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  footerText: string
  footerLinkText: string
  footerLinkTo: string
}

export function AncientAuthLayout({
  children,
  title,
  subtitle,
  footerText,
  footerLinkText,
  footerLinkTo,
}: AncientAuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <InkWashBackground />
      <div className="fixed inset-0 pointer-events-none z-[1] bg-gradient-to-b from-[#f5e6c8]/40 via-[#e0d0b8]/25 to-[#c4b08a]/40" aria-hidden="true" />

      <div className="relative z-[2] flex min-h-screen">
        {/* 左侧装饰区 - 书画装裱概念 */}
        <div className="hidden lg:flex" aria-hidden="true">
          {/* 装裱边条 - 绫绢质感 */}
          <div className="w-[28px] bg-gradient-to-b from-[#c4b08a] via-[#d8c8ae] to-[#c4b08a] dark:from-[rgba(160,140,110,0.3)] dark:via-[rgba(180,160,135,0.25)] dark:to-[rgba(160,140,110,0.3)]" />

          {/* 画心区域 - 透出水墨背景 */}
          <div className="w-[35vw] max-w-[420px] relative select-none">
            {/* 题跋 - 竖排诗文 */}
            <div
              className="absolute right-[15%] top-[18%] text-[14px] leading-[2.4] tracking-[10px] text-[rgba(80,70,58,0.20)] dark:text-[rgba(160,140,110,0.18)]"
              style={{ writingMode: 'vertical-rl' }}
            >
              草木有本心 · 家族源流长
            </div>

            {/* 收藏印 - 朱红方章 */}
            <div className="absolute bottom-[22%] right-[20%] w-[32px] h-[32px] border-[1.5px] border-[rgba(196,58,49,0.25)] dark:border-[rgba(196,58,49,0.15)] rounded-[3px] flex items-center justify-center" style={{ transform: 'rotate(-6deg)' }}>
              <span className="text-[8px] text-[rgba(196,58,49,0.25)] dark:text-[rgba(196,58,49,0.15)] font-serif leading-none">族</span>
            </div>

            {/* 骑缝印 - 小圆章 */}
            <div className="absolute top-[35%] -right-[10px] w-[16px] h-[16px] rounded-full border border-[rgba(196,58,49,0.15)] dark:border-[rgba(196,58,49,0.10)]" />
          </div>
        </div>

        {/* 右侧表单区 */}
        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm">
            {/* 品牌标题 */}
            <div className="text-center mb-8">
              <h1 className="font-serif text-[28px] text-[#3a3228] tracking-[12px] dark:text-[#e0d0b8]">
                族谱
              </h1>
              <div className="mt-2 h-px bg-gradient-to-r from-transparent via-[#c4b08a] to-transparent" />
              <h2 className="mt-4 font-serif text-[18px] text-[#5a4a3a] tracking-[6px] dark:text-[#c4b08a]">
                {title}
              </h2>
              <p className="mt-2 text-[13px] text-[#8b7d6b] tracking-[2px] dark:text-[#a09070]">
                {subtitle}
              </p>
            </div>

            {/* 表单卡片 */}
            <div className="rounded-sm border border-[rgba(200,185,160,0.4)] bg-[rgba(245,235,215,0.90)] px-8 py-10 shadow-[0_8px_32px_rgba(60,50,40,0.10)] backdrop-blur-sm dark:border-[rgba(160,140,110,0.25)] dark:bg-[rgba(40,35,30,0.90)]">
              {/* 顶部装饰线 */}
              <div className="mb-6 h-[2px] bg-gradient-to-r from-transparent via-[#8b7d6b] to-transparent opacity-50 dark:via-[rgba(160,140,110,0.4)]" />

              {children}

              {/* 底部装饰线 */}
              <div className="mt-6 h-[2px] bg-gradient-to-r from-transparent via-[#8b7d6b] to-transparent opacity-50 dark:via-[rgba(160,140,110,0.4)]" />
            </div>

            {/* 底部链接 */}
            {footerText || (footerLinkText && footerLinkTo) ? (
              <div className="mt-6 text-center">
                {footerText && (
                  <span className="text-[12px] text-[#a09070] tracking-[1px] dark:text-[#8b7d6b]">
                    {footerText}
                  </span>
                )}
                {footerLinkText && footerLinkTo && (
                  <Link
                    to={footerLinkTo}
                    className="ml-2 text-[12px] text-[#5a4a3a] tracking-[1px] underline underline-offset-4 decoration-[rgba(90,74,58,0.3)] transition-all duration-300 hover:text-[#c43a31] hover:decoration-[#c43a31] dark:text-[#c4b08a] dark:decoration-[rgba(196,176,138,0.3)] dark:hover:text-[#e8c84a] dark:hover:decoration-[#e8c84a]"
                  >
                    {footerLinkText} →
                  </Link>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
