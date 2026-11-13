/**
 * 谱牒设计系统 · 共享原语组件
 * 样式类定义在 src/pedigree.css（全局注册于 main.tsx）。
 * 页面统一使用这些原语，保证全站视觉一致。
 */
import type { CSSProperties, ReactNode } from 'react'

export const PG_RED = '#A63A2E'
export const PG_SERIF = "'Noto Serif SC', 'STSong', 'KaiTi', 'STKaiti', serif"

const serifStyle: CSSProperties = { fontFamily: PG_SERIF }

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
