/**
 * 谱牒设计系统 · 共享原语组件
 * 样式类定义在 src/pedigree.css（全局注册于 main.tsx）。
 * 页面统一使用这些原语，保证全站视觉一致。
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

export const PG_RED = '#A63A2E'
export const PG_SERIF = "'Noto Serif SC', 'STSong', 'KaiTi', 'STKaiti', serif"

const serifStyle: CSSProperties = { fontFamily: PG_SERIF }

/* 阿拉伯年份 → 汉字（刻于牌位底座/牌面） */
const CN_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']
export const cnYear = (y: string | number | null) =>
  String(y ?? '')
    .split('')
    .map((ch) => (/\d/.test(ch) ? CN_DIGITS[Number(ch)] : ch))
    .join('')

/* 位牌墙金饰 defs：漆帽卷草 + 蟠龙柱 + 金色渐变（每页只渲染一次） */
export function TabletDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="pg-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3d489" />
          <stop offset=".45" stopColor="#d9a44e" />
          <stop offset=".75" stopColor="#a4712a" />
          <stop offset="1" stopColor="#e8c46f" />
        </linearGradient>
        <symbol id="pg-crest-orn" viewBox="0 0 132 40">
          <g fill="none" stroke="url(#pg-gold)" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="66" cy="15" r="7.5" />
            <circle cx="66" cy="15" r="2.8" fill="url(#pg-gold)" stroke="none" />
            <path d="M58.5 15a7.5 7.5 0 0 1 7.5-7.5M73.5 15a7.5 7.5 0 0 0-7.5-7.5" />
            <path d="M66 3.5c-3 2-4.5 4.5-4.5 7M66 3.5c3 2 4.5 4.5 4.5 7" />
            <path d="M55 16c-9 3-16-1-16.5-8.5C38.2 3.6 43 2.4 45 5.4c1.8 2.8-.8 6-3.6 5" />
            <path d="M55 22c-10 5-19 2-22-6" />
            <path d="M52 26c-8 6-15 6-20 1.5" />
            <path d="M55 16c-2 6-1.5 10 .5 13" />
            <path d="M77 16c9 3 16-1 16.5-8.5C93.8 3.6 89 2.4 87 5.4c-1.8 2.8.8 6 3.6 5" />
            <path d="M77 22c10 5 19 2 22-6" />
            <path d="M80 26c8 6 15 6 20 1.5" />
            <path d="M77 16c2 6 1.5 10-.5 13" />
            <path d="M35 24c-2.5 4-3 7-2 10M97 24c2.5 4 3 7 2 10" />
          </g>
        </symbol>
        <symbol id="pg-dragon-orn" viewBox="0 0 30 200">
          <g fill="none" stroke="url(#pg-gold)" strokeWidth="2.8" strokeLinecap="round">
            <path d="M15 6c6 1 9 5 8 10-1 4-5 5-7 2.5-1.6-2-.4-4.5 1.8-4.5" />
            <path d="M15 6c-4 0-7 2-8 5" />
            <path d="M17 21C24 34 7 46 14 60c7 14-8 26-1 41 7 15-8 27-1 42 6 13-5 24-2 45" />
            <path d="M20 30c3-1 5-3.5 5.5-6M11 47c-3-1-5-3.5-5.5-6M21 74c3-1 5-3.5 5.5-6M11 92c-3-1-5-3.5-5.5-6M21 118c3-1 5-3.5 5.5-6M11 136c-3-1-5-3.5-5.5-6" />
            <path d="M15 60l7 5M15 100l-7 5M15 140l7 5M15 176l-7 5" />
            <path d="M13 187c-3 3-3 7 0 9 2 1.5 5 .5 5-2 0-2-2-3-3.5-2" />
          </g>
          <g fill="url(#pg-gold)">
            <circle cx="18" cy="26" r="1.3" /><circle cx="12" cy="38" r="1.3" /><circle cx="18" cy="52" r="1.3" />
            <circle cx="11" cy="66" r="1.3" /><circle cx="18" cy="80" r="1.3" /><circle cx="12" cy="94" r="1.3" />
            <circle cx="18" cy="108" r="1.3" /><circle cx="11" cy="122" r="1.3" /><circle cx="18" cy="136" r="1.3" />
            <circle cx="12" cy="150" r="1.3" /><circle cx="17" cy="164" r="1.3" />
          </g>
        </symbol>
      </defs>
    </svg>
  )
}

