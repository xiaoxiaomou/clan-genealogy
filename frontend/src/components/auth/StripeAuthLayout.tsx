import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BorderGlow } from '@/components/ui'
import { TreePine } from 'lucide-react'

interface StripeAuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  leftTagline: string
  leftSubtitle: string
  footerText: string
  footerLinkText: string
  footerLinkTo: string
}

export function StripeAuthLayout({
  children,
  title,
  subtitle,
  leftTagline,
  leftSubtitle,
  footerText,
  footerLinkText,
  footerLinkTo,
}: StripeAuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen">
      {/* 左侧品牌区 - Stripe 风格渐变背景 */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        <div className="stripe-gradient-mesh absolute inset-0" />

        <div className="relative z-10 h-full w-full overflow-hidden pointer-events-none" />

        <div className="relative z-10 px-16 text-center">
          <div className="stripe-brand-logo">
            <TreePine className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-[56px] font-semibold text-white mb-4 leading-[1.07] tracking-[-0.28px]">
            族谱
          </h1>
          <div className="w-16 h-px mx-auto mb-6 bg-white/15" />
          <p className="text-[21px] text-white/70 leading-relaxed tracking-[-0.224px] max-w-[280px] mx-auto">
            {leftTagline}
          </p>
          <p className="mt-4 text-sm text-white/30 leading-relaxed">
            {leftSubtitle}
          </p>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex flex-1 items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-[#0a0a0a]" />

        <BorderGlow
          backgroundColor="transparent"
          className="!bg-transparent border-0 p-0 w-full max-w-md animate-fade-in relative z-10"
        >
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <TreePine className="h-7 w-7 text-white/90" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white mt-4">族谱</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
            <p className="text-sm text-white/40 mt-2">{subtitle}</p>
          </div>

          {children}

          <div className="stripe-divider">{footerText}</div>

          <p className="text-center text-sm">
            <Link to={footerLinkTo} className="stripe-link-accent">
              {footerLinkText} →
            </Link>
          </p>
        </BorderGlow>
      </div>
    </div>
  )
}