/** 页头：眉标（朱点+字距）+ 宋体标题 + 副题 + 右侧操作区 */
export function PgPageHead({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="pg-page-head">
        <div>
          {eyebrow && <div className="pg-eyebrow">{eyebrow}</div>}
          <h1 className="pg-title mt-2 text-2xl font-semibold" style={serifStyle}>
            {title}
          </h1>
          {subtitle && <p className="pg-subtitle mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

/** 朱点分段标题 */
export function PgSectionHead({ text, right }: { text: ReactNode; right?: ReactNode }) {
  if (!right) {
    return (
      <div className="pg-section-head">
        <span className="pg-section-title">{text}</span>
        <span aria-hidden="true" className="pg-section-rule" />
      </div>
    )
  }
  return (
    <div className="pg-section-head">
      <span className="pg-section-title">{text}</span>
      <span aria-hidden="true" className="pg-section-rule" />
      <div className="flex flex-shrink-0 items-center gap-2">{right}</div>
    </div>
  )
}

/** 印章（姓名印/字印） */
export function PgSeal({
  char,
  size = 64,
  small = false,
  title,
}: {
  char: ReactNode
  size?: number
  small?: boolean
  title?: string
}) {
  return (
    <span
      title={title}
      aria-hidden={title ? undefined : true}
      className={`pg-seal pg-stamp ${small ? 'pg-seal-sm' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {char}
    </span>
  )
}

/** 版刻藏书行：`<PgColophon items={[['籍贯','河北石家庄'],['世系','三世']]} />` */
export function PgColophon({ items }: { items: Array<[ReactNode, ReactNode]> }) {
  return (
    <div className="pg-colophon">
      {items.map(([label, value], i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && <span aria-hidden="true" className="pg-colophon-sep" />}
          <span>
            {label} <b>{value}</b>
          </span>
        </span>
      ))}
    </div>
  )
}

/* ═══ 香炉：三足铜炉 + 三支香（点击「上香」后缓缓插入，香头火星 + 青烟袅袅）═══
   signal 每自增一次即点燃一次；燃烧约 90 秒后香烬复位，可再续。
   mini=true 时缩小尺寸，用于嵌在每块牌位脚下。 */

const INCENSE_BURN_MS = 90_000

export function PgIncenseBurner({ signal, mini }: { signal: number; mini?: boolean }) {
  const [lit, setLit] = useState(false)
  const burnTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (signal <= 0) return
    setLit(true)
    window.clearTimeout(burnTimer.current)
    burnTimer.current = window.setTimeout(() => setLit(false), INCENSE_BURN_MS)
    return () => window.clearTimeout(burnTimer.current)
  }, [signal])

  const sticks = [
    { rot: '-9deg', d: '0s', h: 54 },
    { rot: '0deg', d: '.55s', h: 62 },
    { rot: '9deg', d: '1.1s', h: 58 },
  ]

  return (
    <div className={mini ? 'pg-burner-sm' : 'pg-burner-zone'}>
      <div className={`pg-burner ${lit ? 'pg-burner-lit' : ''}`} role="img" aria-label="香炉">
        <div className="pg-sticks" aria-hidden="true">
          {lit &&
            sticks.map((s, i) => (
              <span
                key={i}
                className="pg-stick"
                style={{ '--rot': s.rot, '--d': s.d, '--h': `${s.h}px` } as CSSProperties}
              >
                <i className="pg-smoke pg-smoke-2" aria-hidden="true" />
                <i className="pg-smoke pg-smoke-1" aria-hidden="true" />
                <i className="pg-smoke pg-smoke-3" aria-hidden="true" />
              </span>
            ))}
        </div>
        <span className="pg-burner-ear pg-burner-ear-l" aria-hidden="true" />
        <span className="pg-burner-ear pg-burner-ear-r" aria-hidden="true" />
        <div className="pg-burner-bowl">
          <span className="pg-burner-ash" aria-hidden="true" />
        </div>
        <span className="pg-burner-leg pg-burner-leg-l" aria-hidden="true" />
        <span className="pg-burner-leg pg-burner-leg-c" aria-hidden="true" />
        <span className="pg-burner-leg pg-burner-leg-r" aria-hidden="true" />
      </div>
    </div>
  )
}
